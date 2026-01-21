import { MongoClient } from 'mongodb';

/**
 * This script examines the MIDI database and deletes entries that do not have any MIDI data.
 * Usage: npx ts-node src/tools/cleanup_empty_midi.ts [--dry-run | --simulate]
 */
async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run') || args.includes('--simulate');

    const urlRaw = process.env.MONGO_URL || 'mongodb://localhost:27017';
    const url = urlRaw.startsWith('mongodb://') ? urlRaw : `mongodb://${urlRaw}`;
    const dbName = process.env.MONGO_DB_NAME || 'mididb';
    const collectionName = process.env.MONGO_DB_COLLECTION || 'midifiles';

    console.log(`Connecting to MongoDB at ${url}...`);
    const client = new MongoClient(url);

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // Define query to find documents without MIDI data
        // We check for null, undefined (missing field), or empty string in midifile.data
        const query = {
            $or: [
                { "midifile.data": null },
                { "midifile.data": { $exists: false } },
                { "midifile.data": "" }
            ]
        };

        const totalBefore = await collection.countDocuments({});
        const countToDelete = await collection.countDocuments(query);

        console.log(`Total documents in database: ${totalBefore}`);
        console.log(`Identified ${countToDelete} documents without MIDI data.`);

        if (countToDelete > 0) {
            if (dryRun) {
                console.log("\n[SIMULATION MODE] No changes will be made.");
                console.log(`Would delete ${countToDelete} documents.`);
            } else {
                console.log(`\nDeleting ${countToDelete} documents...`);
                const result = await collection.deleteMany(query);
                console.log(`Successfully deleted ${result.deletedCount} documents.`);
            }
        } else {
            console.log("\nNo documents found that match the cleanup criteria.");
        }

    } catch (err: any) {
        console.error("An error occurred during cleanup:", err.message || err);
        process.exit(1);
    } finally {
        await client.close();
        console.log("Database connection closed.");
    }
}

main().catch(err => {
    console.error("FATAL ERROR:", err);
    process.exit(1);
});
