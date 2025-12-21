// server/server.ts (UPDATED)
import dotenv from 'dotenv';
import path from 'path';
import 'tsconfig-paths/register';
dotenv.config({ path: path.join(__dirname, '.env') });

import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { whisperService } from '../services/whisper-service/whisper.service';
import analysisRoutes from './routes/analysis';
import audioRoutes from './routes/audio';
import authRoutes from './routes/auth';
import studyRoutes from './routes/study';
import tagRoutes from './routes/tag'; // ✨ NEW
import transcriptRoutes from './routes/transcript';
import profileRoutes from './routes/profile'; // ✨ Profile & Stats

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/myapp';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    console.log('📊 Available collections: User, Audio, Transcript, Tag'); // ✨ UPDATED
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Check Whisper availability
whisperService.checkAvailability()
  .then(available => {
    if (available) {
      console.log('✅ Whisper AI is available and ready');
    } else {
      console.log('⚠️ Whisper AI is not available. Transcription will fail.');
      console.log('💡 Installation options:');
      console.log('   1. Install whisper.cpp: https://github.com/ggerganov/whisper.cpp');
      console.log('   2. Use faster-whisper: pip install faster-whisper');
    }
  })
  .catch(err => console.error('❌ Error checking Whisper:', err));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    services: {
      mongodb: mongoose.connection.readyState === 1,
      whisper: whisperService.isAvailable
    },
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/transcript', transcriptRoutes);
app.use('/api/tag', tagRoutes); // ✨ NEW
app.use('/api/profile', profileRoutes); // ✨ Profile & Stats
app.use('/api', studyRoutes);
app.use('/api', analysisRoutes);

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Audio Transcription API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login'
      },
      audio: {
        upload: 'POST /api/audio/upload',
        list: 'GET /api/audio',
        get: 'GET /api/audio/:id',
        delete: 'DELETE /api/audio/:id'
      },
      transcript: {
        list: 'GET /api/transcript',
        get: 'GET /api/transcript/:transcriptId',
        getByAudio: 'GET /api/transcript/audio/:audioId',
        createFromYoutube: 'POST /api/transcript/youtube',
        updateMetadata: 'PATCH /api/transcript/:transcriptId/metadata',
        delete: 'DELETE /api/transcript/:transcriptId',
        updateSegment: 'PATCH /api/transcript/:transcriptId/segment/:segmentId',
        highlight: 'PATCH /api/transcript/:transcriptId/segment/:segmentId/highlight',
        getHighlights: 'GET /api/transcript/:transcriptId/highlights',
        export: 'GET /api/transcript/:transcriptId/export/:format',
        search: 'GET /api/transcript/:transcriptId/search?query=',
        history: 'GET /api/transcript/:transcriptId/history'
      },
      analysis: {
        save: 'POST /api/transcript/analysis'
      },
      // ✨ NEW: Tag endpoints
      tag: {
        create: 'POST /api/tag',
        list: 'GET /api/tag',
        get: 'GET /api/tag/:tagId',
        update: 'PATCH /api/tag/:tagId',
        delete: 'DELETE /api/tag/:tagId',
        addToTranscript: 'POST /api/tag/:tagId/transcripts/:transcriptId',
        removeFromTranscript: 'DELETE /api/tag/:tagId/transcripts/:transcriptId',
        getTranscriptsByTag: 'GET /api/tag/:tagId/transcripts',
        bulkAdd: 'POST /api/tag/bulk/add',
        bulkRemove: 'POST /api/tag/bulk/remove'
      },
      // ✨ NEW: Profile & Stats endpoints
      profile: {
        getStats: 'GET /api/profile/stats',
        getAchievements: 'GET /api/profile/achievements',
        getSettings: 'GET /api/profile/settings',
        updateSettings: 'PATCH /api/profile/settings',
        recordActivity: 'POST /api/profile/activity',
        getDailyProgress: 'GET /api/profile/daily-progress',
        resetWeekly: 'POST /api/profile/reset-weekly'
      }
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🔴 Server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    availableRoutes: ['/api/auth', '/api/audio', '/api/transcript', '/api/tag']
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces to allow LAN access
app.listen(Number(PORT), HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📝 Auth API: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api/auth`);
  console.log(`🎤 Audio API: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api/audio`);
  console.log(`📄 Transcript API: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api/transcript`);
  console.log(`🏷️  Tag API: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api/tag`);
  console.log(`📚 API Docs: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api`);
  console.log(`🌐 LAN Access: http://192.168.1.11:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});