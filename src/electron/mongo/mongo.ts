// MongoDB-Implementierung für dein Dokument
import { MongoClient, Collection, Document } from "mongodb";
import { IDBMidiDocument } from "./global";
import { MidiFile } from "../midifile";

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
        "musicbrainz.oldest.tags.name": "text"

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

// Suche nach beliebigen Attributen (z.B. artist und title)
export async function searchMidiDocuments(query: object) {
    // Beispiel: Suche nach artist und title (textsuche)
    // query = { $text: { $search: "Schürzenjäger Mamamia" } }
    const results = await collection.find(query).toArray();
    return results;
}

/**
 * Prüft, ob ein bestimmter Hash bereits in der Datenbank existiert.
 * @param hash - Der zu prüfende Hashwert.
 * @returns true, wenn der Hash existiert, sonst false.
 */
export async function getDbEntryForHash(hash: string | null): Promise<IDBMidiDocument | null> {
    if (!hash) {
        return null;
    }
    const result = await collection.findOne({ "midifile.hash": hash });
    return result as unknown as IDBMidiDocument;

}
