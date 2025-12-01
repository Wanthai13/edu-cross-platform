import client from './client';
import { generateFlashcards, generateQuiz, generateMeetingInsights } from '../services/genai';

export type TranscriptItem = {
  _id: string;
  title: string;
  sourceType: string;
  createdAt: string;
};

export type TranscriptDetail = {
  _id: string;
  title: string;
  summary: string;
  topics: string[];
  keywords: string[];
  segments: {
    id: string;
    startTime: number;
    endTime: number;
    text: string;
    speaker: string;
    speakerRole?: string | null;
    speakerUsername?: string | null;
  }[];
};

export async function fetchTranscripts(): Promise<TranscriptItem[]> {
  const resp = await client.get<TranscriptItem[]>('/transcripts');
  return resp.data;
}

export async function fetchTranscriptDetail(id: string): Promise<TranscriptDetail> {
  const resp = await client.get<any>(`/transcripts/${id}`);
  const data = resp.data;
  // Normalize segments to a predictable shape that the app expects
  if (Array.isArray(data?.segments)) {
    data.segments = data.segments.map((s: any, idx: number) => ({
      id: s.id ?? s._id ?? String(idx),
      startTime: s.startTime ?? s.start ?? 0,
      endTime: s.endTime ?? s.end ?? 0,
      text: s.text ?? s.transcript ?? '',
      // prefer 'speaker' field used across UI, fall back to username/role
      speaker: s.speaker ?? s.speakerUsername ?? (s.speakerRole ? `${s.speakerRole}` : 'Speaker'),
      speakerRole: s.speakerRole ?? s.role ?? null,
      speakerUsername: s.speakerUsername ?? null,
    }));
  }

  return data as TranscriptDetail;
}

export async function fetchFlashcards(id: string) {
  try {
    const resp = await client.get(`/transcripts/${id}/flashcards`);
    if (resp?.data && resp.data.length) return resp.data;
  } catch (err) {
    // server may not provide flashcards; we'll fallback to client-side generation below
    // eslint-disable-next-line no-console
    console.warn('fetchFlashcards server error, falling back to GenAI', err);
  }

  // Fallback: fetch transcript text and generate flashcards locally (default language: English)
  try {
    const detail = await fetchTranscriptDetail(id);
    const fullText = detail.segments.map(s => `${s.speaker || s.speakerUsername || 'Speaker'}: ${s.text}`).join('\n');
    const generated = await generateFlashcards(fullText, 'en');
    return generated;
  } catch (err) {
    console.warn('generateFlashcards fallback failed', err);
    return [];
  }
}

export async function fetchQuiz(id: string) {
  try {
    const resp = await client.get(`/transcripts/${id}/quiz`);
    if (resp?.data && resp.data.length) return resp.data;
  } catch (err) {
    // server may not provide quiz; fallback to client-side generation
    // eslint-disable-next-line no-console
    console.warn('fetchQuiz server error, falling back to GenAI', err);
  }

  try {
    const detail = await fetchTranscriptDetail(id);
    const fullText = detail.segments.map(s => `${s.speaker || s.speakerUsername || 'Speaker'}: ${s.text}`).join('\n');
    const generated = await generateQuiz(fullText, 'en');
    return generated;
  } catch (err) {
    console.warn('generateQuiz fallback failed', err);
    return [];
  }
}

export async function fetchLearningScore(id: string) {
  try {
    const resp = await client.get(`/transcripts/${id}/score`);
    if (resp?.data) return resp.data;
  } catch (err) {
    console.warn('fetchLearningScore server error, falling back to GenAI', err);
  }

  // Fallback: derive meeting insights locally
  try {
    const detail = await fetchTranscriptDetail(id);
    const fullText = detail.segments.map(s => `${s.speaker || s.speakerUsername || 'Speaker'}: ${s.text}`).join('\n');
    const insights = await generateMeetingInsights(fullText, 'en');
    // Map insights to the expected score shape if possible
    return insights ? { coverage: insights.agendaCoverage, understanding: insights.overallScore, difficulty: 0 } : null;
  } catch (err) {
    console.warn('generateMeetingInsights fallback failed', err);
    return null;
  }
}

// Create a transcript record from a YouTube URL
export async function createTranscriptFromYoutube(url: string) {
  const resp = await client.post('/transcripts', { sourceType: 'youtube', url });
  return resp.data as { id: string };
}

// Upload a file (FormData) to create a transcript record. Caller provides a FormData with a file field.
export async function uploadTranscriptFile(formData: FormData) {
  const resp = await client.post('/transcripts/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return resp.data as { id: string };
}

// Run processing pipeline steps for an existing transcript id.
// onProgress(stage, data?) is called for each step.
export async function processTranscriptPipeline(id: string, onProgress?: (stage: string, data?: any) => void) {
  const steps = ['whisper', 'diarize', 'summary', 'flashcards', 'quiz', 'score'];
  for (const step of steps) {
    try {
      if (onProgress) onProgress(step, { status: 'started' });
      // Many backends expose POST /transcripts/:id/:step to start processing.
      const resp = await client.post(`/transcripts/${id}/${step}`);
      if (onProgress) onProgress(step, { status: 'done', result: resp.data });
    } catch (err) {
      if (onProgress) onProgress(step, { status: 'error', error: err });
      throw err;
    }
  }
  // Return final transcript detail
  return fetchTranscriptDetail(id);
}
