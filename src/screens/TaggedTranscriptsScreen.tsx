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
import { Ionicons } from '@expo/vector-icons';
import { tagServiceClient } from '../services/tagService';
import { TranscriptItem } from '../services/transcriptService';
import TranscriptCard from '../components/TranscriptCard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';
import { useFocusEffect } from '@react-navigation/native';
import { transcriptEvents } from '../utils/transcriptEvents';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

type Props = NativeStackScreenProps<RootStackParamList, 'TaggedTranscripts'>;

export default function TaggedTranscriptsScreen({ navigation, route }: Props) {
  const { tagId, tagName, tagColor } = route.params;
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadTranscripts = useCallback(async (isRefresh = false, pageNum = 1) => {
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
      Alert.alert(
        language === 'vi' ? 'Lỗi' : 'Error', 
        error.message || (language === 'vi' ? 'Không thể tải transcripts' : 'Failed to load transcripts')
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tagId, language]);

  useEffect(() => {
    loadTranscripts();
  }, [tagId]);

  useFocusEffect(
    useCallback(() => {
      console.log('🔵 TaggedTranscripts: Screen focused, reloading...');
      loadTranscripts(true);
    }, [loadTranscripts])
  );

  // Subscribe to transcript events to refresh when new transcript is created
  useEffect(() => {
    console.log('📢 TaggedTranscripts: Subscribing to transcript events');
    const unsubscribe = transcriptEvents.subscribe(() => {
      console.log('📢 TaggedTranscripts: Received transcript update event, refreshing...');
      loadTranscripts(true);
    });
    console.log('📢 TaggedTranscripts: Subscribed, total listeners:', transcriptEvents.listenerCount);
    return () => {
      console.log('📢 TaggedTranscripts: Unsubscribing');
      unsubscribe();
    };
  }, [loadTranscripts]);

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

  const handleTagsUpdated = () => {
    console.log('🔵 Tags updated, reloading tagged transcripts...');
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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={tagColor} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {language === 'vi' ? 'Đang tải...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {items.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIconBox, { backgroundColor: tagColor + '20' }]}>
            <Ionicons name="document-text-outline" size={48} color={tagColor} />
          </View>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {language === 'vi' ? 'Chưa có transcript nào' : 'No transcripts yet'}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            {language === 'vi' 
              ? 'Tag này chưa được gán cho transcript nào' 
              : 'This tag has not been assigned to any transcript'}
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
              onTagsUpdated={handleTagsUpdated}
            />
          )}
          ListHeaderComponent={
            <View style={[styles.header, { backgroundColor: colors.surface, borderColor: tagColor }]}>
              <View style={[styles.headerIconBox, { backgroundColor: tagColor + '20' }]}>
                <Ionicons name="pricetag" size={24} color={tagColor} />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerText, { color: colors.text }]}>
                  {items.length} transcript{items.length !== 1 ? 's' : ''}
                </Text>
                <Text style={[styles.headerSubtext, { color: tagColor }]}>
                  {tagName}
                </Text>
              </View>
            </View>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[tagColor]}
              tintColor={tagColor}
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
    flex: 1
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    gap: 12
  },
  headerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTextContainer: {
    flex: 1
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  headerSubtext: {
    fontSize: 13,
    fontWeight: '500'
  },
  listContent: {
    padding: 16
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center'
  }
});
