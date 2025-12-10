import crypto from 'crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { MidiParser } from '../midi_parser';

type MidiDoc = {
    _id: ObjectId;
    midifile?: {
        hash?: string | null;
        fileName?: string[];
    };
    musicLLM?: IMusicLLM_softsearch_result | null;
    musicbrainz?: IMusicbrainzResponse | null;
    redacted?: IMidiFileRedacted | null;
    validationState?: string;
};

const skipTypes = new Set([
    'text',
    'copyrightNotice',
    'trackName',
    'instrumentName',
    'lyrics',
    'marker',
    'cuePoint',
]);

function bufferFromStored(data: string | ArrayBuffer | undefined): Buffer | null {
    if (!data) return null;
    if (typeof data === 'string') return Buffer.from(data, 'base64');
    if (data instanceof ArrayBuffer) return Buffer.from(data);
    return null;
}

function sanitizeEvent(ev: any) {
    const clean: Record<string, unknown> = {
        type: ev.type,
        deltaTime: ev.deltaTime ?? 0,
    };

    for (const [key, value] of Object.entries(ev)) {
        if (key === 'text' || key === 'deltaTime' || key === 'type') continue;
        if (value instanceof Uint8Array) {
            clean[key] = Buffer.from(value).toString('hex');
            continue;
        }
        if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
            clean[key] = value;
        }
    }
    return clean;
}

function normalizeTrack(track: any[]): any[] {
    const normalized: any[] = [];
    let carryDelta = 0;

    for (const ev of track) {
        const delta = (ev?.deltaTime ?? 0) + carryDelta;
        if (!ev?.type || skipTypes.has(ev.type) || ev.text) {
            carryDelta = delta;
            continue;
        }
        const clean = sanitizeEvent(ev);
        clean.deltaTime = delta;
        normalized.push(clean);
        carryDelta = 0;
    }
    return normalized;
}

function hashMidiContent(buffer: Buffer): string {
    const parser = new MidiParser(new Uint8Array(buffer));
    const normalizedTracks = parser.tracks.map((track) => normalizeTrack(track));
    const canonical = JSON.stringify({
        header: parser.header,
        tracks: normalizedTracks,
    });
    return crypto.createHash('sha256').update(canonical).digest('hex');
}

function mergeStringFields<T extends Record<string, any>>(target: T | null | undefined, source: T | null | undefined): T | null | undefined {
    if (!source) return target;
    if (!target) return source;
    const merged: any = { ...target };
    for (const [k, v] of Object.entries(source)) {
        if (merged[k] === undefined || merged[k] === null || merged[k] === '') {
            merged[k] = v;
        }
    }
    return merged;
}

function betterMusicbrainz(target: IMusicbrainzResponse | null | undefined, source: IMusicbrainzResponse | null | undefined): IMusicbrainzResponse | null | undefined {
    if (!source) return target;
    if (!target) return source;

    const targetTop = target.top || [];
    const sourceTop = source.top || [];
    const useSourceTop = sourceTop.length > targetTop.length;

    return {
        top: useSourceTop ? sourceTop : targetTop,
        oldest: target.oldest || source.oldest || null,
    };
}

function scoreDoc(doc: MidiDoc): number {
    let score = 0;
    if (doc.validationState === 'reviewed') score += 3;
    if (doc.redacted) score += 3;
    if (doc.musicbrainz?.top && doc.musicbrainz.top.length) score += 2;
    if (doc.musicLLM) score += 2;
    if (doc.midifile?.fileName?.length) score += 0.01 * doc.midifile.fileName.length;
    return score;
}

async function mergeDuplicates(contentHash: string, docs: MidiDoc[], collection: any) {
    if (docs.length < 2) return;
    const sorted = [...docs].sort((a, b) => scoreDoc(b) - scoreDoc(a));
    const primary = sorted[0];
    const toMerge = sorted.slice(1);

    let midifile = primary.midifile ? { ...primary.midifile } : undefined;
    const fileNames = new Set<string>(midifile?.fileName || []);

    for (const doc of toMerge) {
        (doc.midifile?.fileName || []).forEach((n) => fileNames.add(n));
    }
    if (midifile) {
        midifile.fileName = Array.from(fileNames);
    }

    const musicLLM = toMerge.reduce(
        (acc, doc) => mergeStringFields(acc, doc.musicLLM),
        primary.musicLLM || null
    ) || undefined;

    const redacted = toMerge.reduce(
        (acc, doc) => mergeStringFields(acc, doc.redacted),
        primary.redacted || null
    ) || undefined;

    const musicbrainz = toMerge.reduce(
        (acc, doc) => betterMusicbrainz(acc, doc.musicbrainz),
        primary.musicbrainz || null
    ) || undefined;

    const validationState = [primary, ...toMerge].some((d) => d.validationState === 'reviewed')
        ? 'reviewed'
        : primary.validationState || 'open';

    await collection.updateOne(
        { _id: primary._id },
        {
            $set: {
                midifile,
                musicLLM: musicLLM ?? null,
                musicbrainz: musicbrainz ?? null,
                redacted: redacted ?? null,
                validationState,
            },
        }
    );

    const deleteIds = toMerge.map((d) => d._id);
    await collection.deleteMany({ _id: { $in: deleteIds } });

    console.log(
        `Content-Hash ${contentHash}: Zusammengeführt -> behalten ${primary._id.toHexString()}, gelöscht ${deleteIds.length}`
    );
}

