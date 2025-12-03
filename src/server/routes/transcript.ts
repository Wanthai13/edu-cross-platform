// routes/transcript.ts (FIXED)
import express from 'express';
import Transcript from '../models/Transcript';
import Audio from '../models/AudioFile';
import { authMiddleware } from '../middleware/auth';
import { transcriptExportService } from '@services/transcriptExportService';

const router = express.Router();

// ---------------- LIST ALL TRANSCRIPTS ----------------
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    // ✅ FIX: Populate both audioId AND tags
    const transcripts = await Transcript.find({ userId })
      .populate('audioId')
      .populate('tags') // ✅ ADD THIS
      .sort({ createdAt: -1 });

    const items = await Promise.all(
      transcripts.map(async (transcript) => {
        const audio = transcript.audioId as any;
        return {
          _id: transcript._id,
          title: audio?.title || audio?.originalName || 'Untitled',
          fullText: transcript.fullText,
          duration: audio?.duration,
          createdAt: transcript.createdAt,
          updatedAt: transcript.updatedAt, // ✅ ADD updatedAt
          language: transcript.language,
          segmentCount: transcript.segments.length,
          highlightCount: transcript.segments.filter((s: any) => s.isHighlighted).length,
          isEdited: transcript.segments.some((s: any) => s.isEdited),
          audioId: audio?._id,
          tags: transcript.tags || [] // ✅ ADD TAGS to response
        };
      })
    );

    res.json({ success: true, transcripts: items });
  } catch (error) {
    console.error('🔴 List transcripts error:', error);
    res.status(500).json({ success: false, message: 'Failed to list transcripts' });
  }
});

// ---------------- GET TRANSCRIPT BY ID ----------------
router.get('/:transcriptId', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { transcriptId } = req.params;
    
    // ✅ FIX: Populate tags
    const transcript = await Transcript.findOne({ 
      _id: transcriptId, 
      userId 
    })
      .populate('audioId')
      .populate('tags'); // ✅ ADD THIS
    
    if (!transcript) {
      return res.status(404).json({ success: false, message: 'Transcript not found' });
    }

    res.json({ success: true, transcript });
  } catch (error) {
    console.error('🔴 Get transcript error:', error);
    res.status(500).json({ success: false, message: 'Failed to get transcript' });
  }
});

// ---------------- GET TRANSCRIPT BY AUDIO ID ----------------
router.get('/audio/:audioId', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    const audio = await Audio.findOne({ _id: req.params.audioId, userId });
    if (!audio) {
      return res.status(404).json({ success: false, message: 'Audio not found' });
    }

    // ✅ FIX: Populate tags
    const transcript = await Transcript.findOne({ audioId: audio._id })
      .populate('tags'); // ✅ ADD THIS
      
    if (!transcript) {
      return res.status(404).json({ success: false, message: 'Transcript not found' });
    }

    res.json({ success: true, transcript });
  } catch (error) {
    console.error('🔴 Get transcript error:', error);
    res.status(500).json({ success: false, message: 'Failed to get transcript' });
  }
});

// ---------------- UPDATE TRANSCRIPT METADATA ----------------
router.patch('/:transcriptId/metadata', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { transcriptId } = req.params;
    const { title, description, tags } = req.body;

    const transcript = await Transcript.findOne({ _id: transcriptId, userId });
    if (!transcript) {
      return res.status(404).json({ success: false, message: 'Transcript not found' });
    }

    // Update audio metadata
    const audio = await Audio.findById(transcript.audioId);
    if (audio) {
      if (title !== undefined) audio.title = title;
      if (description !== undefined) audio.description = description;
      if (tags !== undefined) audio.tags = tags;
      await audio.save();
    }

    res.json({ 
      success: true, 
      message: 'Metadata updated successfully',
      audio 
    });
  } catch (error) {
    console.error('🔴 Update metadata error:', error);
    res.status(500).json({ success: false, message: 'Failed to update metadata' });
  }
});

// ---------------- DELETE TRANSCRIPT ----------------
router.delete('/:transcriptId', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { transcriptId } = req.params;

    const transcript = await Transcript.findOne({ _id: transcriptId, userId });
    if (!transcript) {
      return res.status(404).json({ success: false, message: 'Transcript not found' });
    }

    // Optional: Also delete associated audio file
    // await Audio.findByIdAndDelete(transcript.audioId);

    await Transcript.findByIdAndDelete(transcriptId);

    res.json({ 
      success: true, 
      message: 'Transcript deleted successfully'
    });
  } catch (error) {
    console.error('🔴 Delete transcript error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete transcript' });
  }
});

// ---------------- UPDATE SEGMENT TEXT ----------------
router.patch('/:transcriptId/segment/:segmentId', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { transcriptId, segmentId } = req.params;
    const { text } = req.body;

    const transcript = await Transcript.findOne({ _id: transcriptId, userId });
    if (!transcript) {
      return res.status(404).json({ success: false, message: 'Transcript not found' });
    }

    const segment = transcript.segments.find(s => s.id === Number(segmentId));
    if (!segment) {
      return res.status(404).json({ success: false, message: 'Segment not found' });
    }

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

    const formatKey = format as 'srt' | 'vtt' | 'txt' | 'tsv';
    transcript.exportFormats[formatKey] = {
      generated: true,
      lastGenerated: new Date()
    };
    await transcript.save();

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

    res.json({ 
      success: true, 
      editHistory: transcript.editHistory
    });
  } catch (error) {
    console.error('🔴 Get history error:', error);
    res.status(500).json({ success: false, message: 'Failed to get history' });
  }
});

export default router;