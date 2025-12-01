import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import QuizQuestion from './QuizQuestion';

export type QuizItem = {
  id?: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation?: string;
};

type Props = {
  questions: QuizItem[];
};

export default function QuizPlayer({ questions }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const question = questions[currentIdx];

  const handleSelect = (idx: number) => {
    if (selectedOption !== null) return; // prevent changing
    setSelectedOption(idx);
    if (idx === question.correctIndex) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((c) => c + 1);
      setSelectedOption(null);
    } else {
      setShowResults(true);
    }
  };

  const handleReset = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setScore(0);
    setShowResults(false);
  };

  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <View style={styles.resultsRoot}>
        <View style={styles.circle}>
          <Text style={styles.percentage}>{percentage}%</Text>
        </View>
        <Text style={styles.resultsTitle}>Quiz Completed!</Text>
        <Text style={styles.resultsSubtitle}>You got {score} out of {questions.length} correct.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={handleReset}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryText}> Retry Quiz</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Text style={styles.headerMeta}>Question {currentIdx + 1}/{questions.length}</Text>
        <Text style={styles.headerMeta}>Score: {score}</Text>
      </View>

      <View style={{ marginTop: 8 }}>
        <QuizQuestion question={question.question} choices={question.choices} onSelect={handleSelect} selectedIndex={selectedOption} correctIndex={selectedOption != null ? question.correctIndex : null} />
      </View>

      {selectedOption !== null && (
        <View style={styles.explainRow}>
          <Text style={styles.explainTitle}>Explanation</Text>
          <Text style={styles.explainText}>{question.explanation ?? 'No explanation provided.'}</Text>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>{currentIdx === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  headerMeta: { color: COLORS.textMuted },
  explainRow: { marginTop: 16 },
  explainTitle: { color: COLORS.primary, fontWeight: '700', marginBottom: 6 },
  explainText: { color: COLORS.textMain, marginBottom: 12 },
  nextBtn: { backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, alignSelf: 'flex-end' },
  nextBtnText: { color: '#fff', fontWeight: '600' },
  resultsRoot: { padding: 20, alignItems: 'center' },
  circle: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  percentage: { fontSize: 20, fontWeight: '700', color: COLORS.textMain },
  resultsTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textMain, marginBottom: 6 },
  resultsSubtitle: { color: COLORS.textMuted, marginBottom: 12 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '600' },
});
