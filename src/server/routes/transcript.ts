// routes/transcript.ts
import express from 'express';
import Transcript from '../models/Transcript';
import TranscriptEdit from '../models/TranscriptEdit';
import Audio from '../models/AudioFile';
import { authMiddleware } from '../middleware/auth';
import { transcriptExportService } from '@services/transcriptExportService';

const router = express.Router();

// ---------------- GET TRANSCRIPT BY AUDIO ID ----------------
router.get('/audio/:audioId', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    // Verify audio ownership
    const audio = await Audio.findOne({ _id: req.params.audioId, userId });
    if (!audio) {
      return res.status(404).json({ success: false, message: 'Audio not found' });
    }

    const transcript = await Transcript.findOne({ audioId: audio._id });
    if (!transcript) {
      return res.status(404).json({ success: false, message: 'Transcript not found' });
    }

    res.json({ success: true, transcript });
  } catch (error) {
    console.error('🔴 Get transcript error:', error);
    res.status(500).json({ success: false, message: 'Failed to get transcript' });
  }
});

// ---------------- UPDATE SEGMENT TEXT ----------------
router.patch('/:transcriptId/segment/:segmentId', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { transcriptId, segmentId } = req.params;
    const { text, note } = req.body;

    const transcript = await Transcript.findOne({ _id: transcriptId, userId });
    if (!transcript) {
      return res.status(404).json({ success: false, message: 'Transcript not found' });
    }

    // Find segment
    const segment = transcript.segments.find(s => s.id === Number(segmentId));
    if (!segment) {
      return res.status(404).json({ success: false, message: 'Segment not found' });
    }

    // Save edit history
    const edit = new TranscriptEdit({
      transcriptId: transcript._id,
      userId,
      segmentId: Number(segmentId),
      editType: 'text',
      oldValue: segment.text,
      newValue: text,
      timestamp: {
        start: segment.start,
        end: segment.end
      },
      note
    });
    await edit.save();

    // Update segment
    if (!segment.isEdited) {
      segment.originalText = segment.text;
    }
    segment.text = text;
    segment.editedText = text;
    segment.isEdited = true;
    segment.editedAt = new Date();

    // Update full text
    transcript.fullText = transcript.segments.map(s => s.text).join(' ');
    
    // Update version
    transcript.version += 1;
    transcript.editHistory.push({
      version: transcript.version,
      editedBy: userId,
      editedAt: new Date(),
      changes: `Edited segment ${segmentId}`
    });

    await transcript.save();

    res.json({ 
      success: true, 
      message: 'Segment updated successfully',
      transcript 
    });
  } catch (error) {
    console.error('🔴 Update segment error:', error);
    res.status(500).json({ success: false, message: 'Failed to update segment' });
  }
});

// ---------------- HIGHLIGHT SEGMENT ----------------
router.patch('/:transcriptId/segment/:segmentId/highlight', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { transcriptId, segmentId } = req.params;
    const { isHighlighted, color, note } = req.body;

    const transcript = await Transcript.findOne({ _id: transcriptId, userId });
    if (!transcript) {
      return res.status(404).json({ success: false, message: 'Transcript not found' });
    }

    const segment = transcript.segments.find(s => s.id === Number(segmentId));
    if (!segment) {
      return res.status(404).json({ success: false, message: 'Segment not found' });
    }

    // Update highlight
    segment.isHighlighted = isHighlighted;
    segment.highlightColor = color || 'yellow';
    segment.highlightNote = note;

    await transcript.save();

    res.json({ 
      success: true, 
      message: 'Highlight updated successfully',
      segment 
    });
  } catch (error) {
    console.error('🔴 Highlight error:', error);
    res.status(500).json({ success: false, message: 'Failed to update highlight' });
  }
});

// ---------------- GET HIGHLIGHTED SEGMENTS ----------------
router.get('/:transcriptId/highlights', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { transcriptId } = req.params;

    const transcript = await Transcript.findOne({ _id: transcriptId, userId });
    if (!transcript) {
      return res.status(404).json({ success: false, message: 'Transcript not found' });
    }

    const highlights = transcript.segments.filter(s => s.isHighlighted);

    res.json({ 
      success: true, 
      highlights,
      count: highlights.length
    });
  } catch (error) {
    console.error('🔴 Get highlights error:', error);
    res.status(500).json({ success: false, message: 'Failed to get highlights' });
  }
});

// ---------------- EXPORT TRANSCRIPT ----------------
router.get('/:transcriptId/export/:format', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { transcriptId, format } = req.params;

    if (!['srt', 'vtt', 'txt', 'tsv'].includes(format)) {
      return res.status(400).json({ success: false, message: 'Invalid format' });
    }

    const transcript = await Transcript.findOne({ _id: transcriptId, userId });
    if (!transcript) {
      return res.status(404).json({ success: false, message: 'Transcript not found' });
    }

    // Generate export content
    let content: string;
    let contentType: string;
    let filename: string;

    const audio = await Audio.findById(transcript.audioId);
    const baseFilename = audio?.originalName.replace(/\.[^/.]+$/, '') || 'transcript';

    switch (format) {
      case 'srt':
        content = transcriptExportService.generateSRT(transcript);
        contentType = 'application/x-subrip';
        filename = `${baseFilename}.srt`;
        break;
      case 'vtt':
        content = transcriptExportService.generateVTT(transcript);
        contentType = 'text/vtt';
        filename = `${baseFilename}.vtt`;
        break;
      case 'txt':
        content = transcriptExportService.generateTXT(transcript);
        contentType = 'text/plain';
        filename = `${baseFilename}.txt`;
        break;
      case 'tsv':
        content = transcriptExportService.generateTSV(transcript);
        contentType = 'text/tab-separated-values';
        filename = `${baseFilename}.tsv`;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid format' });
    }

    // Update export tracking
    const formatKey = format as 'srt' | 'vtt' | 'txt' | 'tsv';
    transcript.exportFormats[formatKey] = {
      generated: true,
      lastGenerated: new Date()
    };
    await transcript.save();

    // Send file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);

  } catch (error) {
    console.error('🔴 Export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export transcript' });
  }
});

// ---------------- SEARCH IN TRANSCRIPT ----------------
router.get('/:transcriptId/search', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { transcriptId } = req.params;
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, message: 'Query is required' });
    }

    const transcript = await Transcript.findOne({ _id: transcriptId, userId });
    if (!transcript) {
      return res.status(404).json({ success: false, message: 'Transcript not found' });
    }

    // Search in segments
    const searchTerm = (query as string).toLowerCase();
    const results = transcript.segments.filter(segment => 
      segment.text.toLowerCase().includes(searchTerm)
    );

    res.json({ 
      success: true, 
      results,
      count: results.length
    });
  } catch (error) {
    console.error('🔴 Search error:', error);
    res.status(500).json({ success: false, message: 'Failed to search transcript' });
  }
});

// ---------------- GET EDIT HISTORY ----------------
router.get('/:transcriptId/history', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { transcriptId } = req.params;

    const transcript = await Transcript.findOne({ _id: transcriptId, userId });
    if (!transcript) {
      return res.status(404).json({ success: false, message: 'Transcript not found' });
    }

    const edits = await TranscriptEdit.find({ transcriptId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ 
      success: true, 
      editHistory: transcript.editHistory,
      recentEdits: edits
    });
  } catch (error) {
    console.error('🔴 Get history error:', error);
    res.status(500).json({ success: false, message: 'Failed to get history' });
  }
});

export default router;