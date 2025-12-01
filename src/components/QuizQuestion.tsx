import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';

type Props = {
  question: string;
  choices: string[];
  onSelect: (index: number) => void;
  selectedIndex?: number | null;
  correctIndex?: number | null;
};

export default function QuizQuestion({ question, choices, onSelect, selectedIndex, correctIndex }: Props) {
  return (
    <View>
      <Text style={styles.question}>{question}</Text>
      {choices.map((c, i) => {
        const isSelected = selectedIndex === i;
        const isCorrect = correctIndex === i;
        let background = '#fff';
        if (isSelected && correctIndex != null) background = isCorrect ? '#D1FAE5' : '#FEE2E2';
        return (
          <TouchableOpacity key={i} style={[styles.choice, { backgroundColor: background }]} onPress={() => onSelect(i)}>
            <Text style={styles.choiceText}>{c}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: COLORS.textMain },
  choice: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  choiceText: { color: COLORS.textMain },
});
