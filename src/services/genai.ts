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

export function initGenAI(apiKey: string) {
  if (!apiKey) throw new Error('GenAI API key required for initialization');
  ai = new GoogleGenAI({ apiKey });
}

const MODEL_FLASH = 'gemini-2.5-flash';

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
    const prompt = `You are an expert educational assistant.\nSummarize the following meeting/lecture transcript in ${langInstruction}.\n\n${lengthInstruction}\n\nPlease structure your response using the following Markdown format:\n\n## Executive Summary\n(A paragraph overview of the session)\n\n## Key Takeaways\n(A bulleted list of the most important lessons or conclusions)\n\n## Main Arguments & Discussion Points\n(A detailed breakdown of the core topics discussed, using sub-bullets if necessary)\n\n## Action Items\n(Any tasks, assignments, or follow-ups mentioned. If none, omit this section.)\n\nTranscript:\n${transcriptText}`;

    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
    });

    return response?.text || 'Failed to generate summary.';
  } catch (error) {
    // keep logging simple so RN console shows it
    // eslint-disable-next-line no-console
    console.error('Gemini Summary Error:', error);
    return 'Error generating summary. Please check your API configuration.';
  }
};

export const generateMeetingInsights = async (transcriptText: string, language: Language): Promise<MeetingInsights | null> => {
  if (!transcriptText) return null;
  if (!ai) throw new Error('GenAI client not initialized. Call initGenAI(apiKey) first.');
  const langInstruction = language === 'vi' ? 'Vietnamese' : 'English';

  try {
    const prompt = `Analyze the following transcript and provide a structured meeting analysis in ${langInstruction}.\n\n1. Calculate an 'overallScore' (0-100) based on clarity, engagement, and productivity.\n2. Estimate 'agendaCoverage' (0-100).\n3. Provide a short 'agendaExplanation'.\n4. Extract 'actionItems' (task and assignee).\n5. Identify key 'topics' and their 'relevance' (0-100).\n\nTranscript:\n${transcriptText}`;

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

    const jsonStr = response?.text;
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
    // eslint-disable-next-line no-console
    console.error('Gemini Insights Error:', error);
    return null;
  }
};

export const generateFlashcards = async (transcriptText: string, language: Language): Promise<Flashcard[]> => {
  if (!transcriptText) return [];
  if (!ai) throw new Error('GenAI client not initialized. Call initGenAI(apiKey) first.');

  const langInstruction = language === 'vi' ? 'Vietnamese' : 'English';

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: `Create 5 study flashcards based on the key concepts in this transcript. The content must be in ${langInstruction}. Return strictly JSON.`,
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
    return JSON.parse(jsonStr) as Flashcard[];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Gemini Flashcard Error:', error);
    return [];
  }
};

export const generateQuiz = async (transcriptText: string, language: Language): Promise<QuizQuestion[]> => {
  if (!transcriptText) return [];
  if (!ai) throw new Error('GenAI client not initialized. Call initGenAI(apiKey) first.');

  const langInstruction = language === 'vi' ? 'Vietnamese' : 'English';

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: `Create a multiple-choice quiz with 3 questions based on this transcript. The content must be in ${langInstruction}. Return strictly JSON.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Array of 4 possible answers' },
              correctAnswer: { type: Type.STRING, description: 'The correct answer text, must match one of the options exactly' }
            },
            required: ['question', 'options', 'correctAnswer']
          }
        }
      }
    });

    const jsonStr = response?.text || '[]';
    return JSON.parse(jsonStr) as QuizQuestion[];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Gemini Quiz Error:', error);
    return [];
  }
};

export const chatWithTranscript = async (
  history: { role: 'user' | 'model'; text: string }[],
  currentMessage: string,
  context: string,
  language: Language
): Promise<string> => {
  if (!ai) throw new Error('GenAI client not initialized. Call initGenAI(apiKey) first.');
  try {
    const langInstruction = language === 'vi' ? 'Vietnamese' : 'English';
    const systemInstruction = `You are a helpful teaching assistant. You have access to the following meeting transcript. Answer the user's questions based primarily on this transcript. Respond in ${langInstruction}.\n\nTranscript Context:\n${context}`;

    const chat = ai.chats.create({
      model: MODEL_FLASH,
      config: { systemInstruction }
    });

    // feed history (if present)
    if (Array.isArray(history) && history.length) {
      for (const h of history) {
        await chat.addMessage({ role: h.role, content: h.text });
      }
    }

    const result = await chat.sendMessage({ message: currentMessage });
    return result?.text || "I couldn't generate a response.";
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Gemini Chat Error:', error);
    return 'Sorry, I encountered an error connecting to the AI.';
  }
};

// Note: TTS/audio output is intentionally omitted — use `expo-av` or native modules when needed.
