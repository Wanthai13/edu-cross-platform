import React, { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { fetchTranscripts, TranscriptItem } from '../api/transcripts';
import TranscriptCard from '../components/TranscriptCard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Transcripts'>;

export default function TranscriptListScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TranscriptItem[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchTranscripts()
      .then((data) => mounted && setItems(data))
      .catch((e) => console.warn(e))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.center}><Text style={{ color: '#666' }}>No sessions found</Text></View>
      ) : (
        <FlatList data={items} keyExtractor={(i) => i._id} renderItem={({ item }) => (
          <TranscriptCard item={item} onPress={() => navigation.navigate('TranscriptDetail', { id: item._id })} />
        )} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
