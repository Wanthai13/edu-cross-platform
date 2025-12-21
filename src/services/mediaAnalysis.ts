import { GoogleGenAI, Type } from '@google/genai';
import Constants from 'expo-constants';

// Types matching the expected JSON schema from the prompt
export type AnalysisResult = {
  summary: string;
  transcript: Array<{ speaker: string; time: string; text: string }>;
  agenda: Array<{ topic: string; duration?: string; status: 'covered' | 'pending' | 'skipped' }>;
  meetingScore: number;
  keywords: string[];
  actionItems: Array<{ assignee?: string; task: string; deadline?: string }>;
  speakerStats: Array<{ name: string; percentage: number }>;
  quiz: Array<{ question: string; options: string[]; correctAnswer: number }>;
  flashcards: Array<{ front: string; back: string }>;
};

const getApiKey = (): string => {
  const fromExtra = (Constants.expoConfig?.extra as any)?.GENAI_API_KEY;
  const fromEnv = (typeof process !== 'undefined' && process.env) ? (process.env.GENAI_API_KEY || process.env.API_KEY) : '';
  return (fromExtra || fromEnv || '').toString();
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export const fileToGenerativePart = async (
  file: any
): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const Reader: any = (global as any).FileReader || (typeof FileReader !== 'undefined' ? FileReader : null);
    if (!Reader) {
      reject(new Error('FileReader is not available in this environment.'));
      return;
    }
    const reader = new Reader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.includes(',') ? base64String.split(',')[1] : base64String;
      const mimeType = (file && file.type) || 'application/octet-stream';
      resolve({ inlineData: { data: base64Data, mimeType } });
    };
    reader.onerror = reject;
    try {
      reader.readAsDataURL(file);
    } catch (err) {
      reject(err);
    }
  });
};

export const analyzeMediaContent = async (mediaFile: any): Promise<AnalysisResult> => {
  const mediaPart = await fileToGenerativePart(mediaFile);

  const prompt = `Bạn là một trợ lý AI giáo dục chuyên nghiệp. Nhiệm vụ của bạn là phân tích file âm thanh/video được cung cấp từ một bài giảng hoặc cuộc họp.\n\nHãy thực hiện các yêu cầu sau và trả về kết quả dưới dạng JSON (không dùng Markdown code block, chỉ trả về JSON thuần):\n\n1. **Transcript**: Chuyển đổi giọng nói thành văn bản. Xác định người nói (Ví dụ: Speaker A, Speaker B hoặc Giảng viên, Sinh viên dựa trên ngữ cảnh). Kèm theo timestamp (MM:SS).\n2. **Summary**: Tóm tắt nội dung chính của buổi học/họp (khoảng 150 từ).\n3. **Agenda**: Trích xuất các chủ đề chính đã được thảo luận và trạng thái (covered).\n4. **Meeting Score**: Chấm điểm hiệu quả buổi học/họp trên thang 100 dựa trên: độ bao phủ nội dung, sự tương tác, và action items rõ ràng.\n5. **Keywords**: 5-7 từ khóa quan trọng nhất.\n6. **Action Items**: Các nhiệm vụ cần làm, người thực hiện (nếu có).\n7. **Speaker Stats**: Ước lượng phần trăm đóng góp của mỗi người nói (tổng 100%).\n8. **Quiz**: Tạo 3 câu hỏi trắc nghiệm (multiple choice) để ôn tập kiến thức trong bài.\n9. **Flashcards**: Tạo 3 thẻ ghi nhớ (thuật ngữ/định nghĩa) từ nội dung.\n\nLưu ý quan trọng:\n- Ngôn ngữ đầu ra: Tiếng Việt.\n- Timestamp format: \"MM:SS\".\n- JSON Structure phải khớp chính xác với schema yêu cầu.`;

  const response = await ai.models.generateContent({
    model: 'gemini-flash-latest',
    contents: {
      parts: [mediaPart as any, { text: prompt } as any]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          transcript: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                speaker: { type: Type.STRING },
                time: { type: Type.STRING },
                text: { type: Type.STRING }
              }
            }
          },
          agenda: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                duration: { type: Type.STRING },
                status: { type: Type.STRING, enum: ['covered', 'pending', 'skipped'] }
              }
            }
          },
          meetingScore: { type: Type.NUMBER },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          actionItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                assignee: { type: Type.STRING },
                task: { type: Type.STRING },
                deadline: { type: Type.STRING }
              }
            }
          },
          speakerStats: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                percentage: { type: Type.NUMBER }
              }
            }
          },
          quiz: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.NUMBER }
              }
            }
          },
          flashcards: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING },
                back: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  const resultText = (response as any).text as string | undefined;
  if (!resultText) throw new Error('Không nhận được phản hồi từ AI.');
  return JSON.parse(resultText) as AnalysisResult;
};

export const chatWithContext = async (
  history: { role: string; parts: [{ text: string }] }[],
  question: string,
  context: string
): Promise<string> => {
  const chat = ai.chats.create({
    model: 'gemini-flash-latest',
    config: {
      systemInstruction: `Bạn là trợ lý ảo hỗ trợ học tập. Hãy trả lời câu hỏi dựa trên nội dung transcript sau đây:\n\n${context}\n\nNếu thông tin không có trong transcript, hãy nói rõ. Trả lời ngắn gọn, súc tích bằng Tiếng Việt.`
    },
    history
  });

  const result = await chat.sendMessage({ message: question });
  return (result as any).text || 'Tôi không thể trả lời lúc này.';
};