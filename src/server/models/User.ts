// models/User.ts
import mongoose from 'mongoose';

export interface IUser extends mongoose.Document {
  username: string;
  email: string;
  passwordHash: string;
  provider: 'email' | 'github' | 'google' | 'discord';
  role: 'student' | 'employee' | 'disabled' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new mongoose.Schema<IUser>({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  provider: { type: String, enum: ['email', 'github', 'google', 'discord'], default: 'email' },
  role: { type: String, enum: ['student', 'employee', 'disabled', 'admin'], default: 'student' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>('User', UserSchema);
