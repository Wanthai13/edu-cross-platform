// routes/audio.ts
import express from 'express';
import fs from 'fs/promises';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import 'tsconfig-paths/register';
import { whisperService } from '../../services/whisper-service/whisper.service';
import { youtubeTranscriptService } from '../../services/youtube-transcript.service';
import Audio from '../models/AudioFile';
import Transcript from '../models/Transcript';

const router = express.Router();

// Optional auth middleware - extracts userId if token is present, but doesn't require it
const optionalAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret') as { userId: string };
      (req as any).userId = decoded.userId;
      console.log('🔐 Auth token valid, userId:', decoded.userId);
    } catch (error) {
      console.log('⚠️ Invalid token, proceeding without auth');
      // Don't reject - just proceed without userId
    }
  } else {
    console.log('⚠️ No auth token provided, proceeding without auth');
  }
  
  next();
};

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
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a', 'audio/x-m4a', 'audio/mp4',
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
    ];

    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.mp3', '.wav', '.ogg', '.webm', '.m4a', '.mp4', '.mov'];

    if (
      allowedTypes.includes(file.mimetype) ||
      file.mimetype.startsWith('audio/') ||
      file.mimetype.startsWith('video/') ||
      (file.mimetype === 'application/octet-stream' && allowedExts.includes(ext)) ||
      allowedExts.includes(ext)
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio and video files are allowed.'));
    }
  }
});

// ---------------- UPLOAD & TRANSCRIBE ----------------
router.post('/upload', optionalAuthMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { title, description, tags, fileType, language } = req.body;
    const userId = (req as any).userId; // may be undefined for public uploads

    console.log('📁 File uploaded:', req.file.originalname);
    console.log('👤 User ID:', userId || 'anonymous');

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

// ---------------- TRANSCRIBE FROM YOUTUBE URL ----------------
router.post('/youtube', optionalAuthMiddleware, async (req, res) => {
  console.log('📺 YouTube endpoint hit!');
  console.log('   Request body:', JSON.stringify(req.body));
  
  try {
    const { url, language } = req.body;
    const userId = (req as any).userId;
    
    if (!url) {
      console.log('❌ URL is missing');
      return res.status(400).json({ success: false, message: 'URL is required' });
    }

    console.log(`📺 Processing YouTube URL: ${url}`);
    console.log(`   Preferred language: ${language || 'auto'}`);
    console.log(`   User ID: ${userId || 'anonymous'}`);

    // Extract video ID for validation
    const videoId = youtubeTranscriptService.extractVideoId(url);
    if (!videoId) {
      console.log('❌ Invalid YouTube URL format');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid YouTube URL format' 
      });
    }

    console.log(`✅ Video ID extracted: ${videoId}`);

    // STRATEGY 1: Try to get existing subtitles/captions (FAST - 2-5 seconds)
    console.log('🔍 Attempting to fetch existing subtitles...');
    
    let subtitleResult = null;
    try {
      subtitleResult = await youtubeTranscriptService.tryGetTranscript(url, language);
    } catch (transcriptError) {
      console.error('⚠️ Error fetching transcript (will continue):', transcriptError);
    }

    if (subtitleResult) {
      console.log(`✅ Found ${subtitleResult.source}! Processing...`);
      
      // Create audio record (no actual file, just metadata)
      const audio = new Audio({
        userId: (req as any).userId,
        filename: `youtube_${videoId}.txt`,
        originalName: `YouTube: ${url}`,
        fileType: 'youtube-transcript',
        filePath: '', // No physical file
        fileSize: subtitleResult.text.length,
        mimeType: 'text/plain',
        title: `YouTube: ${videoId}`,
        description: `Imported from YouTube ${subtitleResult.source}`,
        tags: ['youtube', subtitleResult.source],
        userSpecifiedLanguage: language || 'auto',
        language: subtitleResult.language,
        duration: subtitleResult.duration,
        status: 'processing'
      });
      await audio.save();

      // Create transcript directly
      const transcript = new Transcript({
        audioId: audio._id,
        userId: audio.userId,
        fullText: subtitleResult.text,
        language: subtitleResult.language,
        detectedLanguage: subtitleResult.language,
        confidence: subtitleResult.source === 'subtitles' ? 1.0 : 0.85,
        segments: subtitleResult.segments.map((seg, index) => ({
          id: index,
          start: seg.start,
          end: seg.end,
          text: seg.text,
          confidence: subtitleResult.source === 'subtitles' ? 1.0 : 0.85,
          isEdited: false,
          isHighlighted: false
        })),
        keywords: [],
        exportFormats: {
          srt: { generated: false },
          vtt: { generated: false },
          txt: { generated: false },
          tsv: { generated: false }
        }
      });
      await transcript.save();

      // Update audio status
      await Audio.findByIdAndUpdate(audio._id, {
        status: 'completed',
        transcriptId: transcript._id,
        updatedAt: new Date()
      });

      console.log(`✅ YouTube transcript created successfully via ${subtitleResult.source}`);

      return res.status(201).json({
        success: true,
        message: `Transcript imported from YouTube ${subtitleResult.source}`,
        audio: { 
          _id: audio._id, 
          status: 'completed',
          source: subtitleResult.source
        },
        transcript: {
          _id: transcript._id,
          language: transcript.language,
          segmentCount: transcript.segments.length
        }
      });
    }

    // STRATEGY 2: No subtitles found - return error with helpful message
    // Note: Whisper fallback requires yt-dlp and ffmpeg which may not be available
    console.log('⚠️ No subtitles/captions found for this video');
    
    // Try whisper fallback if available
    try {
      console.log('🔄 Attempting Whisper transcription fallback...');
      console.log('⏳ This will take several minutes. Downloading audio...');

      // Download audio
      const audioPath = await whisperService.downloadYouTubeAudio(url);

      // Create audio record
      const audio = new Audio({
        userId: (req as any).userId,
        filename: path.basename(audioPath),
        originalName: `YouTube: ${url}`,
        fileType: 'audio',
        filePath: audioPath,
        fileSize: 0,
        mimeType: 'audio/wav',
        title: `YouTube: ${videoId}`,
        description: 'Imported from YouTube (Whisper transcription)',
        tags: ['youtube', 'whisper'],
        userSpecifiedLanguage: language || 'auto',
        status: 'pending'
      });
      await audio.save();

      // Start background transcription
      processYouTubeTranscription(audio._id.toString(), audioPath, language);

      return res.status(201).json({
        success: true,
        message: 'No subtitles available. Audio downloaded and queued for Whisper transcription (this will take several minutes)',
        audio: { 
          _id: audio._id, 
          status: 'pending',
          source: 'whisper'
        }
      });
    } catch (whisperError) {
      console.error('❌ Whisper fallback failed:', whisperError);
      
      // Return helpful error message
      return res.status(400).json({
        success: false,
        message: 'This video does not have subtitles or captions available. Please try a different video that has subtitles enabled.',
        details: {
          videoId,
          reason: 'no_subtitles',
          whisperAvailable: false
        }
      });
    }

  } catch (error) {
    console.error('🔴 YouTube processing error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to process YouTube URL' 
    });
  }
});

