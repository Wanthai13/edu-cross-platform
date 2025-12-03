// screens/TaggedTranscriptsScreen.tsx
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
import { tagServiceClient } from '../services/tagService';
import { TranscriptItem } from '../services/transcriptService';
import TranscriptCard from '../components/TranscriptCard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';
import { useFocusEffect } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'TaggedTranscripts'>;

export default function TaggedTranscriptsScreen({ navigation, route }: Props) {
  const { tagId, tagName, tagColor } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadTranscripts = async (isRefresh = false, pageNum = 1) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        console.log('🔵 Refreshing tagged transcripts...');
      } else if (pageNum === 1) {
        setLoading(true);
        console.log('🔵 Loading tagged transcripts...');
      }
      
      const response = await tagServiceClient.getTranscriptsByTag(tagId, pageNum, 20);
      
      console.log('✅ Loaded', response.transcripts.length, 'transcripts');
      
      if (isRefresh || pageNum === 1) {
        setItems(response.transcripts);
      } else {
        setItems(prev => [...prev, ...response.transcripts]);
      }
      
      setHasMore(response.pagination.page < response.pagination.pages);
      setPage(pageNum);
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
  }, [tagId]);

  useFocusEffect(
    useCallback(() => {
      loadTranscripts(true);
    }, [tagId])
  );

  const onRefresh = () => {
    loadTranscripts(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadTranscripts(false, page + 1);
    }
  };

  const handleDelete = () => {
    loadTranscripts(true);
  };

  // Set header title and color
  useEffect(() => {
    navigation.setOptions({
      title: tagName,
      headerStyle: {
        backgroundColor: tagColor
      },
      headerTintColor: '#fff'
    });
  }, [navigation, tagName, tagColor]);

  if (loading && page === 1) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={tagColor} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyText}>Chưa có transcript nào</Text>
          <Text style={styles.emptySubtext}>
            Tag này chưa được gán cho transcript nào
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
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[tagColor]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && page > 1 ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={tagColor} />
              </View>
            ) : null
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
  listContent: {
    padding: 16
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center'
  }
});