import { GoogleGenAI, Type } from '@google/genai';

// Local type definitions to replace missing '../types' module
export type Flashcard = {
  front: string;
  back: string;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string; // Optional explanation for why the correct answer is right
};

export type Language = 'en' | 'vi';

export type SummaryLength = 'short' | 'medium' | 'long';

export type MeetingInsights = {
  overallScore: number;
  agendaCoverage: number;
  agendaExplanation: string;
  actionItems: {
    task: string;
    assignee: string;
  }[];
  topics: {
    topic: string;
    relevance: number;
  }[];
};

// NOTE: In React Native, store API keys securely (e.g., expo-secure-store or native build configs).
let ai: any | null = null;
const quotaWarned: { flash?: boolean; quiz?: boolean } = {};
// Only Google GenAI is supported now
let provider: 'google' = 'google';

const MODEL_FLASH = 'gemini-flash-latest';
const MODEL_FLASH_PRIMARY = 'ggemini-flash-latest';
const MODEL_FLASH_BACKUP1 = 'gemini-flash-latest';
const MODEL_FLASH_BACKUP2 = 'gemini-flash-latest';

export function getGenAIFallbackUsed(): boolean {
  return !!(quotaWarned.flash || quotaWarned.quiz);
}

export function initGenAI(apiKey: string) {
  if (!apiKey) throw new Error('GenAI API key required for initialization');
  provider = 'google';
  ai = new GoogleGenAI({ apiKey });
}
function isRateLimitError(error: any): boolean {
  const msg = String((error && (error.error?.message || error.message)) || '');
  const status = String((error && (error.error?.status || error.status)) || '');
  return msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429') || status.includes('RESOURCE_EXHAUSTED');
}

// -------------------------
// Local fallback generators
// -------------------------
function splitSentences(text: string): string[] {
  return (text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[\.\!\?。！？])\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 20);
}

function truncateWords(s: string, max = 8): string {
  const parts = s.split(' ');
  return parts.length <= max ? s : parts.slice(0, max).join(' ') + '…';
}

function pickDistinct(items: string[], count: number, exclude?: string): string[] {
  const pool = items.filter(x => x && x !== exclude);
  const out: string[] = [];
  for (const s of pool) {
    if (out.length >= count) break;
    if (!out.includes(s)) out.push(s);
  }
  return out.slice(0, count);
}

function fallbackFlashcardsFromText(transcriptText: string): Flashcard[] {
  const sentences = splitSentences(transcriptText);
  if (!sentences.length) return [];
  const take = Math.min(15, sentences.length);
  const selected = sentences.slice(0, take);
  const cards = selected.map(s => ({ front: truncateWords(s, 8), back: s }));
  const deduped = sanitizeAndDedupFlashcards(cards);
  return ensureFlashcardCount(deduped, 15, sentences);
}

function fallbackQuizFromText(transcriptText: string): QuizQuestion[] {
  const sentences = splitSentences(transcriptText);
  if (!sentences.length) return [];
  const take = Math.min(10, sentences.length);
  const selected = sentences.slice(0, take);
  const initial = selected.map((correct) => {
    const distractorsPool = sentences.filter(s => s !== correct);
    const distractors = pickDistinct(distractorsPool, 3);
    const options = [correct, ...distractors];
    // simple shuffle
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return {
      question: 'Theo nội dung, điều nào đúng nhất?',
      options,
      correctAnswer: correct,
    };
  });
  const deduped = sanitizeAndDedupQuiz(initial);
  return ensureQuizCount(deduped, 10, sentences);
}

