import mongoose from 'mongoose';

const FlashcardSchema = new mongoose.Schema(
  {
    front: { type: String, required: true },
    back: { type: String, required: true },
  },
  { _id: false }
);

const QuizSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctAnswer: { type: String, required: true },
  },
  { _id: false }
);

const StudyMaterialSchema = new mongoose.Schema(
  {
    transcriptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transcript', required: false },
    audioId: { type: mongoose.Schema.Types.ObjectId, ref: 'AudioFile', required: false },
    language: { type: String, required: true },
    flashcards: { type: [FlashcardSchema], default: [] },
    quizzes: { type: [QuizSchema], default: [] },
  },
  { timestamps: true }
);

export const StudyMaterial = mongoose.models.StudyMaterial || mongoose.model('StudyMaterial', StudyMaterialSchema);