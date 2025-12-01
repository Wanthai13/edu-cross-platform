import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export type Card = { id?: string; front: string; back: string };

type Props = {
  cards: Card[];
};

const { width } = Dimensions.get('window');

export default function FlashcardDeck({ cards }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const animated = useRef(new Animated.Value(0)).current;

  // Interpolate rotation
  const rotateY = animated.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const flipTo = (toValue: number) => {
    Animated.timing(animated, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsFlipped((v) => toValue === 180 ? true : false);
    });
  };

  const handleFlip = () => {
    if (isFlipped) {
      flipTo(0);
    } else {
      flipTo(180);
    }
  };

  const handleNext = () => {
    flipTo(0);
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((p) => (p + 1) % cards.length), 200);
  };

  const handlePrev = () => {
    flipTo(0);
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((p) => (p - 1 + cards.length) % cards.length), 200);
  };

  const card = cards[currentIndex];

  return (
    <View style={styles.root}>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>Card {currentIndex + 1} of {cards.length}</Text>
        <Text style={styles.tag}>Flashcards</Text>
      </View>

      <TouchableOpacity activeOpacity={0.9} style={styles.cardWrapper} onPress={handleFlip}>
        <Animated.View style={[styles.cardInner, { transform: [{ perspective: 1000 }, { rotateY }] }]}>
          {/* Front */}
          <Animated.View style={[styles.cardFace, styles.frontFace, { opacity: animated.interpolate({ inputRange: [0, 90], outputRange: [1, 0] }) }]} pointerEvents={isFlipped ? 'none' : 'auto'}>
            <Text style={styles.smallLabel}>Question</Text>
            <Text style={styles.cardTitle}>{card.front}</Text>
            <Text style={styles.hint}>Tap to flip</Text>
          </Animated.View>

          {/* Back */}
          <Animated.View style={[styles.cardFace, styles.backFace, { transform: [{ rotateY: '180deg' }], opacity: animated.interpolate({ inputRange: [90, 180], outputRange: [0, 1] }) }]} pointerEvents={isFlipped ? 'auto' : 'none'}>
            <Text style={[styles.smallLabel, { color: COLORS.secondary }]}>Answer</Text>
            <Text style={[styles.cardTitle, { color: COLORS.secondary }]}>{card.back}</Text>
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>

      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.circleBtn} onPress={handlePrev}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.dotsRow}>
          {cards.map((_, idx) => (
            <View key={idx} style={[styles.dot, idx === currentIndex ? styles.dotActive : undefined]} />
          ))}
        </View>

        <TouchableOpacity style={styles.circleBtn} onPress={handleNext}>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', alignItems: 'center' },
  progressRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressText: { color: COLORS.textMuted },
  tag: { color: COLORS.primary, fontWeight: '600' },
  cardWrapper: { width: '100%', maxWidth: Math.min(720, width - 40), height: 300, alignItems: 'center', justifyContent: 'center' },
  cardInner: { width: '100%', height: '100%', position: 'relative' },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 16,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
  },
  frontFace: { backgroundColor: '#111827' },
  backFace: { backgroundColor: '#E8F0FF' },
  smallLabel: { position: 'absolute', top: 12, left: 12, fontSize: 12, color: '#9CA3AF', fontWeight: '700', letterSpacing: 1 },
  cardTitle: { fontSize: 20, color: '#fff', textAlign: 'center', fontWeight: '700' },
  hint: { position: 'absolute', bottom: 12, color: '#CBD5E1', fontSize: 12 },
  controlsRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  circleBtn: { backgroundColor: '#0F172A', padding: 12, borderRadius: 999, marginHorizontal: 8 },
  dotsRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: '#374151', marginHorizontal: 4 },
  dotActive: { width: 24, backgroundColor: COLORS.secondary, borderRadius: 6 },
});
