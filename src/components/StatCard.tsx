import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';

type Props = {
  label: string;
  value: string | number;
};

export default function StatCard({ label, value }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginRight: 10,
    minWidth: 88,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  label: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 6,
  },
});
