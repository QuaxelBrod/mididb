// MongoDB-Implementierung für dein Dokument
import { MongoClient, Collection, Document } from "mongodb";
import { IDBMidiDocument } from "./global";
import { MidiFile } from "../midifile";
import { SearchMidiDocumentsResult } from "../../web/MidiSearch";
import { getTitleFromEntry, getArtistFromEntry } from "../../utli";
import { cli } from "webpack/types";



const uri_fix = "localhost:27017"; // Standard URI für MongoDB
const dbName_fix = "mididb";
const collectionName_fix = "midifiles";

let client: MongoClient;
let collection: Collection<Document>;

// Initialisierung: Verbindung und Index auf hash
export async function initMongo(uri: string = uri_fix, dbName: string = dbName_fix, collectionName: string = collectionName_fix) {
    let mongourl = `mongodb://${uri}`;
    client = new MongoClient(mongourl);
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
        if (!client || !collection) {
            throw new Error("MongoDB client or collection not initialized. Please call initMongo first.");
        }
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

export async function searchRedactedMidiDocuments(query: any, skip = 0, limit = 10000): Promise<SearchMidiDocumentsResult> {
    if (!client || !collection) {
        throw new Error("MongoDB client or collection not initialized. Please call initMongo first.");
    }
    if (!query) {
        query = { redacted: { $exists: true, $ne: null } };
    }
    else {
        query = {
            ...query,
            redacted: { $exists: true, $ne: null }
        };
    }

    // Convert string _id to ObjectId if present
    if (query._id && typeof query._id === 'string') {
        const { ObjectId } = require('mongodb');
        try {
            query._id = new ObjectId(query._id);
        } catch (err) {
            console.error('Invalid ObjectId format:', query._id);
            return { docs: [], total: 0 };
        }
    }

    // Case-insensitive machen
    const caseInsensitiveQuery = makeQueryCaseInsensitive(query);

    const cursor = collection.find(caseInsensitiveQuery).skip(skip).limit(limit);
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


/**
 * Konvertiert String-Suchkriterien in case-insensitive RegExp-Objekte
 */
function makeQueryCaseInsensitive(query: any): any {
    // Bei leerer Query direkt zurückgeben
    if (!query || Object.keys(query).length === 0) return query;

    // Bei $text-Suche nichts ändern (MongoDB Text-Indizes sind bereits case-insensitiv)
    if (query.$text) return query;

    // Tiefe Kopie des Query-Objekts erstellen
    const result = JSON.parse(JSON.stringify(query));

    // Rekursiv durch das Query-Objekt gehen
    Object.keys(result).forEach(key => {
        const value = result[key];

        // Skip exact match fields (hash, _id, ObjectId)
        if (key === 'midifile.hash') {
            if (typeof value === 'string') {
                result[key] = value.toLowerCase();
            }
            return; // Keep exact value (normalized)
        }
        if (key === '_id') {
            return; // Keep exact value
        }

        // Wenn der Wert ein String ist, in RegExp umwandeln
        if (typeof value === 'string' && !key.startsWith('$')) {
            result[key] = { $regex: value, $options: 'i' };
        }
        // Wenn es ein Objekt ist, rekursiv verarbeiten (außer bei speziellen MongoDB-Operatoren)
        else if (typeof value === 'object' && value !== null && !key.startsWith('$')) {
            result[key] = makeQueryCaseInsensitive(value);
        }
    });

    return result;
}


export async function searchMidiDocuments(query: object, skip = 0, limit = 10000): Promise<SearchMidiDocumentsResult> {
    if (!client || !collection) {
        throw new Error("MongoDB client or collection not initialized. Please call initMongo first.");
    }
    const caseInsensitiveQuery = makeQueryCaseInsensitive(query);
    console.log('Query an MongoDB:', JSON.stringify(caseInsensitiveQuery, null, 2));
    const cursor = collection.find(caseInsensitiveQuery).skip(skip).limit(limit);
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
    if (!client || !collection) {
        throw new Error("MongoDB client or collection not initialized. Please call initMongo first.");
    }
    const result = await collection.findOne({ "midifile.hash": hash }) as unknown as IDBMidiDocument;
    // base64String ist dein gespeicherter String
    if (!result) {
        return null;
    }
    // Konvertiere den base64-String zurück in ein ArrayBuffer
    const buffer = Buffer.from(result.midifile.data, 'base64');
    // Wenn du ein ArrayBuffer brauchst:
    result.midifile.data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return result as unknown as IDBMidiDocument;
}

export async function getTotalMidiCount(): Promise<number> {
    if (!client || !collection) {
        throw new Error("MongoDB client or collection not initialized. Please call initMongo first.");
    }
    return await collection.countDocuments({});
}
