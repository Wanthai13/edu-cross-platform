import mongoose from 'mongoose';

const TopicSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    relevance: { type: Number, required: true },
  },
  { _id: false }
);

const ActionItemSchema = new mongoose.Schema(
  {
    task: { type: String, required: true },
    assignee: { type: String, required: false },
  },
  { _id: false }
);

const TranscriptAnalysisSchema = new mongoose.Schema(
  {
    transcriptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transcript', required: false },
    audioId: { type: mongoose.Schema.Types.ObjectId, ref: 'AudioFile', required: false },
    language: { type: String, required: true },
    summary: { type: String, required: true },
    insights: {
      overallScore: { type: Number, required: true },
      agendaCoverage: { type: Number, required: true },
      agendaExplanation: { type: String, required: true },
      actionItems: { type: [ActionItemSchema], default: [] },
      topics: { type: [TopicSchema], default: [] },
    },
  },
  { timestamps: true }
);

export const TranscriptAnalysis =
  mongoose.models.TranscriptAnalysis || mongoose.model('TranscriptAnalysis', TranscriptAnalysisSchema);