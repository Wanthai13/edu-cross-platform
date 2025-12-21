import StudyZone from '@/src/components/StudyZone';
import { audioService } from '@/src/services/audioService';
import { transcriptService } from '@/src/services/transcriptService';
import { transcriptEvents } from '@/src/utils/transcriptEvents';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

type Flashcard = {
  id: string;
  front: string;
  back: string;
};

type Quiz = {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
};

type Materials = {
  flashcards: Flashcard[];
  quizzes: Quiz[];
};

type Language = 'vi' | 'en';

interface AgendaItem {
  id: string;
  title: string;
  topics: string[];
  duration?: number;
  score?: {
    clarity: number;
    completeness: number;
    engagement: number;
    structure: number;
    actionability: number;
  };
  overallScore?: number;
  strengths?: string[];
  improvements?: string[];
}

interface AnalysisData {
  totalScore: number;
  agenda: AgendaItem[];
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  timeUtilization: {
    productive: number;
    offtopic: number;
    discussion: number;
  };
}

// Google Generative AI service
const geminiService = {
  // Prefer env-based config; fall back to Expo extra if needed
  apiKey:
    (process.env as any)?.EXPO_PUBLIC_GENAI_API_KEY ||
    (process.env as any)?.GENAI_API_KEY ||
    (Constants.expoConfig?.extra as any)?.GENAI_API_KEY ||
    (Constants.expoConfig?.extra as any)?.GEMINI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/models',

  async callAPI(prompt: string, systemInstruction: string, useJSON: boolean = true) {
    const model = 'gemini-1.5-flash-latest';
    const url = `${this.baseURL}/${model}:generateContent?key=${this.apiKey}`;

    const body: any = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    };

    if (useJSON) {
      body.generationConfig.responseMimeType = 'application/json';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  },

  async generateFlashcards(text: string, language: Language, count: number = 10): Promise<Flashcard[]> {
    const prompt = language === 'vi'
      ? `Tạo ${count} flashcards từ nội dung sau:\n\n${text}`
      : `Create ${count} flashcards from the following content:\n\n${text}`;

    const systemInstruction = language === 'vi'
      ? 'Bạn là trợ lý giáo dục. Tạo flashcards dưới dạng JSON với format: {"flashcards": [{"front": "câu hỏi", "back": "câu trả lời"}]}'
      : 'You are an educational assistant. Create flashcards in JSON format: {"flashcards": [{"front": "question", "back": "answer"}]}';

    const content = await this.callAPI(prompt, systemInstruction, true);
    const parsed = JSON.parse(content);
    const flashcards = parsed.flashcards || parsed.items || [];
    return Array.isArray(flashcards) ? flashcards : [];
  },

  async generateQuiz(text: string, language: Language, count: number = 5): Promise<any[]> {
    const prompt = language === 'vi'
      ? `Tạo ${count} câu hỏi trắc nghiệm từ nội dung sau:\n\n${text}`
      : `Create ${count} multiple choice questions from the following content:\n\n${text}`;

    const systemInstruction = language === 'vi'
      ? 'Bạn là trợ lý giáo dục. Tạo quiz dưới dạng JSON: {"quizzes": [{"question": "câu hỏi", "options": ["A", "B", "C", "D"], "correctAnswer": "đáp án đúng"}]}'
      : 'You are an educational assistant. Create quiz in JSON format: {"quizzes": [{"question": "question", "options": ["A", "B", "C", "D"], "correctAnswer": "correct answer"}]}';

    const content = await this.callAPI(prompt, systemInstruction, true);
    const parsed = JSON.parse(content);
    const quizzes = parsed.quizzes || parsed.questions || [];
    return Array.isArray(quizzes) ? quizzes : [];
  },

  async generateSummary(text: string, language: Language): Promise<string> {
    const prompt = language === 'vi'
      ? `Tóm tắt nội dung sau thành 200-300 từ:\n\n${text}`
      : `Summarize the following content in 200-300 words:\n\n${text}`;

    const systemInstruction = 'You are a helpful assistant that creates concise summaries.';

    return await this.callAPI(prompt, systemInstruction, false);
  },

  async generateInsights(text: string, language: Language): Promise<any> {
    const prompt = language === 'vi'
      ? `Phân tích nội dung sau và trích xuất các điểm chính, hành động cần làm, và câu hỏi mở:\n\n${text}`
      : `Analyze the following content and extract key points, action items, and open questions:\n\n${text}`;

    const systemInstruction = language === 'vi'
      ? 'Bạn là trợ lý phân tích. Trả về JSON: {"key_points": [], "action_items": [], "open_questions": []}'
      : 'You are an analytical assistant. Return JSON: {"key_points": [], "action_items": [], "open_questions": []}';

    const content = await this.callAPI(prompt, systemInstruction, true);
    return JSON.parse(content);
  },

  async extractAgenda(text: string, language: Language): Promise<AgendaItem[]> {
    const prompt = language === 'vi'
      ? `Phân tích transcript và trích xuất các chủ đề chính (agenda):\n\n${text}`
      : `Analyze transcript and extract main topics (agenda):\n\n${text}`;

    const systemInstruction = language === 'vi'
      ? 'Bạn là chuyên gia phân tích transcript. Trả về JSON: {"agenda": [{"title": "Chủ đề", "topics": ["topic 1", "topic 2"], "duration": 15}]}'
      : 'You are a transcript analysis expert. Return JSON: {"agenda": [{"title": "Topic", "topics": ["topic 1", "topic 2"], "duration": 15}]}';

    const content = await this.callAPI(prompt, systemInstruction, true);
    const parsed = JSON.parse(content);
    const agenda = parsed.agenda || [];
    return agenda.map((item: any, index: number) => ({
      id: `agenda_${index + 1}`,
      title: item.title || `Topic ${index + 1}`,
      topics: item.topics || [],
      duration: item.duration || null
    }));
  },

  async scoreAgendaItem(agendaItem: AgendaItem, text: string, language: Language): Promise<AgendaItem> {
    const prompt = language === 'vi'
      ? `Đánh giá chất lượng phần "${agendaItem.title}" và cho điểm 0-100 cho các tiêu chí:\n\nNội dung: ${text}`
      : `Evaluate section "${agendaItem.title}" and score 0-100 for each criterion:\n\nContent: ${text}`;

    const systemInstruction = language === 'vi'
      ? 'Bạn là chuyên gia đánh giá. Trả về JSON: {"clarity": 85, "completeness": 75, "engagement": 80, "structure": 90, "actionability": 70, "strengths": ["điểm mạnh"], "improvements": ["cải thiện"]}'
      : 'You are an evaluation expert. Return JSON: {"clarity": 85, "completeness": 75, "engagement": 80, "structure": 90, "actionability": 70, "strengths": ["strength"], "improvements": ["improvement"]}';

    const content = await this.callAPI(prompt, systemInstruction, true);
    const parsed = JSON.parse(content);
    const score = {
      clarity: parsed.clarity || 50,
      completeness: parsed.completeness || 50,
      engagement: parsed.engagement || 50,
      structure: parsed.structure || 50,
      actionability: parsed.actionability || 50
    };

    const overallScore = Math.round(
      (score.clarity + score.completeness + score.engagement + score.structure + score.actionability) / 5
    );

    return {
      ...agendaItem,
      score,
      overallScore,
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || []
    };
  },

  async analyzeOverall(text: string, language: Language): Promise<AnalysisData> {
    // 1. Extract agenda
    const agenda = await this.extractAgenda(text, language);
    
    // 2. Score each agenda item
    const scoredAgenda: AgendaItem[] = [];
    const textPerAgenda = Math.ceil(text.length / Math.max(agenda.length, 1));
    
    for (let i = 0; i < agenda.length; i++) {
      const startIdx = i * textPerAgenda;
      const endIdx = Math.min((i + 1) * textPerAgenda, text.length);
      const segment = text.substring(startIdx, endIdx);
      
      const scored = await this.scoreAgendaItem(agenda[i], segment, language);
      scoredAgenda.push(scored);
      
      if (i < agenda.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 3. Calculate overall score
    const totalScore = scoredAgenda.length > 0
      ? Math.round(scoredAgenda.reduce((sum, item) => sum + (item.overallScore || 50), 0) / scoredAgenda.length)
      : 50;

    // 4. Generate summary and recommendations
    const summaryPrompt = language === 'vi'
      ? `Dựa trên điểm số các phần, tạo tóm tắt tổng quan:\n\n${scoredAgenda.map(a => `- ${a.title}: ${a.overallScore}/100`).join('\n')}`
      : `Based on section scores, create an overview:\n\n${scoredAgenda.map(a => `- ${a.title}: ${a.overallScore}/100`).join('\n')}`;

    const summaryInstruction = language === 'vi'
      ? 'Bạn là chuyên gia phân tích. Trả về JSON: {"summary": "Tóm tắt", "keyFindings": ["phát hiện"], "recommendations": ["khuyến nghị"], "timeUtilization": {"productive": 70, "offtopic": 10, "discussion": 20}}'
      : 'You are an analysis expert. Return JSON: {"summary": "Summary", "keyFindings": ["finding"], "recommendations": ["recommendation"], "timeUtilization": {"productive": 70, "offtopic": 10, "discussion": 20}}';

    const summaryContent = await this.callAPI(summaryPrompt, summaryInstruction, true);
    const summaryParsed = JSON.parse(summaryContent);

    return {
      totalScore,
      agenda: scoredAgenda,
      summary: summaryParsed.summary || '',
      keyFindings: summaryParsed.keyFindings || [],
      recommendations: summaryParsed.recommendations || [],
      timeUtilization: summaryParsed.timeUtilization || { productive: 70, offtopic: 10, discussion: 20 }
    };
  },

  async quickScore(text: string, language: Language): Promise<number> {
    const prompt = language === 'vi'
      ? `Đánh giá tổng thể chất lượng buổi học/họp từ 0-100. Chỉ trả về 1 số.\n\n${text.substring(0, 4000)}`
      : `Rate overall quality from 0-100. Return only a number.\n\n${text.substring(0, 4000)}`;

    const systemInstruction = 'You are an expert evaluator. Respond with only a number from 0-100.';

    const content = await this.callAPI(prompt, systemInstruction, false);
    const score = parseInt(content.trim());
    return isNaN(score) ? 50 : Math.max(0, Math.min(100, score));
  }
};

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

function getScoreLabel(score: number, language: Language): string {
  if (language === 'vi') {
    if (score >= 90) return 'Xuất sắc';
    if (score >= 80) return 'Tốt';
    if (score >= 70) return 'Khá';
    if (score >= 60) return 'Trung bình';
    return 'Yếu';
  } else {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Average';
    return 'Below Average';
  }
}

export default function StudyScreen() {
  const { colors, isDark } = useTheme();
  const { t, language: appLanguage } = useLanguage();
  
  const [materials, setMaterials] = useState<Materials | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = useLocalSearchParams<{ id?: string }>();
  const ranKeyRef = useRef<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [insights, setInsights] = useState<any | null>(null);
  const [sessions, setSessions] = useState<Array<{ _id: string; title?: string; createdAt?: string; fullText?: string; language?: string }>>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'materials' | 'scoring'>('materials');
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [language, setLanguage] = useState<Language>('vi');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [scoringMode, setScoringMode] = useState<'quick' | 'detailed' | null>(null);
  const [scoringLoading, setScoringLoading] = useState(false);
  const hasGenAiKey = !!geminiService.apiKey;

  // Load sessions function
  const loadSessions = useCallback(async () => {
    try {
      console.log('🔵 StudyScreen: Loading sessions...');
      const transcripts = await transcriptService.fetchTranscripts();
      const items = (transcripts || []).map((t: any) => ({
        _id: t._id,
        title: t.title || 'Untitled',
        createdAt: t.createdAt,
        fullText: t.fullText,
        language: t.language
      }));
      setSessions(items);
      console.log('✅ StudyScreen: Loaded', items.length, 'sessions');
      
      // Only set initial if not already selected
      if (!selectedSessionId && items.length > 0) {
        const initial = (params?.id as string | undefined) || items[0]?._id || null;
        setSelectedSessionId(initial);
      }
    } catch (err) {
      console.error('Error loading sessions:', err);
    }
  }, [params?.id, selectedSessionId]);

  // Initial load
  useEffect(() => {
    loadSessions();
  }, []);

  // Reload when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('🔵 StudyScreen: Screen focused, reloading sessions...');
      loadSessions();
    }, [loadSessions])
  );

  // Subscribe to transcript events
  useEffect(() => {
    console.log('📢 StudyScreen: Subscribing to transcript events');
    const unsubscribe = transcriptEvents.subscribe(() => {
      console.log('📢 StudyScreen: Received transcript update event, refreshing...');
      loadSessions();
    });
    console.log('📢 StudyScreen: Subscribed, total listeners:', transcriptEvents.listenerCount);
    return () => {
      console.log('📢 StudyScreen: Unsubscribing');
      unsubscribe();
    };
  }, [loadSessions]);

  // Generate study materials
  useEffect(() => {
    let cancelled = false;

    const generateMaterials = async () => {
      try {
        const key = String(selectedSessionId || params?.id || 'latest');
        if (ranKeyRef.current === key) return;
        ranKeyRef.current = key;

        setLoading(true);
        setError(null);
        setMaterials(null);
        setSummary(null);
        setInsights(null);
        setTranscriptText('');
        setAnalysisData(null);
        setScoringMode(null);

        let text = '';
        let lang: Language = 'vi';
        let transcriptId: string | undefined;
        let audioId: string | undefined;

        const targetId = selectedSessionId || params?.id;
        
        if (targetId) {
          // First check if we already have the data in sessions (loaded from transcriptService)
          const cachedSession = sessions.find(s => s._id === targetId);
          
          if (cachedSession?.fullText && cachedSession.fullText.trim().length >= 50) {
            // Use cached data
            text = cachedSession.fullText;
            transcriptId = cachedSession._id;
            const langCode = (cachedSession.language || 'vi').toLowerCase();
            lang = langCode.startsWith('vi') ? 'vi' : 'en';
          } else {
            // Fetch fresh from transcript service
            try {
              const t = await transcriptService.fetchTranscriptById(targetId);
              if (t?.fullText) {
                text = t.fullText;
                transcriptId = t._id;
                audioId = (t.audioId as any)?._id;
                const langCode = (t.language || 'vi').toLowerCase();
                lang = langCode.startsWith('vi') ? 'vi' : 'en';
              }
            } catch (err) {
              console.log('Transcript fetch failed:', err);
            }
          }
        } else {
          // No targetId - get first transcript from sessions or fetch
          if (sessions.length > 0 && sessions[0]?.fullText) {
            text = sessions[0].fullText;
            transcriptId = sessions[0]._id;
            const langCode = (sessions[0].language || 'vi').toLowerCase();
            lang = langCode.startsWith('vi') ? 'vi' : 'en';
          } else {
            const transcripts = await transcriptService.fetchTranscripts();
            const first = transcripts?.[0];
            
            if (!first?._id) {
              setError('Không tìm thấy phiên nào');
              setLoading(false);
              return;
            }

            text = first.fullText || '';
            transcriptId = first._id;
            const langCode = (first.language || 'vi').toLowerCase();
            lang = langCode.startsWith('vi') ? 'vi' : 'en';
          }
        }

        if (!text || text.trim().length < 50) {
          setError('Nội dung transcript quá ngắn hoặc không có');
          setMaterials({ flashcards: [], quizzes: [] });
          setLoading(false);
          return;
        }

        setTranscriptText(text);
        setLanguage(lang);

        // Truncate if too long
        const maxLength = 8000;
        if (text.length > maxLength) {
          text = text.substring(0, maxLength) + '...';
        }

        if (!hasGenAiKey) {
          setError('Thiếu cấu hình GenAI API key. Vui lòng kiểm tra file .env hoặc app config.');
          setMaterials({ flashcards: [], quizzes: [] });
          setLoading(false);
          return;
        }

        // Generate materials in parallel
        const [flashcardsRaw, quizzesRaw, summaryText, insightsData] = await Promise.allSettled([
          geminiService.generateFlashcards(text, lang, 10),
          geminiService.generateQuiz(text, lang, 10), // Tăng từ 5 lên 10 câu hỏi đúng trọng tâm
          geminiService.generateSummary(text, lang),
          geminiService.generateInsights(text, lang)
        ]);

        if (cancelled) return;

        const flashcardsFromAI: Flashcard[] = flashcardsRaw.status === 'fulfilled'
          ? (flashcardsRaw.value || []).map((c: any, i: number) => ({
              id: `fc_${i + 1}`,
              // Ưu tiên dùng field question nếu có để đảm bảo front là câu hỏi
              front: c.front || c.question || '',
              back: c.back || c.answer || ''
            }))
          : [];

        const quizzes: Quiz[] = quizzesRaw.status === 'fulfilled'
          ? (quizzesRaw.value || []).map((q: any, i: number) => {
              const correctIdxRaw = q.options?.findIndex((o: string) => 
                o.trim() === (q.correctAnswer || '').trim()
              );
              const correctIdx = typeof correctIdxRaw === 'number' && correctIdxRaw >= 0
                ? correctIdxRaw
                : 0;
              return {
                id: `q_${i + 1}`,
                question: q.question || '',
                options: q.options || [],
                correctAnswerIndex: correctIdx,
                explanation: q.explanation
              };
            })
          : [];

        // Bổ sung flashcard sinh từ quiz để đảm bảo "câu hỏi" ⇄ "đáp án đúng"
        const flashcardsFromQuizzes: Flashcard[] = quizzes.map((q, i) => ({
          id: `qfc_${i + 1}`,
          front: q.question,
          back: q.options[q.correctAnswerIndex] || ''
        }));

        const allFlashcards: Flashcard[] = [...flashcardsFromAI, ...flashcardsFromQuizzes];

        setMaterials({
          flashcards: allFlashcards,
          quizzes
        });
        setSummary(summaryText.status === 'fulfilled' ? summaryText.value : null);
        setInsights(insightsData.status === 'fulfilled' ? insightsData.value : null);

        // Save to server (optional - skip if no backend configured)
        try {
          const apiBaseUrl = (Constants.expoConfig?.extra as any)?.API_BASE_URL;
          if (!apiBaseUrl) {
            console.log('Skipping server save - no API_BASE_URL configured');
            setLoading(false);
            return;
          }
          // Remove /api suffix if present to avoid duplication
          const baseUrl = apiBaseUrl.replace(/\/api\/?$/, '');
          
          await fetch(`${baseUrl}/api/study-materials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcriptId,
              audioId,
              language: lang,
              flashcards: allFlashcards.map(c => ({ front: c.front, back: c.back })),
              quizzes: quizzes.map(q => ({
                question: q.question,
                options: q.options,
                correctAnswer: q.options[q.correctAnswerIndex]
              }))
            })
          });

          if (summaryText.status === 'fulfilled' && insightsData.status === 'fulfilled') {
            await fetch(`${baseUrl}/api/transcript/analysis`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                transcriptId,
                audioId,
                language: lang,
                summary: summaryText.value,
                insights: insightsData.value
              })
            });
          }
        } catch (saveError) {
          console.error('Error saving to server:', saveError);
        }

        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          console.error('Error generating materials:', err);
          setError(err.message || 'Có lỗi xảy ra khi tạo học liệu');
          setMaterials({ flashcards: [], quizzes: [] });
          setLoading(false);
        }
      }
    };

    generateMaterials();
    return () => { cancelled = true; };
  }, [params?.id, selectedSessionId]);

  const runScoring = async (detailed: boolean) => {
    try {
      if (!hasGenAiKey) {
        setError('Thiếu cấu hình GenAI API key nên không thể phân tích & đánh giá.');
        return;
      }
      setScoringLoading(true);
      setScoringMode(detailed ? 'detailed' : 'quick');

      if (!transcriptText || transcriptText.trim().length < 50) {
        setError('Nội dung quá ngắn để phân tích');
        setScoringLoading(false);
        return;
      }

      if (detailed) {
        const result = await geminiService.analyzeOverall(transcriptText, language);
        setAnalysisData(result);

        // Save scoring to server (optional)
        try {
          const apiBaseUrl = (Constants.expoConfig?.extra as any)?.API_BASE_URL;
          if (apiBaseUrl) {
            const baseUrl = apiBaseUrl.replace(/\/api\/?$/, '');
            await fetch(`${baseUrl}/api/transcript/scoring`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                transcriptId: selectedSessionId,
                language,
                scoring: result
              })
            });
          }
        } catch (e) {
          console.log('Scoring save skipped:', e);
        }
      } else {
        const score = await geminiService.quickScore(transcriptText, language);
        setAnalysisData({ totalScore: score } as any);
      }

      setScoringLoading(false);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi phân tích');
      setScoringLoading(false);
    }
  };

  return (
    <ScrollView 
      contentContainerStyle={{ padding: 16, backgroundColor: colors.background }}
      style={{ backgroundColor: colors.background }}
    >
      {/* Session selector */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="albums-outline" size={20} color={colors.info} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
              {t.study.recentSessions}
            </Text>
          </View>
          {sessions.length > 0 && selectedSessionId && (
            <Text style={{ fontSize: 12, color: colors.textMuted, maxWidth: 120 }} numberOfLines={1}>
              {sessions.find(s => s._id === selectedSessionId)?.title || 'Không có tiêu đề'}
            </Text>
          )}
        </View>

        {sessions.length === 0 ? (
          <View style={{ padding: 20, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
            <Ionicons name="information-circle-outline" size={24} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
              {t.study.noSession}
            </Text>
          </View>
        ) : (
          <View style={{ borderRadius: 16, backgroundColor: colors.surface, paddingVertical: 12, paddingHorizontal: 8, borderWidth: 1.5, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {sessions.map(s => {
                const isActive = selectedSessionId === s._id;
                const label = s.title || 'Phiên';
                const date = s.createdAt ? new Date(s.createdAt).toLocaleDateString() : null;
                return (
                  <TouchableOpacity
                    key={s._id}
                    onPress={() => {
                      if (isActive || loading) return;
                      setMaterials(null);
                      setSummary(null);
                      setInsights(null);
                      setError(null);
                      setTranscriptText('');
                      setAnalysisData(null);
                      setScoringMode(null);
                      ranKeyRef.current = null;
                      setSelectedSessionId(s._id);
                    }}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: isActive ? colors.primary : colors.border,
                      backgroundColor: isActive ? (isDark ? colors.surfaceVariant : '#eff6ff') : colors.surface,
                      marginRight: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      opacity: loading && !isActive ? 0.5 : 1,
                      shadowColor: isActive ? colors.primary : '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isActive ? 0.1 : 0.05,
                      shadowRadius: 2,
                      elevation: isActive ? 2 : 1,
                    }}
                  >
                    <Ionicons
                      name={isActive ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isActive ? colors.primary : colors.textMuted}
                    />
                    <View>
                      <Text
                        style={{
                          color: isActive ? colors.primary : colors.text,
                          fontWeight: isActive ? '700' : '600',
                          fontSize: 14,
                        }}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                      {date && (
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                          {date}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Tab Navigation */}
      <View style={{ flexDirection: 'row', marginBottom: 20, gap: 10, backgroundColor: '#f8f9fa', padding: 4, borderRadius: 12 }}>
        <TouchableOpacity
          onPress={() => setActiveTab('materials')}
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            backgroundColor: activeTab === 'materials' ? '#ffffff' : 'transparent',
            alignItems: 'center',
            shadowColor: activeTab === 'materials' ? '#3b82f6' : 'transparent',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: activeTab === 'materials' ? 2 : 0,
          }}
        >
          <Text style={{ color: activeTab === 'materials' ? '#2563eb' : '#6b7280', fontWeight: activeTab === 'materials' ? '700' : '600', fontSize: 14 }}>
            Học liệu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('scoring')}
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            backgroundColor: activeTab === 'scoring' ? '#ffffff' : 'transparent',
            alignItems: 'center',
            shadowColor: activeTab === 'scoring' ? '#8b5cf6' : 'transparent',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: activeTab === 'scoring' ? 2 : 0,
          }}
        >
          <Text style={{ color: activeTab === 'scoring' ? '#7c3aed' : '#6b7280', fontWeight: activeTab === 'scoring' ? '700' : '600', fontSize: 14 }}>
            Đánh giá & Agenda
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading indicator */}
      {loading && activeTab === 'materials' && (
        <View style={{ alignItems: 'center', padding: 32, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1.5, borderColor: '#e5e7eb', marginBottom: 16 }}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={{ marginTop: 16, color: '#6b7280', fontSize: 14, fontWeight: '500' }}>Đang tạo flashcards và quiz...</Text>
        </View>
      )}

      {/* Error message */}
      {error && (
        <View style={{ backgroundColor: '#fef2f2', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1.5, borderColor: '#fecaca' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="alert-circle-outline" size={20} color="#dc2626" />
            <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 15 }}>Lỗi</Text>
          </View>
          <Text style={{ color: '#991b1b', marginTop: 4, fontSize: 14, lineHeight: 20 }}>{error}</Text>
        </View>
      )}

      {/* Materials Tab */}
      {activeTab === 'materials' && (
        <StudyZone 
          materials={materials} 
          fallbackUsed={false}
          summary={summary}
          insights={insights ? {
            overallScore: analysisData?.totalScore || 0,
            agendaCoverage: analysisData?.timeUtilization?.productive || 0,
            agendaExplanation: analysisData?.summary || ''
          } : null}
        />
      )}

      {/* Scoring Tab */}
      {activeTab === 'scoring' && (
        <View style={{ padding: 20, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1.5, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="analytics-outline" size={22} color="#2563eb" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>
              Phân tích & Đánh giá
            </Text>
          </View>

          {!transcriptText && !loading && (
            <View style={{ padding: 32, alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 16, borderWidth: 1.5, borderColor: '#e5e7eb', borderStyle: 'dashed' }}>
              <Ionicons name="analytics-outline" size={48} color="#9ca3af" style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center', lineHeight: 24 }}>
                Chọn phiên và đợi tải xong để xem phân tích
              </Text>
            </View>
          )}

          {transcriptText && !analysisData && !scoringLoading && (
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => runScoring(false)}
                style={{ flex: 1, backgroundColor: '#2563eb', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="flash-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Đánh giá nhanh</Text>
                </View>
                <Text style={{ color: '#dbeafe', fontSize: 12, marginTop: 4, fontWeight: '500' }}>~10 giây</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => runScoring(true)}
                style={{ flex: 1, backgroundColor: '#7c3aed', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="search-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Chi tiết đầy đủ</Text>
                </View>
                <Text style={{ color: '#ede9fe', fontSize: 12, marginTop: 4, fontWeight: '500' }}>~30-60 giây</Text>
              </TouchableOpacity>
            </View>
          )}

          {scoringLoading && (
            <View style={{ alignItems: 'center', padding: 32, backgroundColor: '#f8f9fa', borderRadius: 16, borderWidth: 1.5, borderColor: '#e5e7eb' }}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={{ marginTop: 16, color: '#6b7280', fontSize: 15, fontWeight: '500' }}>
                {scoringMode === 'quick' ? 'Đang tính điểm...' : 'Đang phân tích chi tiết...'}
              </Text>
            </View>
          )}

          {/* Quick Score Result */}
          {analysisData && scoringMode === 'quick' && (
            <View>
              <View style={{ backgroundColor: '#ffffff', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 2, borderColor: getScoreColor(analysisData.totalScore), shadowColor: getScoreColor(analysisData.totalScore), shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 }}>
                <Text style={{ fontSize: 64, fontWeight: '800', color: getScoreColor(analysisData.totalScore) }}>
                  {analysisData.totalScore}
                </Text>
                <Text style={{ fontSize: 18, color: '#6b7280', marginTop: 8, fontWeight: '600' }}>
                  {getScoreLabel(analysisData.totalScore, language)}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => runScoring(true)}
                style={{ marginTop: 16, backgroundColor: '#7c3aed', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 }}
              >
                <Ionicons name="search-outline" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Xem phân tích chi tiết</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Detailed Analysis Result */}
          {analysisData && scoringMode === 'detailed' && (
            <ScrollView style={{ maxHeight: 600 }}>
              {/* Overall Score Card */}
              <View style={{ backgroundColor: '#ffffff', padding: 24, borderRadius: 16, marginBottom: 20, borderWidth: 2, borderColor: getScoreColor(analysisData.totalScore), shadowColor: getScoreColor(analysisData.totalScore), shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 15, color: '#9ca3af', marginBottom: 6, fontWeight: '500' }}>Điểm tổng quan</Text>
                    <Text style={{ fontSize: 42, fontWeight: '800', color: getScoreColor(analysisData.totalScore) }}>
                      {analysisData.totalScore}/100
                    </Text>
                    <Text style={{ fontSize: 15, color: '#6b7280', marginTop: 4, fontWeight: '600' }}>
                      {getScoreLabel(analysisData.totalScore, language)}
                    </Text>
                  </View>
                  <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: getScoreColor(analysisData.totalScore) + '15', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: getScoreColor(analysisData.totalScore) }}>
                    <Text style={{ fontSize: 28, fontWeight: '800', color: getScoreColor(analysisData.totalScore) }}>
                      {analysisData.totalScore}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Summary */}
              {analysisData.summary && (
                <View style={{ marginBottom: 20, padding: 18, backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1.5, borderColor: '#fef3c7', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                    <Ionicons name="document-text-outline" size={18} color="#d97706" />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#92400e' }}>Tóm tắt</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: '#78350f', lineHeight: 22 }}>{analysisData.summary}</Text>
                </View>
              )}

              {/* Time Utilization */}
              {analysisData.timeUtilization && (
                <View style={{ marginBottom: 20, padding: 18, backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1.5, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                    <Ionicons name="time-outline" size={18} color="#2563eb" />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>Phân bổ thời gian</Text>
                  </View>
                  <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}><Text style={{ fontSize: 12, color: '#6b7280' }}>Hiệu quả</Text></View>
                      <View style={{ flex: 2, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                        <View style={{ width: `${analysisData.timeUtilization.productive}%`, height: '100%', backgroundColor: '#22c55e' }} />
                      </View>
                      <Text style={{ width: 40, textAlign: 'right', fontSize: 12, fontWeight: '600', color: '#22c55e' }}>
                        {analysisData.timeUtilization.productive}%
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}><Text style={{ fontSize: 12, color: '#6b7280' }}>Thảo luận</Text></View>
                      <View style={{ flex: 2, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                        <View style={{ width: `${analysisData.timeUtilization.discussion}%`, height: '100%', backgroundColor: '#3b82f6' }} />
                      </View>
                      <Text style={{ width: 40, textAlign: 'right', fontSize: 12, fontWeight: '600', color: '#3b82f6' }}>
                        {analysisData.timeUtilization.discussion}%
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}><Text style={{ fontSize: 12, color: '#6b7280' }}>Lạc đề</Text></View>
                      <View style={{ flex: 2, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                        <View style={{ width: `${analysisData.timeUtilization.offtopic}%`, height: '100%', backgroundColor: '#ef4444' }} />
                      </View>
                      <Text style={{ width: 40, textAlign: 'right', fontSize: 12, fontWeight: '600', color: '#ef4444' }}>
                        {analysisData.timeUtilization.offtopic}%
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Agenda Items with Scores */}
              {analysisData.agenda && analysisData.agenda.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 }}>
                    <Ionicons name="list-outline" size={20} color="#111827" />
                    <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Agenda & Chi tiết từng phần</Text>
                  </View>
                  {analysisData.agenda.map((item, index) => (
                    <View key={item.id} style={{ marginBottom: 14, padding: 18, backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1.5, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 }}>
                            {index + 1}. {item.title}
                          </Text>
                          {item.topics && item.topics.length > 0 && (
                            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4, lineHeight: 18 }}>
                              Topics: {item.topics.join(', ')}
                            </Text>
                          )}
                          {item.duration && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
                              <Ionicons name="time-outline" size={14} color="#9ca3af" />
                              <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '500' }}>
                                {item.duration} phút
                              </Text>
                            </View>
                          )}
                        </View>
                        {item.overallScore !== undefined && (
                          <View style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: getScoreColor(item.overallScore) + '15', borderWidth: 1.5, borderColor: getScoreColor(item.overallScore) }}>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: getScoreColor(item.overallScore) }}>
                              {item.overallScore}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Score Metrics */}
                      {item.score && (
                        <View style={{ gap: 6, marginBottom: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                          {Object.entries(item.score).map(([key, value]: [string, any]) => (
                            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ width: 110, fontSize: 12, color: '#6b7280', textTransform: 'capitalize', fontWeight: '500' }}>{key}</Text>
                              <View style={{ flex: 1, height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                                <View style={{ width: `${value}%`, height: '100%', backgroundColor: getScoreColor(value), borderRadius: 4 }} />
                              </View>
                              <Text style={{ width: 35, textAlign: 'right', fontSize: 12, fontWeight: '700', color: getScoreColor(value) }}>{value}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Strengths */}
                      {item.strengths && item.strengths.length > 0 && (
                        <View style={{ marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#16a34a' }}>Điểm mạnh</Text>
                          </View>
                          {item.strengths.map((s, i) => (
                            <Text key={i} style={{ fontSize: 13, color: '#15803d', marginLeft: 22, marginBottom: 4, lineHeight: 20 }}>• {s}</Text>
                          ))}
                        </View>
                      )}

                      {/* Improvements */}
                      {item.improvements && item.improvements.length > 0 && (
                        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
                            <Ionicons name="bulb-outline" size={16} color="#f97316" />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#f97316' }}>Cần cải thiện</Text>
                          </View>
                          {item.improvements.map((s, i) => (
                            <Text key={i} style={{ fontSize: 13, color: '#ea580c', marginLeft: 22, marginBottom: 4, lineHeight: 20 }}>• {s}</Text>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Key Findings */}
              {analysisData.keyFindings && analysisData.keyFindings.length > 0 && (
                <View style={{ marginBottom: 20, padding: 18, backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1.5, borderColor: '#dbeafe', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                    <Ionicons name="search-outline" size={18} color="#2563eb" />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e40af' }}>Phát hiện chính</Text>
                  </View>
                  {analysisData.keyFindings.map((finding, i) => (
                    <Text key={i} style={{ fontSize: 14, color: '#1e3a8a', marginBottom: 6, lineHeight: 20, paddingLeft: 4 }}>• {finding}</Text>
                  ))}
                </View>
              )}

              {/* Recommendations */}
              {analysisData.recommendations && analysisData.recommendations.length > 0 && (
                <View style={{ marginBottom: 20, padding: 18, backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1.5, borderColor: '#dcfce7', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                    <Ionicons name="bulb-outline" size={18} color="#16a34a" />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#166534' }}>Khuyến nghị</Text>
                  </View>
                  {analysisData.recommendations.map((rec, i) => (
                    <Text key={i} style={{ fontSize: 14, color: '#14532d', marginBottom: 6, lineHeight: 20 }}>{i + 1}. {rec}</Text>
                  ))}
                </View>
              )}

              {/* Re-analyze Button */}
              <TouchableOpacity
                onPress={() => { setAnalysisData(null); setScoringMode(null); }}
                style={{ marginTop: 8, backgroundColor: '#ffffff', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
              >
                <Ionicons name="refresh-outline" size={18} color="#6b7280" />
                <Text style={{ color: '#6b7280', fontWeight: '700', fontSize: 15 }}>Phân tích lại</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      )}
    </ScrollView>
  );
}

