import crypto from 'crypto';
import { MongoClient } from 'mongodb';
import { MidiParser } from '../midi_parser';

type MidiDoc = {
    _id?: unknown;
    midifile?: {
        data?: string | ArrayBuffer;
        hash?: string | null;
        fileName?: string[];
    };
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

async function main() {
    const urlRaw = process.env.MONGO_URL || 'mongodb://localhost:27017';
    const url = urlRaw.startsWith('mongodb://') ? urlRaw : `mongodb://${urlRaw}`;
    const dbName = process.env.MONGO_DB_NAME || 'mididb';
    const collectionName = process.env.MONGO_DB_COLLECTION || 'midifiles';

    const client = new MongoClient(url);
    await client.connect();
    const collection = client.db(dbName).collection<MidiDoc>(collectionName);

    const counts = new Map<string, number>();
    let processed = 0;
    let failed = 0;

    const cursor = collection.find({}, { projection: { midifile: 1 } });
    for await (const doc of cursor) {
        processed++;
        const buf = bufferFromStored(doc?.midifile?.data);
        if (!buf) {
            failed++;
            continue;
        }
        try {
            const contentHash = hashMidiContent(buf);
            counts.set(contentHash, (counts.get(contentHash) || 0) + 1);
        } catch (err) {
            failed++;
            console.error('Fehler beim Hashen, _id:', doc?._id, err);
        }
    }

    await client.close();

    const duplicateGroups = [...counts.entries()].filter(([, count]) => count > 1);
    const duplicateDocs = duplicateGroups.reduce((sum, [, count]) => sum + (count - 1), 0);

    console.log('Verarbeitet:', processed);
    console.log('Fehlgeschlagen:', failed);
    console.log('Eindeutige Content-Hashes:', counts.size);
    console.log('Duplikat-Gruppen (gleicher Content-Hash):', duplicateGroups.length);
    console.log('Duplikate gesamt (zusätzliche Dokumente):', duplicateDocs);

    if (duplicateGroups.length > 0) {
        console.log('\nTop 10 Duplikat-Hashes:');
        duplicateGroups
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([hash, count], idx) => {
                console.log(`#${idx + 1}: ${hash} -> ${count} Dateien`);
            });
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
