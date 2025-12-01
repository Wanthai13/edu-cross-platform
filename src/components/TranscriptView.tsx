import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Transcript, AnalysisTab, SpeakerRole, Flashcard, QuizQuestion, ChatMessage, Language, SummaryLength, MeetingInsights } from '../types';
import { generateSummary, generateFlashcards, generateQuiz, chatWithTranscript, generateMeetingInsights } from '../services/genai';

type Props = {
  transcript: Transcript;
  language: Language;
};

const DEFAULT_UI: Record<Language, any> = {
  en: {
    tabs: { transcript: 'Transcript', score: 'Score', summary: 'Summary', flashcards: 'Flashcards', quiz: 'Quiz', chat: 'Chat' },
    placeholders: { search: 'Search transcript...', chat: 'Ask a question...' },
    actions: { flip: 'Tap to flip', checkAnswer: 'Check Answer' },
    empty: { summary: 'No summary yet', flashcards: 'No flashcards', quiz: 'No quiz' },
    analysis: { calculating: 'Calculating...', overallScore: 'Overall Score', agendaCoverage: 'Agenda Coverage', actionItems: 'Action Items', topicDensity: 'Topic Density', noActions: 'No action items' }
  },
  vi: {
    tabs: { transcript: 'Bản ghi', score: 'Điểm', summary: 'Tóm tắt', flashcards: 'Flashcards', quiz: 'Quiz', chat: 'Chat' },
    placeholders: { search: 'Tìm trong bản ghi...', chat: 'Hỏi trợ lý...' },
    actions: { flip: 'Chạm để lật', checkAnswer: 'Kiểm tra' },
    empty: { summary: 'Chưa có tóm tắt', flashcards: 'Chưa có flashcards', quiz: 'Chưa có quiz' },
    analysis: { calculating: 'Đang phân tích...', overallScore: 'Điểm chung', agendaCoverage: 'Phủ đề', actionItems: 'Hành động', topicDensity: 'Mật độ chủ đề', noActions: 'Không có hành động' }
  }
};

