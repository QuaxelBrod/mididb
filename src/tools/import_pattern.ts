import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { MidiParser } from '../midi_parser';
import { getTopListForParams } from '../electron/musicbrainz/musicbrainz';
import { IDBMidiDocument } from '../electron/mongo/global';

// --- Hashing logic from hashMidiContent.ts ---

const skipTypes = new Set([
    'text',
    'copyrightNotice',
    'trackName',
    'instrumentName',
    'lyrics',
    'marker',
    'cuePoint',
]);

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

// --- Filename parsing ---

function parseFilename(fileName: string): { artist: string; title: string } | null {
    // ARTIST_-SONGNAME.mid -> split by "-_"
    // The user wrote ARTIST_-SONGNAME.mid but gave example Isley_Brothers-_Shout.mid
    // Let's try splitting by "-_" or "-". 
    // Isley_Brothers-_Shout.mid
    const basename = path.basename(fileName, path.extname(fileName));
    const parts = basename.split('-_');

    if (parts.length === 2) {
        return {
            artist: parts[0].replace(/_/g, ' ').trim(),
            title: parts[1].replace(/_/g, ' ').trim()
        };
    }

    // Fallback if "-_" not found, maybe just "-"?
    const partsHyphen = basename.split('-');
    if (partsHyphen.length === 2) {
        return {
            artist: partsHyphen[0].replace(/_/g, ' ').trim(),
            title: partsHyphen[1].replace(/_/g, ' ').trim()
        };
    }

    // Fallback strategy: Replace all underscores with spaces and treat as full Title
    // MusicBrainz should be able to find it via broad search
    const cleaned = basename.replace(/_/g, ' ').trim();
    if (cleaned.length > 0) {
        return {
            artist: "", // Empty artist triggers fuzzy search
            title: cleaned
        };
    }

    return null;
}

// --- Recursive file search ---

function getAllMidiFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllMidiFiles(filePath, fileList);
        } else {
            const ext = path.extname(file).toLowerCase();
            if (ext === '.mid' || ext === '.midi' || ext === '.kar') {
                fileList.push(filePath);
            }
        }
    }
    return fileList;
}

// --- Main script ---

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('Usage: npx ts-node src/tools/import_pattern.ts <directory>');
        process.exit(1);
    }

    const importDir = path.resolve(args[0]);
    if (!fs.existsSync(importDir)) {
        console.error(`Directory not found: ${importDir}`);
        process.exit(1);
    }

    const urlRaw = process.env.MONGO_URL || 'mongodb://localhost:27017';
    const url = urlRaw.startsWith('mongodb://') ? urlRaw : `mongodb://${urlRaw}`;
    const dbName = process.env.MONGO_DB_NAME || 'mididb';
    const collectionName = process.env.MONGO_DB_COLLECTION || 'midifiles';

    const client = new MongoClient(url);
    await client.connect();
    const collection = client.db(dbName).collection<IDBMidiDocument>(collectionName);

    console.log(`Scanning directory: ${importDir}`);
    const midiFiles = getAllMidiFiles(importDir);
    console.log(`Found ${midiFiles.length} MIDI files.`);

    for (const filePath of midiFiles) {
        const fileName = path.basename(filePath);
        console.log(`\nProcessing: ${fileName}`);

        const parsed = parseFilename(fileName);
        if (!parsed) {
            console.warn(`[SKIP] Could not parse filename pattern for: ${fileName}`);
            continue;
        }

        const { artist, title } = parsed;
        console.log(`Parsed: Artist="${artist}", Title="${title}"`);

        let buffer: Buffer;
        try {
            buffer = fs.readFileSync(filePath);
        } catch (err) {
            console.error(`[ERROR] Could not read file: ${filePath}`, err);
            continue;
        }

        let contentHash: string;
        let parserJson: any;
        try {
            const parser = new MidiParser(new Uint8Array(buffer));
            parserJson = parser.toJson();
            contentHash = hashMidiContent(buffer);
        } catch (err) {
            console.error(`[SKIP] Could not parse/hash MIDI: ${fileName}`, err);
            continue;
        }

        // Check if hash exists in DB
        let existingDoc = await collection.findOne({ "midifile.hash": contentHash });
        let docToSave: any;

        if (existingDoc) {
            console.log(`[EXISTING] Hash found: ${contentHash}. Updating redacted info.`);
            docToSave = { ...existingDoc };
            if (!docToSave.redacted) docToSave.redacted = {};
            docToSave.redacted.artist = artist;
            docToSave.redacted.title = title;
            docToSave.redacted.text = [...(parserJson.lyrics || []), ...(parserJson.text || [])].join('\n');
            docToSave.validationState = 'open';

            if (docToSave.midifile && docToSave.midifile.fileName) {
                if (!docToSave.midifile.fileName.includes(fileName)) {
                    docToSave.midifile.fileName.push(fileName);
                }
            }
        } else {
            console.log(`[NEW] Hash not found: ${contentHash}. Creating new document.`);
            docToSave = {
                redacted: {
                    artist,
                    title,
                    text: [...(parserJson.lyrics || []), ...(parserJson.text || [])].join('\n')
                },
                validationState: 'open',
                midifile: {
                    filePath: filePath,
                    fileName: [fileName],
                    fileDir: path.basename(path.dirname(filePath)),
                    fileExt: path.extname(fileName),
                    data: buffer.toString('base64'),
                    hash: contentHash,
                    midiParser: parserJson
                },
                musicLLM: null,
                musicbrainz: null
            };
        }

        // --- MusicBrainz enrichment ---
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        let mbData = null;
        let retries = 3;
        while (retries > 0) {
            try {
                console.log(`Searching MusicBrainz for: "${artist} - ${title}" (Retries: ${3 - retries})`);
                mbData = await getTopListForParams({ title, artist }, 3);
                // Respect MusicBrainz rate limit (1 req/sec)
                await sleep(1100);
                break;
            } catch (err: any) {
                retries--;
                console.warn(`[WARN] MusicBrainz attempt failed for: ${artist} - ${title}. Error: ${err.message || err}. Retrying in 2s...`);
                await sleep(2000);
                if (retries === 0) {
                    console.error(`[ERROR] MusicBrainz enrichment failed after 3 attempts for: ${artist} - ${title}`);
                }
            }
        }

        if (mbData && (mbData.top?.length > 0 || mbData.oldest)) {
            docToSave.musicbrainz = mbData;

            // Complement missing redacted fields
            const bestEntry = mbData.oldest || (mbData.top ? mbData.top[0] : null);
            if (bestEntry) {
                if (!docToSave.redacted) docToSave.redacted = {};
                if (!docToSave.redacted.release && bestEntry.firstReleaseDate) {
                    docToSave.redacted.release = bestEntry.firstReleaseDate;
                }
                if (!docToSave.redacted.tags && bestEntry.tags) {
                    docToSave.redacted.tags = bestEntry.tags.map((t: any) => ({ name: t.name }));
                }
            }
        }

        // Save back to DB
        if (docToSave._id) {
            const { _id, ...updateData } = docToSave;
            await collection.updateOne({ _id }, { $set: updateData });
            console.log(`[DONE] Updated document _id: ${_id}`);
        } else {
            const result = await collection.insertOne(docToSave);
            console.log(`[DONE] Inserted new document _id: ${result.insertedId}`);
        }
    }

    await client.close();
    console.log('\nImport finished.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
