import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';
import { formatDateIso } from '../utils/format';

type Props = {
  item: { _id: string; title: string; sourceType?: string; createdAt?: string };
  onPress?: () => void;
};

export default function TranscriptCard({ item, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>{item.sourceType || 'Lecture'} • {formatDateIso(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    color: COLORS.textMain,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  meta: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
});