export default function TranscriptView({ transcript, language }: Props) {
  const [activeTab, setActiveTab] = useState<AnalysisTab>(AnalysisTab.READ);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // AI State
  const [summary, setSummary] = useState<string>('');
  const [summaryLength, setSummaryLength] = useState<SummaryLength>('medium');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [insights, setInsights] = useState<MeetingInsights | null>(null);

  // Loading States
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingFlashcards, setLoadingFlashcards] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const fullText = transcript.segments.map(s => `${s.speaker}: ${s.text}`).join('\n');
  const t = DEFAULT_UI[language];

  useEffect(() => {
    if (activeTab === AnalysisTab.SUMMARY) generateSummaryData();
  }, [summaryLength]);

  useEffect(() => {
    // reset when language changes
    setSummary(''); setFlashcards([]); setQuiz([]); setInsights(null); setChatHistory([]);
  }, [language]);

  const generateSummaryData = async () => {
    setLoadingSummary(true);
    const result = await generateSummary(fullText, language, summaryLength);
    setSummary(result);
    setLoadingSummary(false);
  };

  const generateFlashcardsData = async () => {
    setLoadingFlashcards(true);
    const result = await generateFlashcards(fullText, language);
    setFlashcards(result);
    setLoadingFlashcards(false);
  };

  const generateQuizData = async () => {
    setLoadingQuiz(true);
    const result = await generateQuiz(fullText, language);
    setQuiz(result);
    setLoadingQuiz(false);
  };

  const generateInsightsData = async () => {
    setLoadingInsights(true);
    const result = await generateMeetingInsights(fullText, language);
    setInsights(result);
    setLoadingInsights(false);
  };

  const handleTabChange = async (tab: AnalysisTab) => {
    setActiveTab(tab);
    if (tab === AnalysisTab.SUMMARY && !summary && !loadingSummary) generateSummaryData();
    if (tab === AnalysisTab.FLASHCARDS && flashcards.length === 0 && !loadingFlashcards) generateFlashcardsData();
    if (tab === AnalysisTab.QUIZ && quiz.length === 0 && !loadingQuiz) generateQuizData();
    if (tab === AnalysisTab.SCORE && !insights && !loadingInsights) generateInsightsData();
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const newUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput, timestamp: new Date() };
    setChatHistory(prev => [...prev, newUserMsg]);
    setChatInput('');
    setChatLoading(true);
    const historyForAi = chatHistory.map(h => ({ role: h.role, text: h.text }));
    const aiResponseText = await chatWithTranscript(historyForAi, newUserMsg.text, fullText, language);
    const newAiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: aiResponseText, timestamp: new Date() };
    setChatHistory(prev => [...prev, newAiMsg]);
    setChatLoading(false);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
          {[
            { id: AnalysisTab.READ, label: t.tabs.transcript, icon: Feather },
            { id: AnalysisTab.SCORE, label: t.tabs.score, icon: MaterialCommunityIcons },
            { id: AnalysisTab.SUMMARY, label: t.tabs.summary, icon: Feather },
            { id: AnalysisTab.FLASHCARDS, label: t.tabs.flashcards, icon: Ionicons },
            { id: AnalysisTab.QUIZ, label: t.tabs.quiz, icon: Ionicons },
            { id: AnalysisTab.CHAT, label: t.tabs.chat, icon: Feather },
          ].map(tab => (
            <TouchableOpacity key={tab.id} onPress={() => handleTabChange(tab.id)} style={[styles.tab, activeTab === tab.id && styles.activeTab]}>
              {/* icon: use generic glyphs */}
              <Feather name="file-text" size={16} color={activeTab === tab.id ? '#4f46e5' : '#64748b'} />
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.content}>
        {activeTab === AnalysisTab.READ && (
          <View style={styles.fullScreenContent}>
            <View style={styles.searchBar}>
              <Feather name="search" size={16} color="#94a3b8" />
              <TextInput style={styles.searchInput} placeholder={t.placeholders.search} value={searchQuery} onChangeText={setSearchQuery} />
              <TouchableOpacity onPress={() => setIsPlaying(!isPlaying)} style={styles.playButton}>
                {isPlaying ? <Ionicons name="pause" size={16} color="#4f46e5" /> : <Ionicons name="play" size={16} color="#4f46e5" />}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.transcriptList}>
              {transcript.segments.filter(s => s.text.toLowerCase().includes(searchQuery.toLowerCase())).map(segment => (
                <View key={segment.id} style={styles.segmentCard}>
                  <View style={styles.segmentHeader}>
                    <View style={[styles.avatar, segment.role === SpeakerRole.LECTURER ? styles.avatarLecturer : segment.role === SpeakerRole.HOST ? styles.avatarHost : styles.avatarStudent]}>
                      <Text style={[styles.avatarText, segment.role === SpeakerRole.LECTURER ? styles.avatarTextLecturer : segment.role === SpeakerRole.HOST ? styles.avatarTextHost : styles.avatarTextStudent]}>{segment.speaker.charAt(0)}</Text>
                    </View>
                    <Text style={styles.speakerName}>{segment.speaker}</Text>
                    <Text style={styles.timestamp}>{segment.timestamp}</Text>
                  </View>
                  <Text style={styles.segmentText}>{segment.text}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {activeTab === AnalysisTab.SUMMARY && (
          <ScrollView style={styles.scrollContent}>
            <View style={styles.summaryControls}>
              {(['short', 'medium', 'long'] as SummaryLength[]).map(len => (
                <TouchableOpacity key={len} onPress={() => setSummaryLength(len)} style={[styles.summaryBtn, summaryLength === len && styles.activeSummaryBtn]}>
                  <Text style={[styles.summaryBtnText, summaryLength === len && styles.activeSummaryBtnText]}>{len}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {loadingSummary ? (
              <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4f46e5" /><Text style={styles.loadingText}>Generating summary...</Text></View>
            ) : (
              <View style={styles.card}><Text style={styles.summaryText}>{summary || t.empty.summary}</Text></View>
            )}
          </ScrollView>
        )}

        {activeTab === AnalysisTab.FLASHCARDS && (
          <ScrollView style={styles.scrollContent}>
            {loadingFlashcards ? <ActivityIndicator /> : flashcards.length > 0 ? flashcards.map((card, idx) => (
              <View key={idx} style={styles.flipCardContainer}><Text style={styles.cardFrontText}>{card.front}</Text><Text style={styles.cardBackText}>{card.back}</Text></View>
            )) : <Text style={styles.emptyText}>{t.empty.flashcards}</Text>}
          </ScrollView>
        )}

        {activeTab === AnalysisTab.QUIZ && (
          <ScrollView style={styles.scrollContent}>
            {loadingQuiz ? <ActivityIndicator /> : quiz.length > 0 ? quiz.map((q, idx) => (
              <View key={idx} style={styles.quizCard}><Text style={styles.questionText}>{q.question}</Text></View>
            )) : <Text style={styles.emptyText}>{t.empty.quiz}</Text>}
          </ScrollView>
        )}

        {activeTab === AnalysisTab.SCORE && (
          <ScrollView style={styles.scrollContent}>
            {loadingInsights && !insights ? <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4f46e5" /><Text style={styles.loadingText}>{t.analysis.calculating}</Text></View> : insights ? (
              <View style={styles.insightsContainer}><View style={styles.scoreCard}><Text style={styles.cardTitle}>{t.analysis.overallScore}</Text><View style={styles.scoreCircle}><Text style={styles.scoreValue}>{insights.overallScore}</Text><Text style={styles.scoreTotal}>/100</Text></View></View></View>
            ) : null}
          </ScrollView>
        )}

        {activeTab === AnalysisTab.CHAT && (
          <View style={styles.chatContainer}>
            <ScrollView ref={scrollViewRef} style={styles.chatList} contentContainerStyle={{ paddingBottom: 20 }}>
              {chatHistory.length === 0 && <View style={styles.emptyChat}><Feather name="message-square" size={48} color="#e2e8f0" /><Text style={styles.emptyChatText}>Start the conversation</Text></View>}
              {chatHistory.map(msg => (
                <View key={msg.id} style={[styles.chatRow, msg.role === 'user' ? styles.chatRowUser : styles.chatRowModel]}>
                  {msg.role === 'model' && <View style={styles.botAvatar}><Feather name="cpu" size={16} color="white" /></View>}
                  <View style={[styles.chatBubble, msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleModel]}><Text style={[styles.chatText, msg.role === 'user' ? styles.chatTextUser : styles.chatTextModel]}>{msg.text}</Text></View>
                </View>
              ))}
              {chatLoading && <View style={styles.chatRow}><View style={styles.botAvatar}><Feather name="cpu" size={16} color="white" /></View><View style={styles.chatBubbleModel}><ActivityIndicator size="small" color="#4f46e5" /></View></View>}
            </ScrollView>
            <View style={styles.chatInputContainer}>
              <TextInput style={styles.chatInput} placeholder={t.placeholders.chat} value={chatInput} onChangeText={setChatInput} onSubmitEditing={handleSendMessage} />
              <TouchableOpacity style={[styles.sendButton, !chatInput.trim() && styles.sendButtonDisabled]} onPress={handleSendMessage} disabled={!chatInput.trim() || chatLoading}><Feather name="send" size={18} color="white" /></TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  tabContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tabContent: { paddingHorizontal: 10 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, marginRight: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#4f46e5' },
  tabText: { fontSize: 14, color: '#64748b', marginLeft: 8 },
  activeTabText: { color: '#4f46e5', fontWeight: 'bold' },
  content: { flex: 1 },
  fullScreenContent: { flex: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b', height: 36, marginLeft: 8 },
  playButton: { padding: 8, backgroundColor: '#e0e7ff', borderRadius: 8 },
  transcriptList: { flex: 1, padding: 16 },
  segmentCard: { marginBottom: 20 },
  segmentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarLecturer: { backgroundColor: '#e0e7ff' },
  avatarHost: { backgroundColor: '#f3e8ff' },
  avatarStudent: { backgroundColor: '#ecfdf5' },
  avatarText: { fontSize: 12, fontWeight: 'bold' },
  avatarTextLecturer: { color: '#4338ca' },
  avatarTextHost: { color: '#7e22ce' },
  avatarTextStudent: { color: '#047857' },
  speakerName: { fontSize: 12, fontWeight: 'bold', color: '#334155', marginLeft: 8 },
  timestamp: { fontSize: 12, color: '#94a3b8', marginLeft: 'auto' },
  segmentText: { fontSize: 15, color: '#1e293b', lineHeight: 22, paddingLeft: 8 },
  scrollContent: { flex: 1, padding: 20 },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748b' },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  insightsContainer: { gap: 16 },
  scoreCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 12 },
  scoreCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 8, borderColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  scoreValue: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  scoreTotal: { fontSize: 12, color: '#94a3b8' },
  emptyText: { color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginVertical: 10 },
  summaryControls: { flexDirection: 'row', marginBottom: 16, backgroundColor: '#e2e8f0', padding: 4, borderRadius: 8 },
  summaryBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  activeSummaryBtn: { backgroundColor: 'white' },
  summaryBtnText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  activeSummaryBtnText: { color: '#4f46e5' },
  summaryText: { fontSize: 15, lineHeight: 24, color: '#334155' },
  flipCardContainer: { height: 200, marginBottom: 20 },
  cardFrontText: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', textAlign: 'center' },
  cardBackText: { fontSize: 18, color: '#475569', textAlign: 'center', fontWeight: '500' },
  quizCard: { backgroundColor: 'white', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 },
  questionText: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  chatContainer: { flex: 1 },
  chatList: { flex: 1, padding: 16 },
  emptyChat: { alignItems: 'center', marginTop: 60 },
  emptyChatText: { color: '#94a3b8', marginTop: 16 },
  chatRow: { flexDirection: 'row', marginBottom: 16 },
  chatRowUser: { flexDirection: 'row-reverse' },
  chatRowModel: { flexDirection: 'row' },
  botAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  chatBubble: { padding: 12, borderRadius: 16, maxWidth: '80%' },
  chatBubbleUser: { backgroundColor: '#4f46e5', borderBottomRightRadius: 2 },
  chatBubbleModel: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderBottomLeftRadius: 2 },
  chatText: { fontSize: 14, lineHeight: 20 },
  chatTextUser: { color: 'white' },
  chatTextModel: { color: '#1e293b' },
  chatInputContainer: { flexDirection: 'row', padding: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  chatInput: { flex: 1, height: 44, backgroundColor: '#f8fafc', borderRadius: 22, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { backgroundColor: '#cbd5e1' }
});
