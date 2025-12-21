// models/UserStats.ts
import mongoose from 'mongoose';

export interface IUserStats extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  totalSessions: number;
  totalStudyTime: number; // in minutes
  totalFlashcards: number;
  flashcardsMastered: number;
  quizzesTaken: number;
  quizCorrectAnswers: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: Date;
  weeklyProgress: number[]; // 7 days, minutes per day
  xp: number;
  level: number;
  achievements: string[]; // achievement IDs
  settings: {
    language: 'vi' | 'en';
    darkMode: boolean;
    notifications: boolean;
    audioQuality: 'low' | 'medium' | 'high';
    dailyGoal: number; // minutes
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserStatsSchema = new mongoose.Schema<IUserStats>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  totalSessions: { type: Number, default: 0 },
  totalStudyTime: { type: Number, default: 0 },
  totalFlashcards: { type: Number, default: 0 },
  flashcardsMastered: { type: Number, default: 0 },
  quizzesTaken: { type: Number, default: 0 },
  quizCorrectAnswers: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastStudyDate: { type: Date },
  weeklyProgress: { type: [Number], default: [0, 0, 0, 0, 0, 0, 0] },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  achievements: { type: [String], default: [] },
  settings: {
    language: { type: String, enum: ['vi', 'en'], default: 'vi' },
    darkMode: { type: Boolean, default: false },
    notifications: { type: Boolean, default: true },
    audioQuality: { type: String, enum: ['low', 'medium', 'high'], default: 'high' },
    dailyGoal: { type: Number, default: 30 } // 30 minutes default
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Calculate level from XP
UserStatsSchema.methods.calculateLevel = function() {
  // Level formula: level = floor(sqrt(xp / 100)) + 1
  this.level = Math.floor(Math.sqrt(this.xp / 100)) + 1;
  return this.level;
};

// Add XP and recalculate level
UserStatsSchema.methods.addXP = function(amount: number) {
  this.xp += amount;
  this.calculateLevel();
};

export default mongoose.model<IUserStats>('UserStats', UserStatsSchema);

