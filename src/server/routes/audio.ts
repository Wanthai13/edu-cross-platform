// routes/audio.ts
import 'tsconfig-paths/register';  // ← Phải là dòng đầu tiên!
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { whisperService } from '@services/whisper-service/whisper.service';
import Audio from '../models/AudioFile';
import Transcript from '../models/Transcript';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Configure multer
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/audio');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm',
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio and video files are allowed.'));
    }
  }
});

// ---------------- UPLOAD & TRANSCRIBE ----------------
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { title, description, tags, fileType, language } = req.body;
    const userId = (req as any).userId;

    console.log('📁 File uploaded:', req.file.originalname);

    // Create audio record
    const audio = new Audio({
      userId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileType: fileType || (req.file.mimetype.startsWith('video') ? 'video' : 'audio'),
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      title,
      description,
      tags: tags ? JSON.parse(tags) : [],
      userSpecifiedLanguage: language || 'auto', // 'auto', 'vi', 'en', etc.
      status: 'pending'
    });

    await audio.save();

    // Start transcription in background
    processTranscription(audio._id.toString(), req.file.path, req.file.mimetype, language);

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully. Transcription in progress.',
      audio: {
        _id: audio._id,
        filename: audio.filename,
        originalName: audio.originalName,
        status: audio.status,
        createdAt: audio.createdAt
      }
    });
  } catch (error) {
    console.error('🔴 Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Upload failed' 
    });
  }
});

// ---------------- GET AUDIO WITH TRANSCRIPT ----------------
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const audio = await Audio.findOne({ _id: req.params.id, userId });

    if (!audio) {
      return res.status(404).json({ success: false, message: 'Audio not found' });
    }

    // Get transcript if available
    let transcript = null;
    if (audio.transcriptId) {
      transcript = await Transcript.findById(audio.transcriptId);
    }

    res.json({
      success: true,
      audio: {
        _id: audio._id,
        filename: audio.filename,
        originalName: audio.originalName,
        fileType: audio.fileType,
        status: audio.status,
        language: audio.language,
        duration: audio.duration,
        title: audio.title,
        description: audio.description,
        tags: audio.tags,
        createdAt: audio.createdAt,
        processingError: audio.processingError
      },
      transcript: transcript ? {
        _id: transcript._id,
        fullText: transcript.fullText,
        language: transcript.language,
        segments: transcript.segments,
        version: transcript.version
      } : null
    });
  } catch (error) {
    console.error('🔴 Get audio error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve audio' });
  }
});

// ---------------- GET USER'S AUDIOS ----------------
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { status, fileType, page = 1, limit = 20 } = req.query;

    const query: any = { userId };
    if (status) query.status = status;
    if (fileType) query.fileType = fileType;

    const skip = (Number(page) - 1) * Number(limit);

    const [audios, total] = await Promise.all([
      Audio.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Audio.countDocuments(query)
    ]);

    res.json({
      success: true,
      audios,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('🔴 Get audios error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve audios' });
  }
});

// ---------------- DELETE AUDIO ----------------
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const audio = await Audio.findOne({ _id: req.params.id, userId });

    if (!audio) {
      return res.status(404).json({ success: false, message: 'Audio not found' });
    }

    // Delete transcript if exists
    if (audio.transcriptId) {
      await Transcript.deleteOne({ _id: audio.transcriptId });
    }

    // Delete file from disk
    await fs.unlink(audio.filePath).catch(err => 
      console.log('⚠️ Could not delete file:', err)
    );

    // Delete from database
    await Audio.deleteOne({ _id: audio._id });

    res.json({ success: true, message: 'Audio deleted successfully' });
  } catch (error) {
    console.error('🔴 Delete audio error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete audio' });
  }
});

// ---------------- BACKGROUND PROCESSING ----------------
async function processTranscription(
  audioId: string, 
  filePath: string, 
  mimeType: string,
  userLanguage?: string
) {
  try {
    console.log('🔄 Processing transcription for:', audioId);

    // Update status to processing
    await Audio.findByIdAndUpdate(audioId, { status: 'processing' });

    let audioPath = filePath;

    // Extract audio from video if needed
    if (mimeType.startsWith('video/')) {
      console.log('🎬 Extracting audio from video...');
      audioPath = await whisperService.extractAudio(filePath);
    }

    // Run transcription with language
    const result = await whisperService.transcribe(audioPath, {
      language: userLanguage && userLanguage !== 'auto' ? userLanguage : undefined
    });

    // Get audio document to get userId
    const audio = await Audio.findById(audioId);
    if (!audio) throw new Error('Audio not found');

    // Create transcript document
    const transcript = new Transcript({
      audioId: audio._id,
      userId: audio.userId,
      fullText: result.text,
      language: result.language,
      detectedLanguage: result.language,
      confidence: result.confidence,
      segments: result.segments.map((seg: any, index: number) => ({
        id: index,
        start: seg.start,
        end: seg.end,
        text: seg.text,
        confidence: seg.confidence,
        isEdited: false,
        isHighlighted: false
      })),
      keywords: [], // Will be populated later by keyword extraction
      exportFormats: {
        srt: { generated: false },
        vtt: { generated: false },
        txt: { generated: false },
        tsv: { generated: false }
      }
    });

    await transcript.save();

    // Update audio with transcript reference
    await Audio.findByIdAndUpdate(audioId, {
      status: 'completed',
      language: result.language,
      duration: result.duration,
      transcriptId: transcript._id,
      updatedAt: new Date()
    });

    // Clean up extracted audio if it was created
    if (audioPath !== filePath) {
      await fs.unlink(audioPath).catch(err => 
        console.log('⚠️ Could not delete extracted audio:', err)
      );
    }

    console.log('✅ Transcription completed for:', audioId);

  } catch (error) {
    console.error('🔴 Processing error:', error);

    await Audio.findByIdAndUpdate(audioId, {
      status: 'failed',
      processingError: error instanceof Error ? error.message : 'Processing failed',
      updatedAt: new Date()
    });
  }
}

export default router;