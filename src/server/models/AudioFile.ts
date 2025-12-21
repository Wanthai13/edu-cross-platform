// models/Audio.ts
import mongoose from 'mongoose';

export interface IAudio extends mongoose.Document {
  userId?: mongoose.Types.ObjectId;
  filename: string;
  originalName: string;
  fileType: 'audio' | 'video' | 'recording';
  filePath: string;
  fileSize: number;
  duration?: number;
  mimeType: string;
  
  // Processing status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  processingJobId?: string; // For queue tracking
  
  // Language detection
  language?: string; // Detected or user-specified language
  userSpecifiedLanguage?: string; // Language user chose
  
  // Metadata
  title?: string;
  description?: string;
  tags?: string[];
  
  // Reference to transcript
  transcriptId?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const AudioSchema = new mongoose.Schema<IAudio>({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false 
  },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  fileType: { 
    type: String, 
    enum: ['audio', 'video', 'recording'], 
    required: true 
  },
  filePath: { type: String, required: true },
  fileSize: { type: Number, required: true },
  duration: { type: Number },
  mimeType: { type: String, required: true },
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingError: { type: String },
  processingJobId: { type: String },
  
  // Language
  language: { type: String },
  userSpecifiedLanguage: { type: String },
  
  // Metadata
  title: { type: String },
  description: { type: String },
  tags: [{ type: String }],
  
  // Reference to transcript
  transcriptId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Transcript' 
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
AudioSchema.index({ userId: 1, createdAt: -1 });
AudioSchema.index({ status: 1 });
AudioSchema.index({ processingJobId: 1 });

export default mongoose.model<IAudio>('Audio', AudioSchema);