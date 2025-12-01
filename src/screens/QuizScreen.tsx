import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';
import { fetchQuiz } from '../api/transcripts';
import QuizPlayer from '../components/QuizPlayer';
import PrimaryButton from '../components/PrimaryButton';

type Props = NativeStackScreenProps<RootStackParamList, 'Quiz'>;

export default function QuizScreen({ route }: Props) {
  const { id } = route.params;
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    let mounted = true;
    fetchQuiz(id).then((d) => { if (mounted) setQuestions(d); }).catch((e) => console.warn(e)).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;
  if (!questions || questions.length === 0) return <View style={styles.center}><Text>No quiz available.</Text></View>;

  return (
    <View style={styles.container}>
      <QuizPlayer questions={questions} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: 12, alignItems: 'center' },
});
