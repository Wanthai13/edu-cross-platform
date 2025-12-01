import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';
import { fetchTranscriptDetail, fetchLearningScore, TranscriptDetail } from '../api/transcripts';
import UploadView from '../components/UploadView';
import StatCard from '../components/StatCard';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'TranscriptDetail'>;

export default function TranscriptDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<TranscriptDetail | null>(null);
  const [score, setScore] = useState<{ coverage?: number; understanding?: number; difficulty?: number } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [d, s] = await Promise.all([fetchTranscriptDetail(id), fetchLearningScore(id)]);
      setDetail(d);
      setScore(s);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    if (mounted) loadData();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;
  if (!detail) return <View style={styles.center}><Text>Transcript not found</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>{detail.title}</Text>

      <View style={{ flexDirection: 'row', marginTop: 12 }}>
        <StatCard label="Coverage" value={score?.coverage ?? '-'} />
        <StatCard label="Understanding" value={score?.understanding ?? '-'} />
        <StatCard label="Difficulty" value={score?.difficulty ?? '-'} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <Text style={styles.body}>{detail.summary}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Topics</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          {detail.topics.map((t, i) => (
            <View key={i} style={styles.topicChip}><Text style={{ color: COLORS.primary }}>{t}</Text></View>
          ))}
        </View>
      </View>

      <View style={{ marginTop: 20 }}>
        <PrimaryButton title="Study with Flashcards" onPress={() => navigation.navigate('Flashcards', { id, title: detail.title })} />
      </View>

      <View style={{ marginTop: 20 }}>
        <UploadView language={'en'} onUploadComplete={() => loadData()} />
      </View>

      <View style={{ marginTop: 12 }}>
        <PrimaryButton title="Take Quiz" onPress={() => navigation.navigate('Quiz', { id, title: detail.title })} />
      </View>

      <View style={{ marginTop: 12 }}>
        <PrimaryButton title="Ask AI" onPress={() => navigation.navigate('Chatbot', { id, title: detail.title })} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.textMain },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textMain },
  body: { marginTop: 8, color: COLORS.textMain, lineHeight: 20 },
  topicChip: { backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, marginRight: 8, marginBottom: 8 },
});
