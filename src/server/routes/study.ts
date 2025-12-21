import { Router } from 'express';
import { StudyMaterial } from '../../server/models/StudyMaterial';

const router = Router();

// Save generated study materials
router.post('/study-materials', async (req, res) => {
  try {
    const { transcriptId, audioId, language, flashcards, quizzes } = req.body || {};
    if (!language || (!Array.isArray(flashcards) && !Array.isArray(quizzes))) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    const doc = await StudyMaterial.create({ transcriptId, audioId, language, flashcards, quizzes });
    return res.json({ ok: true, id: doc._id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save study materials' });
  }
});

export default router;