// -------------------------
// Post-processing to enforce counts
// -------------------------
function ensureFlashcardCount(cards: Flashcard[], target: number, sentences: string[]): Flashcard[] {
  const out = sanitizeAndDedupFlashcards(cards);
  let idx = 0;
  while (out.length < target && sentences.length > 0) {
    const s = sentences[idx % sentences.length];
    const parts = s.split(/[,;:\-]+/).map(p => p.trim()).filter(Boolean);
    const candidate = parts.length > 1 ? parts[0] : truncateWords(s, 8);
    out.push({ front: candidate, back: s });
    // re-dedup in case padding introduced near-duplicates
    const tmp = sanitizeAndDedupFlashcards(out);
    out.length = 0; out.push(...tmp);
    idx++;
  }
  return out.slice(0, target);
}

function ensureQuizCount(quiz: QuizQuestion[], target: number, sentences: string[]): QuizQuestion[] {
  const out = sanitizeAndDedupQuiz(quiz);
  let idx = 0;
  while (out.length < target && sentences.length > 0) {
    const correct = sentences[idx % sentences.length];
    const distractors = pickDistinct(sentences.filter(s => s !== correct), 3);
    const options = [correct, ...distractors];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    out.push({
      question: 'Chọn đáp án đúng theo nội dung transcript:',
      options,
      correctAnswer: correct,
    });
    // re-dedup to avoid near-identical questions
    const tmp = sanitizeAndDedupQuiz(out);
    out.length = 0; out.push(...tmp);
    idx++;
  }
  return out.slice(0, target);
}

export const generateSummary = async (
  transcriptText: string,
  language: Language,
  length: SummaryLength = 'medium'
): Promise<string> => {
  if (!transcriptText) return 'No content to summarize.';
  if (!ai) throw new Error('GenAI client not initialized. Call initGenAI(apiKey) first.');

  const langInstruction = language === 'vi' ? 'Vietnamese' : 'English';

  let lengthInstruction = '';
  switch (length) {
    case 'short':
      lengthInstruction = 'Keep the summary concise, focusing only on the high-level purpose and outcomes. Limit to around 150-200 words.';
      break;
    case 'long':
      lengthInstruction = 'Provide a comprehensive and detailed summary. Include specific examples mentioned, nuance in the discussion, and cover all minor topics. Length should be substantial (over 500 words).';
      break;
    case 'medium':
    default:
      lengthInstruction = 'Provide a standard summary that balances detail with brevity. Aim for around 300-400 words.';
      break;
  }

  try {
    const prompt = `You are an expert educational assistant.\nSummarize the following meeting/lecture transcript in ${langInstruction}.\n\n${lengthInstruction}\n\nGrounding rules:\n- Base the summary strictly on the transcript; do not speculate.\n- Use concise, neutral phrasing and avoid generic filler.\n- If no action items exist, state "None" for that section.\n- Do NOT use asterisks (*) for bullets; use hyphens (-) or numbered lists instead.\n\nPlease structure your response using the following Markdown format:\n\n## Executive Summary\n(1 short paragraph overview)\n\n## Key Takeaways\n(3–6 concise bullets, transcript-grounded, each starting with "- ")\n\n## Main Arguments & Discussion Points\n(Bulleted list of core points; keep bullets short, each starting with "- ")\n\n## Action Items\n(- Task — Assignee) or "None"\n\nTranscript:\n${transcriptText}`;

    const response = await ai.models.generateContent({ model: MODEL_FLASH, contents: prompt });
    return response?.text || 'Failed to generate summary.';
  } catch (error) {
    console.error('Summary Error:', error);
    return 'Error generating summary. Please check your API configuration.';
  }
};

