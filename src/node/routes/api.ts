import express from 'express';
import { load_brainz_for_midi_file, validationStateMidiFile, load_llm_for_midi_file, get_midi_from_db, parse_midi_file} from '../../common';

const router = express.Router();

// GET /api/healthcheck
router.get('/healthcheck', (_req, res) => {
    res.json({ status: 'ok' });
});

// POST /api/getMidiFileByHash
router.post('/getMidiFileByHash', async (req, res) => {
    const { hash } = req.body;
    if (!hash) {
        return res.status(400).json({ error: 'hash is required' });
    }

    // TODO: Hole die Datenbankfunktion, z.B. getMidiFileByHash(hash)
    // Beispiel:
    // const midiFile: IMidifileInformation | null = await getMidiFileByHash(hash);

    // Dummy-Response für das Beispiel:
    const midiFile: null = null; // Ersetze dies durch echten Datenbankaufruf

    if (!midiFile) {
        return res.status(404).json({ error: 'MIDI file not found' });
    }

    res.json(midiFile);
});

// POST /midi/openMidiFile
router.post('/openMidiFile', express.raw({ type: 'application/octet-stream', limit: '10mb' }), async (req, res) => {
    try {
        const fileName = decodeURIComponent(req.headers['x-filename'] as string || 'unknown.mid');
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
        return res.json(midi_file);

    } catch (err) {
        console.error('Fehler beim Verarbeiten der MIDI-Datei:', err);
        res.status(500).json({ error: 'Fehler beim Verarbeiten der MIDI-Datei' });
    }
});



export default router;