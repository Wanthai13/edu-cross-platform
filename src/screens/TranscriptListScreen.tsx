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

type Props = NativeStackScreenProps<RootStackParamList, 'Transcripts'>;

export default function TranscriptListScreen({ navigation }: Props) {
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
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={[styles.statIconBox, { backgroundColor: bg }]}>
          <Ionicons name={iconName} size={20} color={color} />
        </View>
      </View>
      <Text style={styles.statLabel}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  const renderTagCard = (tag: Tag) => (
    <TouchableOpacity
      key={tag._id}
      style={[styles.tagCard, { borderLeftColor: tag.color }]}
      onPress={() => navigateToTaggedTranscripts(tag)}
      activeOpacity={0.7}
    >
      <View style={styles.tagCardContent}>
        <Text style={styles.tagName} numberOfLines={2}>
          {tag.name}
        </Text>
        <View style={styles.tagBadge}>
          <Text style={styles.tagCount}>{tag.transcriptCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm transcript..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              style={styles.clearButton}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats Cards - Only show when NOT searching */}
      {!isSearching && (
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statsCol}>
              <StatCard 
                iconName="document-text-outline" 
                color="#4f46e5" 
                bg="#e0e7ff" 
                title="Tổng Transcripts" 
                value={stats.totalTranscripts} 
              />
            </View>
            <View style={styles.statsCol}>
              <StatCard 
                iconName="pricetags-outline" 
                color="#f97316" 
                bg="#ffedd5" 
                title="Tổng Tags" 
                value={stats.totalTags} 
              />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statsCol}>
              <StatCard 
                iconName="list-outline" 
                color="#2563eb" 
                bg="#dbeafe" 
                title="TB Segments" 
                value={stats.avgSegments} 
              />
            </View>
            <View style={styles.statsCol}>
              <StatCard 
                iconName="star-outline" 
                color="#9333ea" 
                bg="#f3e8ff" 
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
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>Không tìm thấy kết quả</Text>
              <Text style={styles.emptySubtext}>
                Thử tìm kiếm với từ khóa khác
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
                <View style={styles.searchHeader}>
                  <Text style={styles.searchHeaderText}>
                    Tìm thấy {filteredItems.length} kết quả
                  </Text>
                </View>
              }
              contentContainerStyle={styles.searchListContent}
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
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyText}>Chưa có transcript nào</Text>
          <Text style={styles.emptySubtext}>
            Upload file audio để bắt đầu
          </Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3b82f6']}
            />
          }
        >
          <View style={styles.content}>
            {/* Untagged Section */}
            {untaggedCount > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Chưa phân loại</Text>
                <TouchableOpacity
                  style={styles.untaggedCard}
                  onPress={navigateToUntagged}
                  activeOpacity={0.7}
                >
                  <View style={styles.untaggedContent}>
                    <Text style={styles.untaggedIcon}>📋</Text>
                    <View style={styles.untaggedTextContainer}>
                      <Text style={styles.untaggedTitle}>
                        Transcript chưa có tag
                      </Text>
                      <Text style={styles.untaggedCount}>
                        {untaggedCount} transcript
                      </Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Tags Section */}
            {tags.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Tags</Text>
                  <TouchableOpacity
                    style={styles.addTagButton}
                    onPress={() => setShowCreateTagModal(true)}
                  >
                    <Text style={styles.addTagButtonText}>+ Tạo tag</Text>
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
              <View style={styles.emptyTagsContainer}>
                <Text style={styles.emptyTagsIcon}>🏷️</Text>
                <Text style={styles.emptyTagsText}>
                  Chưa có tag nào
                </Text>
                <Text style={styles.emptyTagsSubtext}>
                  Tạo tag để tổ chức transcripts của bạn
                </Text>
                <TouchableOpacity
                  style={styles.createTagButton}
                  onPress={() => setShowCreateTagModal(true)}
                >
                  <Text style={styles.createTagButtonText}>+ Tạo tag đầu tiên</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Floating Action Button */}
      {!isSearching && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreateTagModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* Create Tag Modal */}
      <Modal
        visible={showCreateTagModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateTagModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tạo tag mới</Text>

            <TextInput
              style={styles.input}
              placeholder="Tên tag"
              value={newTagName}
              onChangeText={setNewTagName}
              autoFocus
            />

            <Text style={styles.colorLabel}>Chọn màu:</Text>
            <View style={styles.colorPicker}>
              {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map(
                (color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      newTagColor === color && styles.colorOptionSelected
                    ]}
                    onPress={() => setNewTagColor(color)}
                  />
                )
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateTagModal(false);
                  setNewTagName('');
                  setNewTagColor('#3B82F6');
                }}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateTag}
                disabled={creatingTag}
              >
                <Text style={styles.createButtonText}>
                  {creatingTag ? 'Đang tạo...' : 'Tạo'}
                </Text>
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    padding: 0
  },
  clearButton: {
    padding: 4,
    marginLeft: 8
  },
  clearIcon: {
    fontSize: 18,
    color: '#999'
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
    padding: 16
  },
  content: {
    padding: 16
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  addTagButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  addTagButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff'
  },
  untaggedCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  untaggedContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  untaggedIcon: {
    fontSize: 32,
    marginRight: 12
  },
  untaggedTextContainer: {
    flex: 1
  },
  untaggedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4
  },
  untaggedCount: {
    fontSize: 14,
    color: '#666'
  },
  chevron: {
    fontSize: 32,
    color: '#ccc'
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
    paddingVertical: 40
  },
  emptyTagsIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyTagsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  emptyTagsSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20
  },
  createTagButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24
  },
  createTagButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
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
    marginBottom: 8
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#1a1a1a'
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