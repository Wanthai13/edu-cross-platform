// models/Tag.ts
import mongoose from 'mongoose';

export interface ITag extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  name: string; // Tag name: "Meeting Notes", "Important", etc.
  color: string; // Hex color for UI
  description?: string;
  
  // Statistics
  transcriptCount: number; // How many transcripts have this tag
  
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema = new mongoose.Schema<ITag>({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  color: { 
    type: String, 
    default: '#3B82F6' // Default blue
  },
  description: { type: String },
  
  transcriptCount: { 
    type: Number, 
    default: 0 
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
TagSchema.index({ userId: 1, name: 1 }, { unique: true }); // User không thể tạo 2 tag cùng tên
TagSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<ITag>('Tag', TagSchema);