async function main() {
    const args = new Set(process.argv.slice(2));
    const doMerge = args.has('--merge');
    const dryRun = args.has('--dry-run');

    const urlRaw = process.env.MONGO_URL || 'mongodb://localhost:27017';
    const url = urlRaw.startsWith('mongodb://') ? urlRaw : `mongodb://${urlRaw}`;
    const dbName = process.env.MONGO_DB_NAME || 'mididb';
    const collectionName = process.env.MONGO_DB_COLLECTION || 'midifiles';

    const client = new MongoClient(url);
    await client.connect();
    const collection = client.db(dbName).collection<MidiDoc>(collectionName);

    const groups = new Map<string, MidiDoc[]>();
    let processed = 0;
    let failed = 0;
    let skippedNonMidi = 0;

    const cursor = collection.find({}, { projection: { midifile: 1, musicLLM: 1, musicbrainz: 1, redacted: 1, validationState: 1 } });
    for await (const doc of cursor) {
        processed++;
        const buf = bufferFromStored((doc as any)?.midifile?.data);
        if (!buf) {
            failed++;
            continue;
        }
        try {
            const contentHash = hashMidiContent(buf);
            const arr = groups.get(contentHash) || [];
            // Bewusst nur die benötigten Felder ablegen, um Speicher zu sparen
            const leanDoc: MidiDoc = {
                _id: doc._id,
                midifile: {
                    hash: doc.midifile?.hash || null,
                    fileName: doc.midifile?.fileName || [],
                },
                musicLLM: doc.musicLLM ?? null,
                musicbrainz: doc.musicbrainz ?? null,
                redacted: doc.redacted ?? null,
                validationState: doc.validationState,
            };
            arr.push(leanDoc);
            groups.set(contentHash, arr);
        } catch (err) {
            failed++;
            if ((err as Error)?.message?.includes("Bad MIDI file")) {
                skippedNonMidi++;
            }
            console.error('Fehler beim Hashen, _id:', doc?._id, err);
        }
    }

    await client.close();

    const duplicateGroups = [...groups.entries()].filter(([, arr]) => arr.length > 1);
    const duplicateDocs = duplicateGroups.reduce((sum, [, arr]) => sum + (arr.length - 1), 0);

    console.log('Verarbeitet:', processed);
    console.log('Fehlgeschlagen:', failed);
    if (skippedNonMidi > 0) {
        console.log('Davon übersprungen (kein gültiges MIDI):', skippedNonMidi);
    }
    console.log('Eindeutige Content-Hashes:', groups.size);
    console.log('Duplikat-Gruppen (gleicher Content-Hash):', duplicateGroups.length);
    console.log('Duplikate gesamt (zusätzliche Dokumente):', duplicateDocs);

    if (duplicateGroups.length > 0) {
        console.log('\nTop 10 Duplikat-Hashes:');
        duplicateGroups
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 10)
            .forEach(([hash, arr], idx) => {
                console.log(`#${idx + 1}: ${hash} -> ${arr.length} Dateien`);
            });
    }

    if (doMerge) {
        console.log('\nStarte Merge gleichartiger Content-Hashes...');
        // reconnect for writes
        const clientMerge = new MongoClient(url);
        await clientMerge.connect();
        const coll = clientMerge.db(dbName).collection(collectionName);

        for (const [contentHash, docs] of duplicateGroups) {
            if (dryRun) {
                console.log(`Dry-run: würde ${docs.length - 1} Duplikate für Hash ${contentHash} zusammenführen/löschen.`);
                continue;
            }
            await mergeDuplicates(contentHash, docs, coll);
        }
        await clientMerge.close();
        console.log('Merge abgeschlossen.');
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
