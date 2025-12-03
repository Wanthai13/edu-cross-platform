// components/TranscriptCard.tsx (FIXED)
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  Modal,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { transcriptService, TranscriptItem } from '../services/transcriptService';
import { tagServiceClient, Tag } from '../services/tagService';

interface Props {
  item: TranscriptItem;
  onPress: () => void;
  onDelete: () => void;
  onTagsUpdated?: () => void;
}

export default function TranscriptCard({ item, onPress, onDelete, onTagsUpdated }: Props) {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [savingTags, setSavingTags] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLongPress = async () => {
    try {
      setLoadingTags(true);
      setShowTagModal(true);

      const allTagsData = await tagServiceClient.getTags();
      setAllTags(allTagsData);

      // Set currently selected tags
      const currentTagIds = item.tags?.map((t: any) => 
        typeof t === 'string' ? t : t._id
      ) || [];
      setSelectedTags(currentTagIds);

    } catch (error) {
      console.error('🔴 Load tags error:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách tag');
      setShowTagModal(false);
    } finally {
      setLoadingTags(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSaveTags = async () => {
    try {
      setSavingTags(true);

      const currentTagIds = item.tags?.map((t: any) => 
        typeof t === 'string' ? t : t._id
      ) || [];

      const tagsToAdd = selectedTags.filter(id => !currentTagIds.includes(id));
      const tagsToRemove = currentTagIds.filter(id => !selectedTags.includes(id));

      // Add new tags
      if (tagsToAdd.length > 0) {
        await tagServiceClient.addTagsToTranscript(item._id, tagsToAdd);
      }

      // Remove tags
      if (tagsToRemove.length > 0) {
        await tagServiceClient.removeTagsFromTranscript(item._id, tagsToRemove);
      }

      Alert.alert('Thành công', 'Đã cập nhật tags');
      setShowTagModal(false);
      
      if (onTagsUpdated) {
        onTagsUpdated();
      }

    } catch (error: any) {
      console.error('🔴 Save tags error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật tags');
    } finally {
      setSavingTags(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Xóa transcript',
      'Bạn có chắc chắn muốn xóa transcript này không? Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: confirmDelete 
        }
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      console.log('🔵 Deleting transcript:', item._id);

      await transcriptService.deleteTranscript(item._id);
      
      console.log('✅ Transcript deleted successfully');
      Alert.alert('Thành công', 'Đã xóa transcript');
      
      onDelete();
    } catch (error: any) {
      console.error('🔴 Delete error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể xóa transcript');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    Alert.alert(
      'Xuất file',
      'Chọn định dạng xuất:',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'TXT', onPress: () => doExport('txt') },
        { text: 'SRT', onPress: () => doExport('srt') },
        { text: 'VTT', onPress: () => doExport('vtt') },
        { text: 'TSV', onPress: () => doExport('tsv') }
      ]
    );
  };

  const doExport = async (format: 'txt' | 'srt' | 'vtt' | 'tsv') => {
    try {
      setExporting(true);
      console.log('🔵 Exporting transcript:', item._id, format);

      const content = await transcriptService.exportTranscript(item._id, format);
      
      await Share.share({
        message: content,
        title: `${item.title}.${format}`
      });

      console.log('✅ Export shared successfully');
    } catch (error: any) {
      console.error('🔴 Export error:', error);
      if (error.message !== 'User did not share') {
        Alert.alert('Lỗi', 'Không thể xuất file');
      }
    } finally {
      setExporting(false);
    }
  };

  const renderTagItem = ({ item: tag }: { item: Tag }) => {
    const isSelected = selectedTags.includes(tag._id);
    
    return (
      <TouchableOpacity
        style={[
          styles.tagItem,
          { borderColor: tag.color },
          isSelected && { backgroundColor: tag.color + '20' }
        ]}
        onPress={() => toggleTag(tag._id)}
        activeOpacity={0.7}
      >
        <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
        <Text style={styles.tagItemName}>{tag.name}</Text>
        {isSelected && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            {item.isEdited && (
              <View style={styles.editedBadge}>
                <Text style={styles.editedText}>Đã sửa</Text>
              </View>
            )}
          </View>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* Display tags */}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 3).map((tag: any) => {
              const tagObj = typeof tag === 'string' 
                ? { _id: tag, name: 'Tag', color: '#3B82F6' } 
                : tag;
              return (
                <View
                  key={tagObj._id}
                  style={[styles.tagBadge, { backgroundColor: tagObj.color + '20' }]}
                >
                  <Text style={[styles.tagBadgeText, { color: tagObj.color }]}>
                    {tagObj.name}
                  </Text>
                </View>
              );
            })}
            {item.tags.length > 3 && (
              <View style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>
                  +{item.tags.length - 3}
                </Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.preview} numberOfLines={2}>
          {item.fullText}
        </Text>

        <View style={styles.footer}>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>📝 {item.segmentCount} đoạn</Text>
            </View>
            {item.highlightCount > 0 && (
              <View style={styles.stat}>
                <Text style={styles.statLabel}>⭐ {item.highlightCount} highlights</Text>
              </View>
            )}
            <View style={styles.stat}>
              <Text style={styles.statLabel}>🌐 {item.language.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExport}
              disabled={exporting}
            >
              <Text style={styles.exportText}>
                {exporting ? '⏳' : '📤'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={deleting}
            >
              <Text style={styles.deleteText}>
                {deleting ? '⏳' : '🗑️'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* Tag Selection Modal */}
      <Modal
        visible={showTagModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTagModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn tags</Text>
              <TouchableOpacity
                onPress={() => setShowTagModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingTags ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Đang tải tags...</Text>
              </View>
            ) : allTags.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🏷️</Text>
                <Text style={styles.emptyText}>Chưa có tag nào</Text>
                <Text style={styles.emptySubtext}>
                  Tạo tag mới từ màn hình chính
                </Text>
              </View>
            ) : (
              <FlatList
                data={allTags}
                keyExtractor={(tag) => tag._id}
                renderItem={renderTagItem}
                style={styles.tagList}
              />
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowTagModal(false)}
              >
                <Text style={styles.cancelModalButtonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveTags}
                disabled={savingTags || loadingTags}
              >
                <Text style={styles.saveButtonText}>
                  {savingTags ? 'Đang lưu...' : 'Lưu'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  header: {
    marginBottom: 8
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1
  },
  editedBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8
  },
  editedText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '500'
  },
  date: {
    fontSize: 13,
    color: '#666'
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8
  },
  tagBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666'
  },
  preview: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 12
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1
  },
  stat: {
    marginRight: 12,
    marginTop: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#666'
  },
  actions: {
    flexDirection: 'row',
    gap: 8
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center'
  },
  exportText: {
    fontSize: 20
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteText: {
    fontSize: 20
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 20
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666'
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666'
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center'
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  emptySubtext: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center'
  },
  tagList: {
    maxHeight: 400
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#fff'
  },
  tagDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12
  },
  tagItemName: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a'
  },
  checkmark: {
    fontSize: 18,
    color: '#10b981',
    fontWeight: '700'
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelModalButton: {
    backgroundColor: '#f3f4f6'
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666'
  },
  saveButton: {
    backgroundColor: '#3b82f6'
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  }
});