export type Language = 'en' | 'vi';

export type SummaryLength = 'short' | 'medium' | 'long';

export type Flashcard = {
  front: string;
  back: string;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
};

export type MeetingInsightTopic = {
  topic: string;
  relevance: number; // 0-100
};

export type ActionItem = {
  task: string;
  assignee?: string;
};

export type MeetingInsights = {
  overallScore: number; // 0-100
  agendaCoverage: number; // 0-100
  agendaExplanation: string;
  actionItems: ActionItem[];
  topics: MeetingInsightTopic[];
};

export type TranscriptSegment = {
  id: string;
  speaker: string;
  role?: SpeakerRole | string;
  text: string;
  timestamp?: string;
};

export type Transcript = {
  _id?: string;
  id?: string;
  title?: string;
  segments: TranscriptSegment[];
  summary?: string;
  topics?: string[];
};

export enum AnalysisTab {
  READ = 'read',
  SCORE = 'score',
  SUMMARY = 'summary',
  FLASHCARDS = 'flashcards',
  QUIZ = 'quiz',
  CHAT = 'chat'
}

export enum SpeakerRole {
  LECTURER = 'lecturer',
  HOST = 'host',
  STUDENT = 'student'
}

export type ChatMessage = {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp?: Date | string;
};
