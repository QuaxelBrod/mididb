// MongoDB-Implementierung für dein Dokument
import { MongoClient, Collection, Document } from "mongodb";
import { IDBMidiDocument } from "./global";
import { MidiFile } from "../midifile";
import { SearchMidiDocumentsResult } from "../../web/MidiSearch";
import { getTitleFromEntry , getArtistFromEntry} from "../../utli";


const uri = "mongodb://localhost:27017";
const dbName = "mididb";
const collectionName = "midifiles";

let client: MongoClient;
let collection: Collection<Document>;

// Initialisierung: Verbindung und Index auf hash
export async function initMongo() {
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    collection = db.collection(collectionName);
    // Einzigartiger Index auf hash
    await collection.createIndex({ "midifile.hash": 1 }, { unique: true });
    // Optional: Text-Index für Volltextsuche auf allen relevanten Feldern
    await collection.createIndex({
        "musicLLM.artist": "text",
        "musicLLM.title": "text",
        "musicLLM.album": "text",
        "midifile.fileName": "text",
        "midifile.midiParser.lyrics": "text",
        "musicbrainz.top.artist": "text",
        "musicbrainz.top.title": "text",
        "musicbrainz.top.tags.name": "text",
        "musicbrainz.top.firstReleaseDate": "text",
        "musicbrainz.oldest.artist": "text",
        "musicbrainz.oldest.title": "text",
        "musicbrainz.oldest.firstReleaseDate": "text",
        "musicbrainz.oldest.tags.name": "text",
        "redacted.title": "text",
        "redacted.artist": "text",
        "redacted.release": "text",
        "redacted.album": "text",
        "redacted.text": "text",
        "redacted.tags.name": "text",
        "redacted.tempo": "text",
        "redacted.signature": "text"
    });

}

// Speichern oder updaten eines Dokuments (insert only if hash unique)
export async function saveMidiDocument(doc: IDBMidiDocument) {
    try {
        doc.midifile.data = doc.midifile.data ? Buffer.from(doc.midifile.data as ArrayBuffer).toString('base64') : null;
        const result = await collection.updateOne(
            { "midifile.hash": doc.midifile.hash },
            { $set: doc },
            { upsert: true }
        );
        return result.upsertedId || result.modifiedCount;
    } catch (err: any) {
        throw err;
    }
}

export async function searchRedactedMidiDocuments(query: object, skip = 0, limit = 10000): Promise<SearchMidiDocumentsResult> {
    if (!query) {
        query = { redacted: { $exists: true, $ne: null} };
    }
    else {
        query = {
            ...query,
            redacted: { $exists: true, $ne: null }
        };
    }
    const cursor = collection.find(query).skip(skip).limit(limit);
    const rawDocs = await cursor.toArray();
    const total = await collection.countDocuments(query);

    // Map rawDocs to MidiSearchResult[]
    const docs = rawDocs.map((doc: any) => {
        // Adjust the mapping as needed based on your document structure
        if (doc.redacted) {
            return {
                title: doc.redacted.title || "",
                artist: doc.redacted.artist || "",
                hash: doc.midifile?.hash || "",
                redacted: true,
            };
        }
        return {
            title: getTitleFromEntry(doc),
            artist: getArtistFromEntry(doc),
            hash: doc.midifile?.hash || "",
            redacted: false,
        };
    });
    // sort docs to be redacted first
    docs.sort((a, b) => {
        if (a.redacted && !b.redacted) {
            return -1; // a comes first
        } else if (!a.redacted && b.redacted) {
            return 1; // b comes first
        } else {
            // If both are redacted or both are not, sort by title
            return new String(a.title).localeCompare(b.title, undefined, { sensitivity: 'base' })
        }
    });

    return { docs, total };
}

export async function searchMidiDocuments(query: object, skip = 0, limit = 10000): Promise<SearchMidiDocumentsResult> {
    const cursor = collection.find(query).skip(skip).limit(limit);
    const rawDocs = await cursor.toArray();
    const total = await collection.countDocuments(query);

    // Map rawDocs to MidiSearchResult[]
    const docs = rawDocs.map((doc: any) => {
        // Adjust the mapping as needed based on your document structure
        if (doc.redacted) {
            return {
                title: doc.redacted.title || "",
                artist: doc.redacted.artist || "",
                hash: doc.midifile?.hash || "",
                redacted: true,
            };
        }
        return {
            title: getTitleFromEntry(doc),
            artist: getArtistFromEntry(doc),
            hash: doc.midifile?.hash || "",
            redacted: false,
        };
    });
    // sort docs to be redacted first
    docs.sort((a, b) => {
        if (a.redacted && !b.redacted) {
            return -1; // a comes first
        } else if (!a.redacted && b.redacted) {
            return 1; // b comes first
        } else {
            // If both are redacted or both are not, sort by title
            return new String(a.title).localeCompare(b.title, undefined, { sensitivity: 'base' })
        }
    });

    return { docs, total };
}


// // Suche nach beliebigen Attributen (z.B. artist und title)
// export async function searchMidiDocuments(query: object): Promise<IDBMidiDocument[]> {
//     // Beispiel: Suche nach artist und title (textsuche)
//     // query = { $text: { $search: "Schürzenjäger Mamamia" } }
//     const results = await collection.find(query).toArray() as unknown as IDBMidiDocument[];
//     // convert back to ArrayBuffer
//     results.forEach((result) => {
//         // base64String ist dein gespeicherter String
//         const buffer = Buffer.from(result.midifile.data, 'base64');
//         // Wenn du ein ArrayBuffer brauchst:
//         result.midifile.data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
//     });
//     return results as unknown as IDBMidiDocument[];
// }

/**
 * Prüft, ob ein bestimmter Hash bereits in der Datenbank existiert.
 * @param hash - Der zu prüfende Hashwert.
 * @returns true, wenn der Hash existiert, sonst false.
 */
export async function getDbEntryForHash(hash: string | null): Promise<IDBMidiDocument | null> {
    if (!hash) {
        return null;
    }
    const result = await collection.findOne({ "midifile.hash": hash }) as unknown as IDBMidiDocument;
    // base64String ist dein gespeicherter String
    const buffer = Buffer.from(result.midifile.data, 'base64');
    // Wenn du ein ArrayBuffer brauchst:
    result.midifile.data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return result as unknown as IDBMidiDocument;

}
