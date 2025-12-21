// screens/UntaggedTranscriptsScreen.tsx
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
import { transcriptService, TranscriptItem } from '../services/transcriptService';
import TranscriptCard from '../components/TranscriptCard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';
import { useFocusEffect } from '@react-navigation/native';
import { transcriptEvents } from '../utils/transcriptEvents';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

type Props = NativeStackScreenProps<RootStackParamList, 'UntaggedTranscripts'>;

export default function UntaggedTranscriptsScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<TranscriptItem[]>([]);

  const loadTranscripts = useCallback(async (isRefresh = false) => {
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
      Alert.alert(
        language === 'vi' ? 'Lỗi' : 'Error', 
        error.message || (language === 'vi' ? 'Không thể tải transcripts' : 'Failed to load transcripts')
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [language]);

  useEffect(() => {
    loadTranscripts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('🔵 UntaggedTranscripts: Screen focused, reloading...');
      loadTranscripts(true);
    }, [loadTranscripts])
  );

  // Subscribe to transcript events to refresh when new transcript is created
  useEffect(() => {
    console.log('📢 UntaggedTranscripts: Subscribing to transcript events');
    const unsubscribe = transcriptEvents.subscribe(() => {
      console.log('📢 UntaggedTranscripts: Received transcript update event, refreshing...');
      loadTranscripts(true);
    });
    console.log('📢 UntaggedTranscripts: Subscribed, total listeners:', transcriptEvents.listenerCount);
    return () => {
      console.log('📢 UntaggedTranscripts: Unsubscribing');
      unsubscribe();
    };
  }, [loadTranscripts]);

  const onRefresh = () => {
    loadTranscripts(true);
  };

  const handleDelete = () => {
    loadTranscripts(true);
  };

  const handleTagsUpdated = () => {
    console.log('🔵 Tags updated, reloading untagged transcripts...');
    loadTranscripts(true);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
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
          <View style={[styles.emptyIconBox, { backgroundColor: colors.successLight }]}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          </View>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {language === 'vi' ? 'Tất cả đã có tag!' : 'All tagged!'}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            {language === 'vi' 
              ? 'Không còn transcript nào chưa được phân loại' 
              : 'No uncategorized transcripts remaining'}
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
            <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.headerIconBox, { backgroundColor: isDark ? colors.warning + '30' : '#fef3c7' }]}>
                <Ionicons name="folder-open-outline" size={24} color={colors.warning} />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerText, { color: colors.text }]}>
                  {items.length} {language === 'vi' ? 'transcript chưa có tag' : 'untagged transcripts'}
                </Text>
                <Text style={[styles.headerSubtext, { color: colors.textSecondary }]}>
                  {language === 'vi' 
                    ? 'Nhấn giữ vào transcript để gán tag nhanh' 
                    : 'Long press a transcript to quickly assign tags'}
                </Text>
              </View>
            </View>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
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
    borderWidth: 1,
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
    fontSize: 13
  },
  listContent: {
    padding: 16
  }
});
