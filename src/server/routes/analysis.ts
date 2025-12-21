import { Router } from 'express';
import { TranscriptAnalysis } from '../../server/models/TranscriptAnalysis';

const router = Router();

// Save transcript analysis (summary + insights)
router.post('/transcript/analysis', async (req, res) => {
  try {
    const { transcriptId, audioId, language, summary, insights } = req.body || {};
    if (!summary || !insights || typeof insights.overallScore !== 'number') {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    const doc = await TranscriptAnalysis.create({ transcriptId, audioId, language, summary, insights });
    return res.json({ ok: true, id: doc._id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save analysis' });
  }
});

export default router;