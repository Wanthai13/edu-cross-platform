// routes/transcript.ts (FIXED)
import express from 'express';
import mongoose from 'mongoose';
import Transcript from '../models/Transcript';
import Audio from '../models/AudioFile';
import { authMiddleware } from '../middleware/auth';
import { transcriptExportService } from '@services/transcriptExportService';

const router = express.Router();

// Helper function to convert userId to ObjectId if needed
function convertUserId(userId: string | undefined): mongoose.Types.ObjectId | string | undefined {
  if (!userId) return undefined;
  return mongoose.Types.ObjectId.isValid(userId) 
    ? new mongoose.Types.ObjectId(userId) 
    : userId;
}

// Helper function to build userId query
function buildUserIdQuery(userId: string | undefined): any {
  const userIdQuery = convertUserId(userId);
  if (userIdQuery) {
    return { userId: userIdQuery };
  }
  // For public uploads (no userId)
  return {
    $or: [
      { userId: null },
      { userId: { $exists: false } }
    ]
  };
}

// Helper function to find transcript by ID with userId check
async function findTranscriptById(
  transcriptId: string, 
  userId: string | undefined,
  populateOptions: string[] = ['audioId', 'tags']
) {
  const userIdQuery = convertUserId(userId);
  
  // Try to find transcript first without userId filter
  let transcript = await Transcript.findOne({ _id: transcriptId })
    .populate(populateOptions[0] || 'audioId')
    .populate(populateOptions[1] || 'tags');
  
  // If transcript exists, check userId match
  if (transcript && userIdQuery && transcript.userId) {
    const transcriptUserId = transcript.userId.toString();
    const queryUserId = userIdQuery.toString();
    
    if (transcriptUserId !== queryUserId) {
      // Transcript belongs to different user
      console.log('⚠️ Access denied: Transcript belongs to different user');
      return null; // Return null to indicate access denied
    }
  }
  
  // If no transcript found and we have userId, try with userId filter
  if (!transcript && userIdQuery) {
    transcript = await Transcript.findOne({ 
      _id: transcriptId, 
      userId: userIdQuery 
    })
      .populate(populateOptions[0] || 'audioId')
      .populate(populateOptions[1] || 'tags');
  }
  
  return transcript;
}

// ---------------- LIST ALL TRANSCRIPTS ----------------
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    console.log('📋 Listing transcripts for userId:', userId, 'type:', typeof userId);
    
    // Convert userId to ObjectId if needed
    const userIdQuery = convertUserId(userId);
    
    // Build query - try both ObjectId and string to ensure we find all transcripts
    // Also include legacy transcripts without userId for backwards compatibility
    let query: any = {};
    if (userIdQuery) {
      // Try to match with both ObjectId and string format
      // Also include transcripts without userId (legacy/public uploads) 
      query = {
        $or: [
          { userId: userIdQuery },
          { userId: userId }, // Also try original string format
          { userId: userIdQuery.toString() }, // Try as string
          { userId: null }, // Include legacy transcripts
          { userId: { $exists: false } } // Include transcripts without userId field
        ]
      };
    } else {
      // For public uploads (no userId)
      query = {
        $or: [
          { userId: null },
          { userId: { $exists: false } }
        ]
      };
    }
    
    // Debug: Check all transcripts in database first
    const allTranscripts = await Transcript.find({}).limit(5).select('userId');
    console.log('🔍 All transcripts in DB (first 5):', allTranscripts.map(t => ({
      id: t._id,
      userId: t.userId,
      userIdType: typeof t.userId,
      userIdString: t.userId?.toString()
    })));
    
    console.log('🔍 Query:', JSON.stringify(query, null, 2));
    console.log('🔍 userIdQuery:', userIdQuery, 'type:', typeof userIdQuery);
    console.log('🔍 userIdQuery string:', userIdQuery?.toString());
    
    const transcripts = await Transcript.find(query)
      .populate('audioId')
      .populate('tags') // ✅ ADD THIS
      .sort({ createdAt: -1 });
    
    console.log('✅ Found', transcripts.length, 'transcripts for userId:', userId);
    
    // Log first few transcripts for debugging
    if (transcripts.length > 0) {
      console.log('📋 First transcript userId:', transcripts[0].userId, 'type:', typeof transcripts[0].userId);
      console.log('📋 First transcript userId string:', transcripts[0].userId?.toString());
      console.log('📋 Query userId string:', userIdQuery?.toString());
      console.log('📋 Match:', transcripts[0].userId?.toString() === userIdQuery?.toString());
    } else {
      console.log('⚠️ No transcripts found! Checking if userId matches...');
      // Try to find any transcript with this userId as string
      const testQuery = { userId: userId };
      const testResults = await Transcript.find(testQuery).limit(1);
      console.log('🔍 Test query with string userId:', testResults.length, 'results');
      
      // Also try without userId filter to see if there are any transcripts at all
      const allCount = await Transcript.countDocuments({});
      console.log('🔍 Total transcripts in DB:', allCount);
    }

    const items = await Promise.all(
      transcripts.map(async (transcript) => {
        const audio = transcript.audioId as any;
        if (!audio) {
          console.log('⚠️ Transcript', transcript._id, 'has no audioId populated');
        }
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

    console.log('📤 Returning', items.length, 'transcript items');
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
    
    console.log('📋 Getting transcript by ID:', transcriptId, 'for userId:', userId);
    
    // Convert userId to ObjectId if needed
    const userIdQuery = convertUserId(userId);
    
    // Try to find transcript - first without userId filter to see if it exists
    let transcript = await Transcript.findOne({ _id: transcriptId })
      .populate('audioId')
      .populate('tags');
    
    console.log('🔍 Found transcript:', transcript ? 'yes' : 'no');
    if (transcript) {
      console.log('🔍 Transcript userId:', transcript.userId, 'type:', typeof transcript.userId);
      console.log('🔍 Query userId:', userIdQuery, 'type:', typeof userIdQuery);
      if (transcript.userId && userIdQuery) {
        console.log('🔍 Match:', transcript.userId.toString() === userIdQuery.toString());
      }
    }
    
    // If transcript exists but userId doesn't match, check if it's a public upload (no userId)
    if (transcript && userIdQuery && transcript.userId) {
      const transcriptUserId = transcript.userId.toString();
      const queryUserId = userIdQuery.toString();
      
      if (transcriptUserId !== queryUserId) {
        // Transcript belongs to different user
        console.log('⚠️ Transcript belongs to different user');
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. Transcript belongs to another user.' 
        });
      }
    }
    
    // If no transcript found and we have userId, try with userId filter
    if (!transcript && userIdQuery) {
      transcript = await Transcript.findOne({ 
        _id: transcriptId, 
        userId: userIdQuery 
      })
        .populate('audioId')
        .populate('tags');
    }
    
    if (!transcript) {
      console.log('⚠️ Transcript not found:', transcriptId);
      return res.status(404).json({ success: false, message: 'Transcript not found' });
    }

    console.log('✅ Returning transcript:', transcript._id);
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

    const transcript = await findTranscriptById(transcriptId, userId);
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

    const transcript = await findTranscriptById(transcriptId, userId);
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

    const transcript = await findTranscriptById(transcriptId, userId);
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

    const transcript = await findTranscriptById(transcriptId, userId);
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

    const transcript = await findTranscriptById(transcriptId, userId);
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

    const transcript = await findTranscriptById(transcriptId, userId);
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

    const transcript = await findTranscriptById(transcriptId, userId);
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

    const transcript = await findTranscriptById(transcriptId, userId);
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