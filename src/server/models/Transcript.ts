// models/Transcript.ts (UPDATED - FULL VERSION)
import mongoose from 'mongoose';
import Tag from './Tag';

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
  userId?: mongoose.Types.ObjectId;
  
  // Full transcript
  fullText: string;
  language: string;
  detectedLanguage?: string;
  confidence?: number;
  
  // Segments with timestamps
  segments: ISegment[];
  
  // ✨ NEW: Tags reference
  tags: mongoose.Types.ObjectId[]; // Array of Tag IDs
  
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
    required: false 
  },
  
  fullText: { type: String, required: true },
  language: { type: String, required: true },
  detectedLanguage: { type: String },
  confidence: { type: Number },
  
  segments: [SegmentSchema],
  
  // ✨ NEW: Tags
  tags: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tag',
    default: [] // Default empty array
  }],
  
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

// ============================================
// INDEXES
// ============================================
TranscriptSchema.index({ audioId: 1 });
TranscriptSchema.index({ userId: 1 });
TranscriptSchema.index({ tags: 1 }); // ✨ NEW: Index for tag queries
TranscriptSchema.index({ userId: 1, tags: 1 }); // ✨ NEW: Compound index for filtering by user + tag
TranscriptSchema.index({ createdAt: -1 }); // Sort by creation time

// IMPORTANT: Nếu muốn full-text search, dùng index này với language: 'none'
// TranscriptSchema.index(
//   { fullText: 'text', 'segments.text': 'text' },
//   { default_language: 'none' }  // Không dùng language-specific stemming
// );

// ============================================
// MIDDLEWARE / HOOKS
// ============================================

// ✨ NEW: Update tag counts when transcript is deleted
TranscriptSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    if (this.tags && this.tags.length > 0) {
      // Decrease transcript count for all tags
      await Tag.updateMany(
        { _id: { $in: this.tags } },
        { $inc: { transcriptCount: -1 } }
      );
    }
    next();
  } catch (error) {
    next(error as any);
  }
});

// ✨ NEW: Update tag counts when using findByIdAndDelete
TranscriptSchema.pre('findOneAndDelete', async function(next) {
  try {
    const doc = await this.model.findOne(this.getQuery());
    if (doc && doc.tags && doc.tags.length > 0) {
      await Tag.updateMany(
        { _id: { $in: doc.tags } },
        { $inc: { transcriptCount: -1 } }
      );
    }
    next();
  } catch (error) {
    next(error as any);
  }
});

// ✨ NEW: Update updatedAt on save
TranscriptSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// ============================================
// METHODS
// ============================================

// ✨ NEW: Instance method to add tag
TranscriptSchema.methods.addTag = async function(tagId: mongoose.Types.ObjectId) {
  if (!this.tags.includes(tagId)) {
    this.tags.push(tagId);
    await this.save();
    
    // Increment tag count
    await Tag.findByIdAndUpdate(tagId, { $inc: { transcriptCount: 1 } });
  }
};

// ✨ NEW: Instance method to remove tag
TranscriptSchema.methods.removeTag = async function(tagId: mongoose.Types.ObjectId) {
  const index = this.tags.findIndex((id: { toString: () => string; }) => id.toString() === tagId.toString());
  if (index > -1) {
    this.tags.splice(index, 1);
    await this.save();
    
    // Decrement tag count
    await Tag.findByIdAndUpdate(tagId, { $inc: { transcriptCount: -1 } });
  }
};

// ✨ NEW: Instance method to check if has tag
TranscriptSchema.methods.hasTag = function(tagId: mongoose.Types.ObjectId): boolean {
  return this.tags.some((id: { toString: () => string; }) => id.toString() === tagId.toString());
};

export default mongoose.model<ITranscript>('Transcript', TranscriptSchema);