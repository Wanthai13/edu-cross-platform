// services/whisper-service/index.ts
export { whisperService } from './whisper.service';
export { fileProcessor } from './file-processor';
export { transcriptionHandler } from './transcription-handler';

export type { 
  TranscriptionOptions, 
  TranscriptionResult, 
  TranscriptionSegment 
} from './whisper.service';

export type { AudioMetadata } from './file-processor';