import express from 'express';
import { load_brainz_for_midi_file, validationStateMidiFile, load_llm_for_midi_file, get_midi_from_db, parse_midi_file } from '../../common';
import { getDbEntryForHash, saveMidiDocument, searchMidiDocuments, getTotalMidiCount, deleteMidiDocument } from '../../electron/mongo/mongo';
import { IDBMidiDocument } from '../../electron/mongo/global';

const router = express.Router();




// POST /midi/openMidiFile
router.post('/openMidiFile', express.raw({ type: 'application/octet-stream', limit: '10mb' }), async (req, res) => {
    try {
        const fileName = decodeURIComponent(req.headers['x-filename'] as string || '<unknown>');
        const buffer: ArrayBuffer = req.body;

        let midi_file = await parse_midi_file(buffer, fileName);
        if (!midi_file) {
            console.error('Fehler beim lesen der MIDI-Datei');
            res.status(500).json({ error: 'Fehler beim laden der MIDI-Datei' });
        }
        midi_file = await get_midi_from_db(midi_file);
        if (!midi_file) {
            console.error('Fehler beim zugriff auf die DB');
            res.status(500).json({ error: 'Fehler beim zugriff auf die DB' });
        }
        midi_file = await load_llm_for_midi_file(midi_file);
        if (!midi_file) {
            console.error('Fehler beim LLM laden');
            res.status(500).json({ error: 'Fehler beim LLM laden' });
        }
        midi_file = await load_brainz_for_midi_file(midi_file);
        if (!midi_file) {
            console.error('Fehler beim zugriff auf Musicbrainz');
            res.status(500).json({ error: 'Fehler beim zugriff auf Musicbrainz' });
        }
        if (midi_file) {
            midi_file = validationStateMidiFile(midi_file);
        }
        // convert the ArrayBuffer to a Base64 string
        const base64String = Buffer.from(midi_file?.midifile?.data as ArrayBuffer).toString('base64');
        if (base64String && midi_file && midi_file.midifile && midi_file.midifile.data) {
            midi_file.midifile.data = base64String;
        }
        return res.json(midi_file);

    } catch (err) {
        console.error('Fehler beim Verarbeiten der MIDI-Datei:', err);
        return res.status(500).json({ error: 'Fehler beim Verarbeiten der MIDI-Datei' });
    }
});


// POST /midi/openMidiFile
router.post('/saveMidiFile', async (req, res) => {
    const buffer: IMidiFileInformation = req.body;
    try {
        if (!buffer || !buffer.midifile) {
            console.error('saveMidiFile: Invalid body', req.body);
            return res.status(400).json({ error: 'Invalid MIDI data structure' });
        }

        if (buffer.midifile.data) {
            // Zuerst den Base64-String in einen Buffer umwandeln
            const nodeBuffer = Buffer.from(buffer.midifile.data as string, 'base64');

            // Dann aus dem Buffer einen ArrayBuffer erzeugen
            const arrayBuffer = nodeBuffer.buffer.slice(
                nodeBuffer.byteOffset,
                nodeBuffer.byteOffset + nodeBuffer.byteLength
            );

            // Den ArrayBuffer zurück in die Datenstruktur setzen
            buffer.midifile.data = arrayBuffer;
        }
        // console.dir (buffer, { depth: 3 });
        let midi_file_id = await saveMidiDocument(buffer as IDBMidiDocument);
        return res.json({ success: true, id: midi_file_id });
    }
    catch (err) {
        console.error('Fehler beim speichern der MIDI-Datei');
        return res.status(500).json({ error: 'Fehler beim speichern der MIDI-Datei' });
    }
});

router.post('/getMidiFileByHash', async (req, res) => {
    console.log('getMidiFileByHash', req.body);
    const hash: { hash: string } = req.body;
    if (!hash) {
        return res.status(400).json({ error: 'hash is required' });
    }
    let midi_file = await getDbEntryForHash(hash.hash);
    if (!midi_file) {
        console.error('Fehler beim zugriff auf die DB');
        return res.status(500).json({ error: 'Fehler beim zugriff auf die DB' });
    }
    midi_file.midifile.data = midi_file.midifile.data ? Buffer.from(midi_file.midifile.data as ArrayBuffer).toString('base64') : null;
    return res.json(midi_file);
});

