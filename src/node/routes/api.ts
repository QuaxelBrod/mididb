import express from 'express';

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

export default router;