export const generateMeetingInsights = async (transcriptText: string, language: Language): Promise<MeetingInsights | null> => {
  if (!transcriptText) return null;
  if (!ai) throw new Error('GenAI client not initialized. Call initGenAI(apiKey) first.');
  const langInstruction = language === 'vi' ? 'Vietnamese' : 'English';

  try {
    const prompt = `You are a rigorous meeting analyst.\nAnalyze the transcript and output ONLY JSON that strictly matches the provided schema.\nRespond in ${langInstruction}. Do not include markdown or any text outside JSON.\n\nGrounding rules:\n- Base all outputs strictly on the transcript; do not speculate.\n- If no items are present, use empty arrays.\n- Use integers for scores (0–100).\n\nGuidelines:\n1) overallScore: holistic 0–100 considering clarity, engagement, productivity (round to integer).\n2) agendaCoverage: estimate 0–100 of how fully planned topics were covered.\n3) agendaExplanation: 1–2 sentences explaining the coverage rationale.\n4) actionItems: concrete tasks with optional assignees (may be empty).\n5) topics: 3–8 dominant topics with relevance 0–100.\n\nTranscript:\n${transcriptText}`;

    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER, description: 'Score from 0 to 100' },
            agendaCoverage: { type: Type.NUMBER, description: 'Percentage 0 to 100' },
            agendaExplanation: { type: Type.STRING },
            actionItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  task: { type: Type.STRING },
                  assignee: { type: Type.STRING }
                }
              }
            },
            topics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  relevance: { type: Type.NUMBER }
                }
              }
            }
          },
          required: ['overallScore', 'agendaCoverage', 'agendaExplanation', 'actionItems', 'topics']
        }
      }
    });
    const jsonStr = response?.text || '';
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr) as MeetingInsights;
    } catch (err) {
      // fallback: try to parse first JSON-looking substring
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]) as MeetingInsights;
      }
      return null;
    }
  } catch (error) {
    console.error('Insights Error:', error);
    return null;
  }
};

export const generateFlashcards = async (transcriptText: string, language: Language): Promise<Flashcard[]> => {
  if (!transcriptText) return [];
  if (!ai) {
    // No AI client: use local fallback
    return fallbackFlashcardsFromText(transcriptText);
  }

  const langInstruction = language === 'vi' ? 'Vietnamese' : 'English';

  try {
    const prompt = `You are an expert educator.
  Create up to 15 high-quality study flashcards in ${langInstruction} based strictly on the transcript below.

Requirements:
  - Front: clear question or key term (short, specific).
  - Back: concise answer (1–2 sentences) with the essential detail.

Output:

Transcript:
${transcriptText}`;

    const response = await ai.models.generateContent({
      model: MODEL_FLASH_PRIMARY,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING, description: 'Concept or question' },
              back: { type: Type.STRING, description: 'Definition or answer' }
            },
            required: ['front', 'back']
          }
        }
      }
    });
    const jsonStr = response?.text || '[]';
    const parsed = JSON.parse(jsonStr) as Flashcard[];
    const cleaned = sanitizeAndDedupFlashcards(parsed);
    return ensureFlashcardCount(cleaned, 15, splitSentences(transcriptText));
  } catch (error) {
    // Try backups sequentially (handles 429 and 404 NOT_FOUND)
    for (const model of [MODEL_FLASH_BACKUP1, MODEL_FLASH_BACKUP2]) {
      try {
        const prompt = `You are an expert educator.
  Create up to 15 high-quality study flashcards in ${langInstruction} based strictly on the transcript below.

Requirements:
  - Front: clear question or key term (short, specific).
  - Back: concise answer (1–2 sentences) with the essential detail.

Output:

Transcript:
${transcriptText}`;
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING },
                  back: { type: Type.STRING }
                },
                required: ['front', 'back']
              }
            }
          }
        });
        const jsonStr = response?.text || '[]';
        const parsed = JSON.parse(jsonStr) as Flashcard[];
        const cleaned = sanitizeAndDedupFlashcards(parsed);
        return ensureFlashcardCount(cleaned, 15, splitSentences(transcriptText));
      } catch (err2) {
        // continue to next model
      }
    }
    // eslint-disable-next-line no-console
    if (!quotaWarned.flash) {
      console.warn('Flashcard AI Error (fallback to local):', error);
      quotaWarned.flash = true;
    }
    return fallbackFlashcardsFromText(transcriptText);
  }
};

