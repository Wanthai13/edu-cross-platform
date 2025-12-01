// models/Transcript.ts
import mongoose from 'mongoose';

export interface ISegment {
  id: number;
  start: number; // seconds
  end: number; // seconds
  text: string;
  confidence?: number;
  
  // Edit tracking
  isEdited: boolean;
  originalText?: string;
  editedText?: string;
  editedAt?: Date;
  
  // Highlighting
  isHighlighted: boolean;
  highlightColor?: string; // 'yellow', 'green', 'red', etc.
  highlightNote?: string;
}

export interface ITranscript extends mongoose.Document {
  audioId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  
  // Full transcript
  fullText: string;
  language: string;
  detectedLanguage?: string;
  confidence?: number;
  
  // Segments with timestamps
  segments: ISegment[];
  
  
  // Export formats tracking
  exportFormats: {
    srt?: {
      generated: boolean;
      lastGenerated?: Date;
    };
    vtt?: {
      generated: boolean;
      lastGenerated?: Date;
    };
    txt?: {
      generated: boolean;
      lastGenerated?: Date;
    };
    tsv?: {
      generated: boolean;
      lastGenerated?: Date;
    };
  };
  
  // Version control
  version: number;
  editHistory: Array<{
    version: number;
    editedBy: mongoose.Types.ObjectId;
    editedAt: Date;
    changes: string; // Description of changes
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

const SegmentSchema = new mongoose.Schema<ISegment>({
  id: { type: Number, required: true },
  start: { type: Number, required: true },
  end: { type: Number, required: true },
  text: { type: String, required: true },
  confidence: { type: Number },
  
  isEdited: { type: Boolean, default: false },
  originalText: { type: String },
  editedText: { type: String },
  editedAt: { type: Date },
  
  isHighlighted: { type: Boolean, default: false },
  highlightColor: { type: String },
  highlightNote: { type: String }
}, { _id: false });

const TranscriptSchema = new mongoose.Schema<ITranscript>({
  audioId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Audio', 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  fullText: { type: String, required: true },
  language: { type: String, required: true },
  detectedLanguage: { type: String },
  confidence: { type: Number },
  
  segments: [SegmentSchema],
  
  exportFormats: {
    srt: {
      generated: { type: Boolean, default: false },
      lastGenerated: { type: Date }
    },
    vtt: {
      generated: { type: Boolean, default: false },
      lastGenerated: { type: Date }
    },
    txt: {
      generated: { type: Boolean, default: false },
      lastGenerated: { type: Date }
    },
    tsv: {
      generated: { type: Boolean, default: false },
      lastGenerated: { type: Date }
    }
  },
  
  version: { type: Number, default: 1 },
  editHistory: [{
    version: { type: Number },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editedAt: { type: Date },
    changes: { type: String }
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes - FIX: Không dùng text index để tránh lỗi language override
TranscriptSchema.index({ audioId: 1 });
TranscriptSchema.index({ userId: 1 });
TranscriptSchema.index({ 'keywords.word': 1 }); // Dùng regular index thay vì text index
TranscriptSchema.index({ createdAt: -1 }); // Để sort theo thời gian

// IMPORTANT: Nếu muốn full-text search, dùng index này với language: 'none'
// TranscriptSchema.index(
//   { fullText: 'text', 'segments.text': 'text' },
//   { default_language: 'none' }  // Không dùng language-specific stemming
// );

export default mongoose.model<ITranscript>('Transcript', TranscriptSchema);