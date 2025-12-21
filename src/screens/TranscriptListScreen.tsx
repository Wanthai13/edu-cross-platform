// screens/TranscriptListScreen.tsx (WITH STATS)
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { transcriptService, TranscriptItem } from '../services/transcriptService';
import { tagServiceClient, Tag } from '../services/tagService';
import TranscriptCard from '../components/TranscriptCard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { transcriptEvents } from '../utils/transcriptEvents';

type Props = NativeStackScreenProps<RootStackParamList, 'Transcripts'>;

export default function TranscriptListScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [untaggedCount, setUntaggedCount] = useState(0);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<TranscriptItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Modal states
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [creatingTag, setCreatingTag] = useState(false);

  // Stats calculation
  const calculateStats = () => {
    const totalTranscripts = items.length;
    const totalTags = tags.length;
    const avgSegments = items.length > 0 
      ? Math.round(items.reduce((sum, t) => sum + t.segmentCount, 0) / items.length)
      : 0;
    const totalHighlights = items.reduce((sum, t) => sum + t.highlightCount, 0);
    
    return {
      totalTranscripts,
      totalTags,
      avgSegments,
      totalHighlights
    };
  };

  const stats = calculateStats();

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        console.log('🔵 Refreshing data...');
      } else {
        setLoading(true);
        console.log('🔵 Loading data...');
      }
      
      const [transcriptsData, tagsData] = await Promise.all([
        transcriptService.fetchTranscripts(),
        tagServiceClient.getTags()
      ]);
      
      console.log('✅ Loaded', transcriptsData.length, 'transcripts');
      console.log('✅ Loaded', tagsData.length, 'tags');
      
      if (transcriptsData.length > 0) {
        console.log('🔍 First transcript tags:', transcriptsData[0].tags);
      }
      
      setItems(transcriptsData);
      setTags(tagsData);
      
      const untagged = transcriptsData.filter(t => !t.tags || t.tags.length === 0);
      setUntaggedCount(untagged.length);
      
      console.log('✅ Untagged count:', untagged.length);
    } catch (error) {
      console.error('🔴 Error loading data:', error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredItems([]);
      setIsSearching(false);
    } else {
      setIsSearching(true);
      const query = searchQuery.toLowerCase().trim();
      const filtered = items.filter(item => 
        item.title?.toLowerCase().includes(query) ||
        item.fullText?.toLowerCase().includes(query)
      );
      setFilteredItems(filtered);
    }
  }, [searchQuery, items]);

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('🔵 Screen focused, reloading data...');
      loadData(true);
    }, [])
  );

  // Subscribe to transcript events to refresh when new transcript is created
  useEffect(() => {
    console.log('📢 TranscriptList: Subscribing to transcript events');
    const unsubscribe = transcriptEvents.subscribe(() => {
      console.log('📢 TranscriptList: Received transcript update event, refreshing...');
      // Refresh immediately and also with delay
      loadData(true);
      setTimeout(() => {
        console.log('📢 TranscriptList: Delayed refresh');
        loadData(true);
      }, 1000);
    });
    console.log('📢 TranscriptList: Subscribed, total listeners:', transcriptEvents.listenerCount);
    return () => {
      console.log('📢 TranscriptList: Unsubscribing');
      unsubscribe();
    };
  }, []);

  const onRefresh = () => {
    loadData(true);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên tag');
      return;
    }

    try {
      setCreatingTag(true);
      
      await tagServiceClient.createTag(
        newTagName.trim(),
        newTagColor
      );

      Alert.alert('Thành công', 'Đã tạo tag mới');
      setShowCreateTagModal(false);
      setNewTagName('');
      setNewTagColor('#3B82F6');
      loadData(true);
    } catch (error: any) {
      console.error('🔴 Create tag error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tạo tag');
    } finally {
      setCreatingTag(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleTranscriptPress = (id: string) => {
    navigation.navigate('TranscriptDetail', { id });
  };

  const handleDelete = () => {
    loadData(true);
  };

  const handleTagsUpdated = () => {
    loadData(true);
  };

  const navigateToTaggedTranscripts = (tag: Tag) => {
    navigation.navigate('TaggedTranscripts', { 
      tagId: tag._id, 
      tagName: tag.name,
      tagColor: tag.color
    });
  };

  const navigateToUntagged = () => {
    navigation.navigate('UntaggedTranscripts');
  };

  const StatCard = ({ iconName, color, bg, title, value }: any) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
      <View style={styles.statHeader}>
        <View style={[styles.statIconBox, { backgroundColor: isDark ? color + '30' : bg }]}>
          <Ionicons name={iconName} size={20} color={color} />
        </View>
      </View>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{title}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  );

  const renderTagCard = (tag: Tag) => (
    <TouchableOpacity
      key={tag._id}
      style={[styles.tagCard, { borderLeftColor: tag.color, backgroundColor: colors.surface }]}
      onPress={() => navigateToTaggedTranscripts(tag)}
      activeOpacity={0.7}
    >
      <View style={styles.tagCardContent}>
        <Text style={[styles.tagName, { color: colors.text }]} numberOfLines={2}>
          {tag.name}
        </Text>
        <View style={[styles.tagBadge, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.tagCount, { color: colors.text }]}>{tag.transcriptCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t.common.loading}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t.sessions.search}
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              style={[styles.clearButton, { backgroundColor: colors.surfaceVariant }]}
            >
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats Cards - Only show when NOT searching */}
      {!isSearching && (
        <View style={[styles.statsContainer, { backgroundColor: colors.background }]}>
          <View style={styles.statsRow}>
            <View style={styles.statsCol}>
              <StatCard 
                iconName="document-text-outline" 
                color={colors.primary} 
                bg={isDark ? colors.primary + '20' : '#e0e7ff'} 
                title={language === 'vi' ? 'Tổng Transcripts' : 'Total Transcripts'} 
                value={stats.totalTranscripts} 
              />
            </View>
            <View style={styles.statsCol}>
              <StatCard 
                iconName="pricetags-outline" 
                color={colors.warning} 
                bg={isDark ? colors.warning + '20' : '#ffedd5'} 
                title={language === 'vi' ? 'Tổng Tags' : 'Total Tags'} 
                value={stats.totalTags} 
              />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statsCol}>
              <StatCard 
                iconName="list-outline" 
                color={colors.info} 
                bg={isDark ? colors.info + '20' : '#dbeafe'} 
                title={language === 'vi' ? 'TB Segments' : 'Avg Segments'} 
                value={stats.avgSegments} 
              />
            </View>
            <View style={styles.statsCol}>
              <StatCard 
                iconName="star-outline" 
                color="#9333ea" 
                bg={isDark ? '#9333ea20' : '#f3e8ff'} 
                title="Highlights" 
                value={stats.totalHighlights} 
              />
            </View>
          </View>
        </View>
      )}

      {/* Search Results */}
      {isSearching ? (
        <View style={styles.searchResultsContainer}>
          {filteredItems.length === 0 ? (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={[styles.emptyText, { color: colors.text }]}>{t.sessions.noResults}</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                {language === 'vi' ? 'Thử tìm kiếm với từ khóa khác' : 'Try a different search term'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TranscriptCard
                  item={item}
                  onPress={() => handleTranscriptPress(item._id)}
                  onDelete={handleDelete}
                  onTagsUpdated={handleTagsUpdated}
                />
              )}
              ListHeaderComponent={
                <View style={[styles.searchHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                  <Text style={[styles.searchHeaderText, { color: colors.textSecondary }]}>
                    {language === 'vi' ? `Tìm thấy ${filteredItems.length} kết quả` : `Found ${filteredItems.length} results`}
                  </Text>
                </View>
              }
              contentContainerStyle={styles.searchListContent}
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
      ) : items.length === 0 ? (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>{t.sessions.empty}</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            {language === 'vi' ? 'Upload file audio để bắt đầu' : 'Upload an audio file to get started'}
          </Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.content}>
            {/* Untagged Section */}
            {untaggedCount > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {language === 'vi' ? '📋 Chưa phân loại' : '📋 Uncategorized'}
                </Text>
                <TouchableOpacity
                  style={[styles.untaggedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={navigateToUntagged}
                  activeOpacity={0.7}
                >
                  <View style={styles.untaggedContent}>
                    <View style={[styles.untaggedIconBox, { backgroundColor: isDark ? colors.warning + '20' : '#fef3c7' }]}>
                      <Ionicons name="folder-open-outline" size={24} color={colors.warning} />
                    </View>
                    <View style={styles.untaggedTextContainer}>
                      <Text style={[styles.untaggedTitle, { color: colors.text }]}>
                        {language === 'vi' ? 'Transcript chưa có tag' : 'Untagged transcripts'}
                      </Text>
                      <Text style={[styles.untaggedCount, { color: colors.textSecondary }]}>
                        {untaggedCount} transcript{untaggedCount > 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Tags Section */}
            {tags.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>🏷️ Tags</Text>
                  <TouchableOpacity
                    style={[styles.addTagButton, { backgroundColor: colors.primary }]}
                    onPress={() => setShowCreateTagModal(true)}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addTagButtonText}>
                      {language === 'vi' ? 'Tạo tag' : 'New tag'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.tagsGrid}>
                  {tags.map((tag) => (
                    <View key={tag._id} style={styles.tagCardWrapper}>
                      {renderTagCard(tag)}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Empty state for tags */}
            {tags.length === 0 && (
              <View style={[styles.emptyTagsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.emptyTagsIconBox, { backgroundColor: isDark ? colors.primary + '20' : '#f5f3ff' }]}>
                  <Ionicons name="pricetags-outline" size={32} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTagsText, { color: colors.text }]}>
                  {language === 'vi' ? 'Chưa có tag nào' : 'No tags yet'}
                </Text>
                <Text style={[styles.emptyTagsSubtext, { color: colors.textSecondary }]}>
                  {language === 'vi' ? 'Tạo tag để tổ chức transcripts của bạn' : 'Create tags to organize your transcripts'}
                </Text>
                <TouchableOpacity
                  style={[styles.createTagButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowCreateTagModal(true)}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.createTagButtonText}>
                    {language === 'vi' ? 'Tạo tag đầu tiên' : 'Create first tag'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Floating Action Button */}
      {!isSearching && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreateTagModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create Tag Modal */}
      <Modal
        visible={showCreateTagModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateTagModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {language === 'vi' ? '🏷️ Tạo tag mới' : '🏷️ Create new tag'}
            </Text>

            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.inputBackground, 
                borderColor: colors.inputBorder,
                color: colors.text 
              }]}
              placeholder={language === 'vi' ? 'Tên tag' : 'Tag name'}
              placeholderTextColor={colors.placeholder}
              value={newTagName}
              onChangeText={setNewTagName}
              autoFocus
            />

            <Text style={[styles.colorLabel, { color: colors.textSecondary }]}>
              {language === 'vi' ? 'Chọn màu:' : 'Choose color:'}
            </Text>
            <View style={styles.colorPicker}>
              {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06b6d4', '#84cc16'].map(
                (color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      newTagColor === color && styles.colorOptionSelected
                    ]}
                    onPress={() => setNewTagColor(color)}
                  >
                    {newTagColor === color && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                )
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => {
                  setShowCreateTagModal(false);
                  setNewTagName('');
                  setNewTagColor('#3B82F6');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t.common.cancel}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.createButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateTag}
                disabled={creatingTag}
              >
                {creatingTag ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createButtonText}>
                    {language === 'vi' ? 'Tạo' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    padding: 0
  },
  clearButton: {
    padding: 6,
    marginLeft: 8,
    borderRadius: 12
  },
  // Stats Cards Styles
  statsContainer: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12
  },
  statsCol: {
    flex: 1,
    paddingHorizontal: 6
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  statIconBox: {
    padding: 8,
    borderRadius: 10
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  searchResultsContainer: {
    flex: 1
  },
  searchHeader: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  searchHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  searchListContent: {
    padding: 16,
    paddingBottom: 120
  },
  content: {
    padding: 16,
    paddingBottom: 120
  },
  section: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700'
  },
  addTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4
  },
  addTagButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff'
  },
  untaggedCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  untaggedContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  untaggedIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  untaggedTextContainer: {
    flex: 1
  },
  untaggedTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  untaggedCount: {
    fontSize: 13
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6
  },
  tagCardWrapper: {
    width: '50%',
    padding: 6
  },
  tagCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    height: 100,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  tagCardContent: {
    flex: 1,
    justifyContent: 'space-between'
  },
  tagName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8
  },
  tagBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  tagCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666'
  },
  emptyTagsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed'
  },
  emptyTagsIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  emptyTagsText: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6
  },
  emptyTagsSubtext: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center'
  },
  createTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    gap: 6
  },
  createTagButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8
  },
  fabIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16
  },
  colorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#f3f4f6'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666'
  },
  createButton: {
    backgroundColor: '#3b82f6'
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  }
});