router.post('/searchMidiDocuments', async (req, res) => {
    try {
        const { query, skip, limit } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'query parameter is required' });
        }

        // Standardwerte für Pagination
        const skipValue = skip || 0;
        const limitValue = limit || 10000;

        console.log(`Suche mit query: ${JSON.stringify(query)}, skip: ${skipValue}, limit: ${limitValue}`);

        // MongoDB-Suche durchführen
        // Verwende searchRedactedMidiDocuments wenn du nur redacted Dokumente haben möchtest
        // oder searchMidiDocuments wenn du alle Dokumente haben möchtest
        const result = await searchMidiDocuments(query, skipValue, limitValue);

        if (!result) {
            console.error('Keine Suchergebnisse zurückgeliefert');
            return res.status(404).json({ docs: [], total: 0 });
        }

        return res.json(result);
    } catch (err) {
        console.error('Fehler bei der Datenbankabfrage:', err);
        return res.status(500).json({ error: 'Fehler bei der Datenbankabfrage', docs: [], total: 0 });
    }
});


// POST /midi/importFromUrl
router.post('/importFromUrl', async (req, res) => {
    try {
        const { url, sourceMetadata } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // 1. Download file
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();

        // 2. Parse & Hash (this reuses logic from opened files)
        // We simulate a filename from the URL or default
        const fileName = url.split('/').pop() || 'downloaded.mid';

        let midi_file = await parse_midi_file(arrayBuffer, fileName);
        if (!midi_file) {
            return res.status(400).json({ error: 'Failed to parse MIDI content' });
        }

        // 3. Check DB
        const existing = await getDbEntryForHash(midi_file.midifile.hash!);

        if (existing) {
            // Already exists - maybe update metadata?
            // For now, we just return "skipped" but with success: true
            console.log(`MIDI existing: ${midi_file.midifile.hash}`);
            return res.json({ success: true, status: 'skipped', id: (existing as any)._id, hash: existing.midifile.hash });
        }

        // 4. Enrich & Save
        midi_file = await load_llm_for_midi_file(midi_file);
        midi_file = await load_brainz_for_midi_file(midi_file);
        if (midi_file) {
            midi_file = validationStateMidiFile(midi_file);

            // Add source metadata if provided (e.g. reddit link title)
            if (sourceMetadata) {
                // Ensure redacted object exists
                if (!midi_file.redacted) midi_file.redacted = {};
                // If we don't have a title yet, use source metadata
                if (!midi_file.redacted.title && sourceMetadata.title) {
                    midi_file.redacted.title = sourceMetadata.title;
                }
                // Store original source info in redacted.tags or a new field?
                // Let's verify if we can extend the schema or put it in tags.
                // For now, put it in tags
                if (!midi_file.redacted.tags) midi_file.redacted.tags = [];
                midi_file.redacted.tags.push({ name: `source:${url}` });
                if (sourceMetadata.postId) {
                    midi_file.redacted.tags.push({ name: `reddit:post:${sourceMetadata.postId}` });
                }
            }
        }

        // Save
        const id = await saveMidiDocument(midi_file as IDBMidiDocument);
        console.log(`MIDI imported: ${midi_file?.midifile.hash}`);
        return res.json({ success: true, status: 'imported', id, hash: midi_file?.midifile.hash });

    } catch (err: any) {
        console.error('Error importing from URL:', err);
        return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

// POST /midi/deleteMidiFile
router.post('/deleteMidiFile', async (req, res) => {
    try {
        const { hash } = req.body;
        if (!hash) {
            return res.status(400).json({ error: 'Hash is required' });
        }
        const success = await deleteMidiDocument(hash);
        if (!success) {
            return res.status(404).json({ error: 'Document not found or could not be deleted' });
        }
        return res.json({ success: true });
    } catch (err) {
        console.error('Fehler beim Löschen der Datei:', err);
        return res.status(500).json({ error: 'Fehler beim Löschen der Datei' });
    }
});

// GET /midi/count
router.get('/count', async (req, res) => {
    try {
        const count = await getTotalMidiCount();
        res.json({ count });
    } catch (err) {
        console.error('Fehler beim Abrufen der Anzahl:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Anzahl' });
    }
});

export default router;