export const generateQuiz = async (transcriptText: string, language: Language): Promise<QuizQuestion[]> => {
  if (!transcriptText) return [];
  if (!ai) {
    return fallbackQuizFromText(transcriptText);
  }

  const langInstruction = language === 'vi' ? 'Vietnamese' : 'English';

  try {
    const prompt = `You are an expert assessment designer specializing in creating focused, high-quality quizzes.

Create approximately 10 multiple-choice questions in ${langInstruction} based strictly on the transcript below.

CRITICAL REQUIREMENTS:
  - Focus on the MOST IMPORTANT and CORE concepts from the transcript (trọng tâm).
  - Prioritize key facts, main arguments, critical decisions, and essential information.
  - Avoid trivial details or peripheral information.
  - Each question must test understanding of significant content, not minor mentions.
  
QUESTION QUALITY:
  - Each question should be meaningful, precise, and test real comprehension.
  - Limit each question to 15–20 words maximum (short and clear).
  - Provide exactly 4 options per question.
  - The correctAnswer must exactly match one of the options.
  - Include an optional explanation field that clarifies why the correct answer is right.

STRATEGY:
  - Identify the main topics, key points, and critical information in the transcript.
  - Create questions that cover these core areas comprehensively.
  - Ensure questions are distributed across different important topics.
  - Aim for exactly 10 questions (or as close as possible) focusing on the most important content.

Output must be strict JSON matching the schema.

Transcript:
${transcriptText}`;

    const response = await ai.models.generateContent({
      model: MODEL_FLASH_PRIMARY,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Array of 4 possible answers' },
              correctAnswer: { type: Type.STRING, description: 'The correct answer text, must match one of the options exactly' },
              explanation: { type: Type.STRING, description: 'Optional explanation of why the correct answer is right' }
            },
            required: ['question', 'options', 'correctAnswer']
          }
        }
      }
    });
    const jsonStr = response?.text || '[]';
    const parsed = JSON.parse(jsonStr) as QuizQuestion[];
    const cleaned = sanitizeAndDedupQuiz(parsed);
    return ensureQuizCount(cleaned, 10, splitSentences(transcriptText));
  } catch (error) {
    for (const model of [MODEL_FLASH_BACKUP1, MODEL_FLASH_BACKUP2]) {
      try {
        const prompt = `You are an expert assessment designer specializing in creating focused, high-quality quizzes.

Create approximately 10 multiple-choice questions in ${langInstruction} based strictly on the transcript below.

CRITICAL REQUIREMENTS:
  - Focus on the MOST IMPORTANT and CORE concepts from the transcript (trọng tâm).
  - Prioritize key facts, main arguments, critical decisions, and essential information.
  - Avoid trivial details or peripheral information.
  - Each question must test understanding of significant content, not minor mentions.
  
QUESTION QUALITY:
  - Each question should be meaningful, precise, and test real comprehension.
  - Limit each question to 15–20 words maximum (short and clear).
  - Provide exactly 4 options per question.
  - The correctAnswer must exactly match one of the options.
  - Include an optional explanation field that clarifies why the correct answer is right.

STRATEGY:
  - Identify the main topics, key points, and critical information in the transcript.
  - Create questions that cover these core areas comprehensively.
  - Ensure questions are distributed across different important topics.
  - Aim for exactly 10 questions (or as close as possible) focusing on the most important content.

Output must be strict JSON matching the schema.

Transcript:
${transcriptText}`;
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING, description: 'Optional explanation of why the correct answer is right' }
                },
                required: ['question', 'options', 'correctAnswer']
              }
            }
          }
        });
        const jsonStr = response?.text || '[]';
        const parsed = JSON.parse(jsonStr) as QuizQuestion[];
        const cleaned = sanitizeAndDedupQuiz(parsed);
        return ensureQuizCount(cleaned, 10, splitSentences(transcriptText));
      } catch (err2) {
        // continue to next model
      }
    }
    // eslint-disable-next-line no-console
    if (!quotaWarned.quiz) {
      console.warn('Quiz AI Error (fallback to local):', error);
      quotaWarned.quiz = true;
    }
    return fallbackQuizFromText(transcriptText);
  }
};