// Background processing for Whisper transcription
async function processYouTubeTranscription(
  audioId: string,
  audioPath: string,
  language?: string
) {
  try {
    console.log('🔄 Starting Whisper transcription for:', audioId);

    await Audio.findByIdAndUpdate(audioId, { status: 'processing' });

    const result = await whisperService.transcribe(audioPath, {
      language: language && language !== 'auto' ? language : undefined
    });

    const audio = await Audio.findById(audioId);
    if (!audio) throw new Error('Audio not found');

    const transcript = new Transcript({
      audioId: audio._id,
      userId: audio.userId,
      fullText: result.text,
      language: result.language,
      detectedLanguage: result.language,
      confidence: result.confidence,
      segments: result.segments.map((seg, index) => ({
        id: index,
        start: seg.start,
        end: seg.end,
        text: seg.text,
        confidence: seg.confidence,
        isEdited: false,
        isHighlighted: false
      })),
      keywords: [],
      exportFormats: {
        srt: { generated: false },
        vtt: { generated: false },
        txt: { generated: false },
        tsv: { generated: false }
      }
    });
    await transcript.save();

    await Audio.findByIdAndUpdate(audioId, {
      status: 'completed',
      language: result.language,
      duration: result.duration,
      transcriptId: transcript._id,
      updatedAt: new Date()
    });

    // Cleanup downloaded audio
    await fs.unlink(audioPath).catch(err => 
      console.log('⚠️ Could not delete audio file:', err)
    );

    console.log('✅ Whisper transcription completed for:', audioId);

  } catch (error) {
    console.error('🔴 Whisper transcription error:', error);
    await Audio.findByIdAndUpdate(audioId, {
      status: 'failed',
      processingError: error instanceof Error ? error.message : 'Whisper transcription failed',
      updatedAt: new Date()
    });
  }
}
// ---------------- GET AUDIO BY ID ----------------
router.get('/:id', async (req, res) => {
  try {
    const audio = await Audio.findById(req.params.id);

    if (!audio) {
      return res.status(404).json({ success: false, message: 'Audio not found' });
    }

    // Get transcript if available
    let transcript = null;
    if (audio.transcriptId) {
      transcript = await Transcript.findById(audio.transcriptId);
      console.log('📄 Found transcript:', transcript ? transcript._id : 'null', 'for audio:', audio._id);
    } else {
      console.log('⚠️ No transcriptId found for audio:', audio._id, 'status:', audio.status);
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
router.get('/', async (req, res) => {
  try {
    const { status, fileType, page = 1, limit = 20 } = req.query;

    const query: any = {};
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
router.delete('/:id', async (req, res) => {
  try {
    const audio = await Audio.findById(req.params.id);

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

    console.log('📄 Creating transcript for audio:', {
      audioId: audio._id,
      audioUserId: audio.userId,
      audioUserIdType: typeof audio.userId,
      audioStatus: audio.status
    });

    // Create transcript document
    const transcript = new Transcript({
      audioId: audio._id,
      userId: audio.userId, // This will be undefined for public uploads, which is OK now
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
    console.log('✅ Transcript saved:', {
      transcriptId: transcript._id,
      audioId: audio._id,
      userId: transcript.userId,
      userIdType: typeof transcript.userId,
      userIdString: transcript.userId?.toString(),
      fullTextLength: transcript.fullText.length,
      segmentsCount: transcript.segments.length
    });

    // Update audio with transcript reference
    const updatedAudio = await Audio.findByIdAndUpdate(audioId, {
      status: 'completed',
      language: result.language,
      duration: result.duration,
      transcriptId: transcript._id,
      updatedAt: new Date()
    }, { new: true });
    
    console.log('✅ Audio updated:', {
      audioId,
      status: 'completed',
      transcriptId: transcript._id,
      userId: audio.userId,
      userIdType: typeof audio.userId,
      userIdString: audio.userId?.toString()
    });

    // Clean up extracted audio if it was created
    if (audioPath !== filePath) {
      await fs.unlink(audioPath).catch(err => 
        console.log('⚠️ Could not delete extracted audio:', err)
      );
    }

    console.log('✅ Transcription completed for:', audioId, 'Transcript ID:', transcript._id);

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