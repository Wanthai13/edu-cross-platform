import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';
import { fetchFlashcards } from '../api/transcripts';
import FlashcardDeck from '../components/FlashcardDeck';
import PrimaryButton from '../components/PrimaryButton';

type Props = NativeStackScreenProps<RootStackParamList, 'Flashcards'>;

export default function FlashcardScreen({ route }: Props) {
  const { id } = route.params;
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<any[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    fetchFlashcards(id).then((d) => { if (mounted) setCards(d); }).catch((e) => console.warn(e)).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;
  if (!cards || cards.length === 0) return <View style={styles.center}><Text>No flashcards found.</Text></View>;

  return (
    <View style={styles.container}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
        <FlashcardDeck cards={cards} />
      </View>

      <View style={styles.controls}>
        <Text style={{ color: '#6B7280' }}>Tap card to flip • Swipe with controls</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
});