// -------------------------
// Validation & de-dup helpers
// -------------------------
function normalizeText(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\.,;:!?"'\-–—()\[\]]/g, '')
    .trim();
}

function sanitizeAndDedupFlashcards(cards: Flashcard[]): Flashcard[] {
  const out: Flashcard[] = [];
  const seen = new Set<string>();
  for (const c of cards) {
    const front = (c.front || '').trim();
    const back = (c.back || '').trim();
    if (!front || !back) continue;
    // relax minimal meaningful length to allow more fallbacks: front >= 2 words, back >= 5 words
    const frontWords = front.split(/\s+/).filter(Boolean);
    const backWords = back.split(/\s+/).filter(Boolean);
    if (frontWords.length < 2 || backWords.length < 5) continue;
    // discard trivially identical front/back
    if (normalizeText(front) === normalizeText(back)) continue;
    const key = normalizeText(front);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ front, back });
  }
  return out;
}

function sanitizeAndDedupQuiz(items: QuizQuestion[]): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  const seen = new Set<string>();
  for (const q of items) {
    let question = (q.question || '').trim();
    const options = Array.isArray(q.options) ? q.options.map(o => o.trim()).filter(Boolean) : [];
    const correct = (q.correctAnswer || '').trim();
    if (!question || options.length < 2 || !correct) continue;
    // cap question length to ~20 words while keeping meaning
    const words = question.split(/\s+/);
    if (words.length > 20) {
      question = words.slice(0, 20).join(' ');
    }
    // correct must match one of options exactly (case-insensitive compare)
    const hasExact = options.some(o => normalizeText(o) === normalizeText(correct));
    if (!hasExact) continue;
    // dedup by normalized question text
    const key = normalizeText(question);
    if (seen.has(key)) continue;
    seen.add(key);
    // enforce max 4 options, unique
    const uniq: string[] = [];
    const optSeen = new Set<string>();
    for (const o of options) {
      const k = normalizeText(o);
      if (optSeen.has(k)) continue;
      optSeen.add(k);
      uniq.push(o);
      if (uniq.length >= 4) break;
    }
    // if correct dropped by dedup, reinsert it at random position
    if (!uniq.some(o => normalizeText(o) === normalizeText(correct))) {
      if (uniq.length >= 4) uniq.pop();
      const pos = Math.min(uniq.length, Math.floor(Math.random() * (uniq.length + 1)));
      uniq.splice(pos, 0, correct);
    }
    out.push({ question, options: uniq, correctAnswer: correct });
  }
  return out;
}

export const chatWithTranscript = async (
  history: { role: 'user' | 'model'; text: string }[],
  currentMessage: string,
  context: string,
  language: Language
): Promise<string> => {
  if (!ai) throw new Error('GenAI client not initialized. Call initGenAI(apiKey) first.');
  try {
    const langInstruction = language === 'vi' ? 'Vietnamese' : 'English';
    const systemInstruction = `You are a helpful teaching assistant. You have access to the following meeting transcript. Answer the user's questions based primarily on this transcript. Respond in ${langInstruction}.\n\nFormatting rules:\n- Do NOT use asterisks (*) for bullets.\n- If you need lists, use hyphens (-) or numbered lists (1., 2., 3.).\n\nTranscript Context:\n${context}`;
    const chat = ai.chats.create({ model: MODEL_FLASH, config: { systemInstruction } });
    if (Array.isArray(history) && history.length) {
      for (const h of history) {
        await chat.addMessage({ role: h.role, content: h.text });
      }
    }
    const result = await chat.sendMessage({ message: currentMessage });
    return result?.text || "I couldn't generate a response.";
  } catch (error) {
    console.error('Chat Error:', error);
    return 'Sorry, I encountered an error connecting to the AI.';
  }
};

// Note: TTS/audio output is intentionally omitted — use `expo-av` or native modules when needed.