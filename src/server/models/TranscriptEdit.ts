// models/TranscriptEdit.ts
import mongoose from 'mongoose';

export interface ITranscriptEdit extends mongoose.Document {
  transcriptId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  
  // Edit details
  segmentId: number; // Which segment was edited
  editType: 'text' | 'highlight' | 'merge' | 'split' | 'delete';
  
  // Before and after
  oldValue: string;
  newValue: string;
  
  // Metadata
  timestamp: {
    start: number;
    end: number;
  };
  
  // Optional notes
  note?: string;
  
  createdAt: Date;
}

const TranscriptEditSchema = new mongoose.Schema<ITranscriptEdit>({
  transcriptId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Transcript', 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  segmentId: { type: Number, required: true },
  editType: { 
    type: String, 
    enum: ['text', 'highlight', 'merge', 'split', 'delete'],
    required: true 
  },
  
  oldValue: { type: String, required: true },
  newValue: { type: String, required: true },
  
  timestamp: {
    start: { type: Number, required: true },
    end: { type: Number, required: true }
  },
  
  note: { type: String },
  
  createdAt: { type: Date, default: Date.now }
});

// Indexes
TranscriptEditSchema.index({ transcriptId: 1, createdAt: -1 });
TranscriptEditSchema.index({ userId: 1 });

export default mongoose.model<ITranscriptEdit>('TranscriptEdit', TranscriptEditSchema);