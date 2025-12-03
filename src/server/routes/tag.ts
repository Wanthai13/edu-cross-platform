// routes/tag.ts (FIXED)
import express from 'express';
import Tag from '../models/Tag';
import Transcript from '../models/Transcript';
import Audio from '../models/AudioFile';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// ============================================
// TAG MANAGEMENT
// ============================================

// ---------------- CREATE TAG ----------------
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { name, color, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tag name is required' 
      });
    }

    // Check if tag already exists
    const existingTag = await Tag.findOne({ 
      userId, 
      name: name.trim() 
    });

    if (existingTag) {
      return res.status(409).json({ 
        success: false, 
        message: 'Tag with this name already exists' 
      });
    }

    const tag = new Tag({
      userId,
      name: name.trim(),
      color: color || '#3B82F6',
      description: description?.trim()
    });

    await tag.save();

    res.status(201).json({
      success: true,
      message: 'Tag created successfully',
      tag
    });
  } catch (error) {
    console.error('🔴 Create tag error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create tag' 
    });
  }
});

// ---------------- GET ALL TAGS ----------------
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;

    const tags = await Tag.find({ userId })
      .sort({ name: 1 });

    res.json({
      success: true,
      tags,
      count: tags.length
    });
  } catch (error) {
    console.error('🔴 Get tags error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get tags' 
    });
  }
});

// ---------------- GET TAG BY ID ----------------
router.get('/:tagId', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { tagId } = req.params;

    const tag = await Tag.findOne({ _id: tagId, userId });

    if (!tag) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tag not found' 
      });
    }

    res.json({
      success: true,
      tag
    });
  } catch (error) {
    console.error('🔴 Get tag error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get tag' 
    });
  }
});

// ---------------- UPDATE TAG ----------------
router.patch('/:tagId', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { tagId } = req.params;
    const { name, color, description } = req.body;

    const tag = await Tag.findOne({ _id: tagId, userId });

    if (!tag) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tag not found' 
      });
    }

    // Check if new name already exists (if changing name)
    if (name && name.trim() !== tag.name) {
      const existingTag = await Tag.findOne({ 
        userId, 
        name: name.trim(),
        _id: { $ne: tagId }
      });

      if (existingTag) {
        return res.status(409).json({ 
          success: false, 
          message: 'Tag with this name already exists' 
        });
      }
    }

    if (name !== undefined) tag.name = name.trim();
    if (color !== undefined) tag.color = color;
    if (description !== undefined) tag.description = description?.trim();
    tag.updatedAt = new Date();

    await tag.save();

    res.json({
      success: true,
      message: 'Tag updated successfully',
      tag
    });
  } catch (error) {
    console.error('🔴 Update tag error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update tag' 
    });
  }
});

// ---------------- DELETE TAG ----------------
router.delete('/:tagId', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { tagId } = req.params;

    const tag = await Tag.findOne({ _id: tagId, userId });

    if (!tag) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tag not found' 
      });
    }

    // Remove tag from all transcripts
    await Transcript.updateMany(
      { userId, tags: tagId },
      { $pull: { tags: tagId } }
    );

    await Tag.deleteOne({ _id: tagId });

    res.json({
      success: true,
      message: 'Tag deleted successfully'
    });
  } catch (error) {
    console.error('🔴 Delete tag error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete tag' 
    });
  }
});

// ============================================
// TRANSCRIPT TAGGING
// ============================================

// ---------------- ADD TAG TO TRANSCRIPT ----------------
router.post('/:tagId/transcripts/:transcriptId', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { tagId, transcriptId } = req.params;

    // Verify tag exists and belongs to user
    const tag = await Tag.findOne({ _id: tagId, userId });
    if (!tag) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tag not found' 
      });
    }

    // Verify transcript exists and belongs to user
    const transcript = await Transcript.findOne({ _id: transcriptId, userId });
    if (!transcript) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transcript not found' 
      });
    }

    // Check if tag already added
    if (transcript.tags.includes(tagId as any)) {
      return res.status(409).json({ 
        success: false, 
        message: 'Tag already added to this transcript' 
      });
    }

    // Add tag to transcript
    transcript.tags.push(tagId as any);
    await transcript.save();

    // Update tag count
    tag.transcriptCount += 1;
    await tag.save();

    res.json({
      success: true,
      message: 'Tag added to transcript',
      transcript
    });
  } catch (error) {
    console.error('🔴 Add tag error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add tag' 
    });
  }
});

