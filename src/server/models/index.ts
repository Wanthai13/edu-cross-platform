// models/index.ts
// Centralized export for all models

export { default as User } from './User';
export { default as Audio } from './AudioFile';
export { default as Transcript } from './Transcript';
export { default as TranscriptEdit } from './TranscriptEdit';

export type { IAudio } from './AudioFile';
export type { ITranscript, ISegment } from './Transcript';
export type { ITranscriptEdit } from './TranscriptEdit';