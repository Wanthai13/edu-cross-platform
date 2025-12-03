// screens/UntaggedTranscriptsScreen.tsx (FIXED)
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Text,
  RefreshControl,
  Alert
} from 'react-native';
import { transcriptService, TranscriptItem } from '../services/transcriptService';
import TranscriptCard from '../components/TranscriptCard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';
import { useFocusEffect } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'UntaggedTranscripts'>;

export default function UntaggedTranscriptsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<TranscriptItem[]>([]);

  const loadTranscripts = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        console.log('🔵 Refreshing untagged transcripts...');
      } else {
        setLoading(true);
        console.log('🔵 Loading untagged transcripts...');
      }
      
      // Load all transcripts and filter untagged ones
      const data = await transcriptService.fetchTranscripts();
      const untagged = data.filter(t => !t.tags || t.tags.length === 0);
      
      console.log('✅ Loaded', untagged.length, 'untagged transcripts');
      setItems(untagged);
    } catch (error: any) {
      console.error('🔴 Error loading transcripts:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải transcripts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTranscripts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTranscripts(true);
    }, [])
  );

  const onRefresh = () => {
    loadTranscripts(true);
  };

  const handleDelete = () => {
    loadTranscripts(true);
  };

  // ✅ FIX: Add this handler to reload when tags are updated
  const handleTagsUpdated = () => {
    console.log('🔵 Tags updated, reloading untagged transcripts...');
    loadTranscripts(true);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>Tất cả đã có tag!</Text>
          <Text style={styles.emptySubtext}>
            Không còn transcript nào chưa được phân loại
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TranscriptCard
              item={item}
              onPress={() =>
                navigation.navigate('TranscriptDetail', { id: item._id })
              }
              onDelete={handleDelete}
              onTagsUpdated={handleTagsUpdated} // ✅ FIX: Pass the handler
            />
          )}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.headerText}>
                {items.length} transcript chưa có tag
              </Text>
              <Text style={styles.headerSubtext}>
                Nhấn giữ vào transcript để gán tag nhanh
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3b82f6']}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666'
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4
  },
  headerSubtext: {
    fontSize: 13,
    color: '#666'
  },
  listContent: {
    padding: 16
  }
});