// ---------------- REMOVE TAG FROM TRANSCRIPT ----------------
router.delete('/:tagId/transcripts/:transcriptId', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { tagId, transcriptId } = req.params;

    // Verify tag exists
    const tag = await Tag.findOne({ _id: tagId, userId });
    if (!tag) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tag not found' 
      });
    }

    // Verify transcript exists
    const transcript = await Transcript.findOne({ _id: transcriptId, userId });
    if (!transcript) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transcript not found' 
      });
    }

    // Remove tag from transcript
    const tagIndex = transcript.tags.indexOf(tagId as any);
    if (tagIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tag not found on this transcript' 
      });
    }

    transcript.tags.splice(tagIndex, 1);
    await transcript.save();

    // Update tag count
    tag.transcriptCount = Math.max(0, tag.transcriptCount - 1);
    await tag.save();

    res.json({
      success: true,
      message: 'Tag removed from transcript',
      transcript
    });
  } catch (error) {
    console.error('🔴 Remove tag error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove tag' 
    });
  }
});

// ---------------- GET TRANSCRIPTS BY TAG ----------------
router.get('/:tagId/transcripts', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { tagId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Verify tag exists
    const tag = await Tag.findOne({ _id: tagId, userId });
    if (!tag) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tag not found' 
      });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [transcripts, total] = await Promise.all([
      Transcript.find({ userId, tags: tagId })
        .populate('audioId')
        .populate('tags')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Transcript.countDocuments({ userId, tags: tagId })
    ]);

    // ✅ FIX: Transform transcripts to match the expected format
    const items = transcripts.map((transcript) => {
      const audio = transcript.audioId as any;
      return {
        _id: transcript._id,
        title: audio?.title || audio?.originalName || 'Untitled', // ✅ FIX: Add title
        fullText: transcript.fullText,
        duration: audio?.duration,
        createdAt: transcript.createdAt,
        updatedAt: transcript.updatedAt,
        language: transcript.language,
        segmentCount: transcript.segments.length,
        highlightCount: transcript.segments.filter((s: any) => s.isHighlighted).length,
        isEdited: transcript.segments.some((s: any) => s.isEdited),
        audioId: audio?._id,
        tags: transcript.tags || [] // ✅ FIX: Include tags
      };
    });

    res.json({
      success: true,
      tag,
      transcripts: items, // ✅ FIX: Return transformed items
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('🔴 Get transcripts by tag error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get transcripts' 
    });
  }
});

// ---------------- BULK ADD TAGS TO TRANSCRIPT ----------------
router.post('/bulk/add', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { transcriptId, tagIds } = req.body;

    if (!transcriptId || !Array.isArray(tagIds) || tagIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'transcriptId and tagIds array are required' 
      });
    }

    // Verify transcript
    const transcript = await Transcript.findOne({ _id: transcriptId, userId });
    if (!transcript) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transcript not found' 
      });
    }

    // Verify all tags exist and belong to user
    const tags = await Tag.find({ _id: { $in: tagIds }, userId });
    if (tags.length !== tagIds.length) {
      return res.status(404).json({ 
        success: false, 
        message: 'One or more tags not found' 
      });
    }

    // Add only new tags
    const newTagIds = tagIds.filter(id => !transcript.tags.includes(id as any));
    
    if (newTagIds.length > 0) {
      transcript.tags.push(...newTagIds as any);
      await transcript.save();

      // Update tag counts
      await Tag.updateMany(
        { _id: { $in: newTagIds } },
        { $inc: { transcriptCount: 1 } }
      );
    }

    res.json({
      success: true,
      message: `${newTagIds.length} tag(s) added to transcript`,
      transcript: await transcript.populate('tags')
    });
  } catch (error) {
    console.error('🔴 Bulk add tags error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add tags' 
    });
  }
});

// ---------------- BULK REMOVE TAGS FROM TRANSCRIPT ----------------
router.post('/bulk/remove', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { transcriptId, tagIds } = req.body;

    if (!transcriptId || !Array.isArray(tagIds) || tagIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'transcriptId and tagIds array are required' 
      });
    }

    // Verify transcript
    const transcript = await Transcript.findOne({ _id: transcriptId, userId });
    if (!transcript) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transcript not found' 
      });
    }

    // Remove tags
    const removedCount = transcript.tags.length;
    transcript.tags = transcript.tags.filter(
      tagId => !tagIds.includes(tagId.toString())
    );
    const actualRemoved = removedCount - transcript.tags.length;

    await transcript.save();

    // Update tag counts
    if (actualRemoved > 0) {
      await Tag.updateMany(
        { _id: { $in: tagIds }, userId },
        { $inc: { transcriptCount: -1 } }
      );
    }

    res.json({
      success: true,
      message: `${actualRemoved} tag(s) removed from transcript`,
      transcript: await transcript.populate('tags')
    });
  } catch (error) {
    console.error('🔴 Bulk remove tags error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove tags' 
    });
  }
});

export default router;