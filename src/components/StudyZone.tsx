import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../theme/colors';
import FlashcardDeck from './FlashcardDeck';
import QuizQuestion from './QuizQuestion';
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
type StudyMaterials = {
  flashcards: Flashcard[];
  quizzes: Quiz[];
};
import { Ionicons } from '@expo/vector-icons';

type Props = { materials: StudyMaterials | null };

export default function StudyZone({ materials }: Props) {
  const [activeTab, setActiveTab] = useState<'flashcards' | 'quiz'>('flashcards');
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});

  if (!materials) return (
    <View style={styles.emptyRoot}>
      <Text style={styles.emptyText}>Đang tạo học liệu...</Text>
    </View>
  );

  const handleQuizAnswer = (questionId: string, optionIndex: number) => {
    if (quizAnswers[questionId] !== undefined) return; // already answered
    setQuizAnswers({ ...quizAnswers, [questionId]: optionIndex });
  };

  return (
    <View style={styles.root}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          onPress={() => setActiveTab('flashcards')}
          style={[styles.tabBtn, activeTab === 'flashcards' ? styles.tabActive : undefined]}
        >
          <Text style={[styles.tabText, activeTab === 'flashcards' ? styles.tabTextActive : undefined]}>Flashcards</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('quiz')}
          style={[styles.tabBtn, activeTab === 'quiz' ? styles.tabActive : undefined]}
        >
          <Text style={[styles.tabText, activeTab === 'quiz' ? styles.tabTextActive : undefined]}>Quiz</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'flashcards' && (
        <View style={styles.flexFill}>
          <FlashcardDeck cards={materials.flashcards} />
        </View>
      )}

      {activeTab === 'quiz' && (
        <ScrollView contentContainerStyle={styles.quizList}>
          {materials.quizzes.map((q, idx) => {
            const userAnswer = quizAnswers[q.id];
            const isAnswered = userAnswer !== undefined;

            return (
              <View key={q.id} style={styles.quizCard}>
                <View style={styles.quizHeader}>
                  <View style={styles.badge}><Text style={styles.badgeText}>{idx + 1}</Text></View>
                  <Text style={styles.quizTitle}>{q.question}</Text>
                </View>

                <View style={styles.quizBody}>
                  <QuizQuestion
                    question={q.question}
                    choices={q.options}
                    onSelect={(optIdx) => handleQuizAnswer(q.id, optIdx)}
                    selectedIndex={userAnswer}
                    correctIndex={q.correctAnswerIndex}
                  />
                </View>

                {isAnswered && q.explanation ? (
                  <View style={styles.explainBox}>
                    <Ionicons name="help-circle" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.explainText}>{q.explanation}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%' },
  flexFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  emptyRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.textMuted },
  tabRow: { flexDirection: 'row', alignSelf: 'center', marginVertical: 12, backgroundColor: '#fff', padding: 4, borderRadius: 999, borderWidth: 1, borderColor: '#eee' },
  tabBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  quizList: { paddingHorizontal: 12, paddingBottom: 36 },
  quizCard: { backgroundColor: '#fff', marginVertical: 8, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  quizHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#fafafa' },
  badge: { width: 34, height: 34, borderRadius: 999, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  badgeText: { color: COLORS.primary, fontWeight: '700' },
  quizTitle: { flex: 1, fontWeight: '700', color: COLORS.textMain },
  quizBody: { padding: 12 },
  explainBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, backgroundColor: '#eff6ff', borderTopWidth: 1, borderTopColor: '#e6f0ff' },
  explainText: { color: COLORS.primary, flex: 1 },
});
