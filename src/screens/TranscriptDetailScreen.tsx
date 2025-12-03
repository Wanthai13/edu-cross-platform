// screens/TranscriptDetailScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from './../AppNavigator';
import {
  transcriptService,
  TranscriptDetail,
  Segment
} from '../services/transcriptService';

type Props = NativeStackScreenProps<RootStackParamList, 'TranscriptDetail'>;

export default function TranscriptDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [loading, setLoading] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptDetail | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [showHighlights, setShowHighlights] = useState(false);
  const [highlights, setHighlights] = useState<Segment[]>([]);
  const [segmentPositions, setSegmentPositions] = useState<{ [key: number]: number }>({});

  useEffect(() => {
    loadTranscript();
  }, [id]);

  const loadTranscript = async () => {
    try {
      setLoading(true);
      console.log('🔵 Loading transcript:', id);

      const data = await transcriptService.fetchTranscriptById(id);
      console.log('✅ Transcript loaded:', data);

      setTranscript(data);
      setTitle(data.audioId.title || data.audioId.originalName);
      setDescription(data.audioId.description || '');
    } catch (error) {
      console.error('🔴 Load error:', error);
      Alert.alert('Lỗi', 'Không thể tải transcript');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMetadata = async () => {
    try {
      console.log('🔵 Saving metadata:', { title, description });

      await transcriptService.updateTranscriptMetadata(id, { title, description });
      setEditingTitle(false);
      Alert.alert('Thành công', 'Đã cập nhật thông tin');
      loadTranscript();
    } catch (error) {
      console.error('🔴 Save metadata error:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật');
    }
  };

  const handleEditSegment = (segment: Segment) => {
    setEditingSegmentId(segment.id);
    setEditText(segment.text);
  };

  const handleSaveSegment = async () => {
    if (!editingSegmentId) return;
    
    try {
      console.log('🔵 Saving segment:', editingSegmentId);

      await transcriptService.updateSegmentText(id, editingSegmentId, editText);
      setEditingSegmentId(null);
      Alert.alert('Thành công', 'Đã cập nhật đoạn text');
      loadTranscript();
    } catch (error) {
      console.error('🔴 Save segment error:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật');
    }
  };

  const handleToggleHighlight = async (segment: Segment) => {
    const colors = ['yellow', 'green', 'blue', 'red', 'purple'];
    
    if (segment.isHighlighted) {
      try {
        console.log('🔵 Removing highlight:', segment.id);

        await transcriptService.updateSegmentHighlight(id, segment.id, false);
        loadTranscript();
      } catch (error) {
        console.error('🔴 Remove highlight error:', error);
        Alert.alert('Lỗi', 'Không thể bỏ highlight');
      }
    } else {
      Alert.alert(
        'Chọn màu highlight',
        '',
        [
          { text: 'Hủy', style: 'cancel' },
          ...colors.map(color => ({
            text: color.charAt(0).toUpperCase() + color.slice(1),
            onPress: async () => {
              try {
                console.log('🔵 Adding highlight:', segment.id, color);

                await transcriptService.updateSegmentHighlight(id, segment.id, true, color);
                loadTranscript();
              } catch (error) {
                console.error('🔴 Add highlight error:', error);
                Alert.alert('Lỗi', 'Không thể highlight');
              }
            }
          }))
        ]
      );
    }
  };

  const handleShowHighlights = async () => {
    try {
      console.log('🔵 Loading highlights for:', id);

      const data = await transcriptService.fetchHighlights(id);
      console.log('✅ Highlights loaded:', data.length);

      setHighlights(data);
      setShowHighlights(true);
    } catch (error) {
      console.error('🔴 Load highlights error:', error);
      Alert.alert('Lỗi', 'Không thể tải highlights');
    }
  };

  const scrollToSegment = (segmentId: number) => {
    const position = segmentPositions[segmentId];
    if (position !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: position, animated: true });
      setShowHighlights(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getHighlightColor = (color?: string) => {
    const colors: { [key: string]: string } = {
      yellow: '#fef08a',
      green: '#bbf7d0',
      blue: '#bfdbfe',
      red: '#fecaca',
      purple: '#e9d5ff'
    };
    return colors[color || 'yellow'] || colors.yellow;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!transcript) {
    return (
      <View style={styles.center}>
        <Text>Không tìm thấy transcript</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollViewRef} style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          {editingTitle ? (
            <View>
              <TextInput
                style={styles.titleInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Tiêu đề"
              />
              <TextInput
                style={styles.descInput}
                value={description}
                onChangeText={setDescription}
                placeholder="Mô tả (tùy chọn)"
                multiline
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setEditingTitle(false)}
                >
                  <Text style={styles.buttonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSaveMetadata}
                >
                  <Text style={styles.buttonText}>Lưu</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity onPress={() => setEditingTitle(true)}>
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
              </View>
              {description ? (
                <Text style={styles.description}>{description}</Text>
              ) : null}
              <View style={styles.metaRow}>
                <Text style={styles.meta}>
                  {transcript.segments.length} đoạn • {transcript.language.toUpperCase()}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Highlights Button */}
        <TouchableOpacity
          style={styles.highlightButton}
          onPress={handleShowHighlights}
        >
          <Text style={styles.highlightButtonText}>
             Xem Highlights ({highlights.length})
          </Text>
        </TouchableOpacity>

        {/* Segments */}
        <View style={styles.segments}>
          {transcript.segments.map((segment, index) => (
            <View
              key={segment.id}
              style={[
                styles.segment,
                segment.isHighlighted && {
                  backgroundColor: getHighlightColor(segment.highlightColor)
                }
              ]}
              onLayout={(event) => {
                const { y } = event.nativeEvent.layout;
                setSegmentPositions(prev => ({ ...prev, [segment.id]: y }));
              }}
            >
              <View style={styles.segmentHeader}>
                <Text style={styles.timestamp}>
                  {formatTime(segment.start)} - {formatTime(segment.end)}
                </Text>
                <View style={styles.segmentActions}>
                  <TouchableOpacity onPress={() => handleEditSegment(segment)}>
                    <Text style={styles.actionIcon}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleToggleHighlight(segment)}>
                    <Text style={styles.actionIcon}>
                      {segment.isHighlighted ? '★' : '☆'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {editingSegmentId === segment.id ? (
                <View>
                  <TextInput
                    style={styles.segmentInput}
                    value={editText}
                    onChangeText={setEditText}
                    multiline
                  />
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => setEditingSegmentId(null)}
                    >
                      <Text style={styles.buttonText}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.saveButton]}
                      onPress={handleSaveSegment}
                    >
                      <Text style={styles.buttonText}>Lưu</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={styles.segmentText}>{segment.text}</Text>
              )}

              {segment.isEdited && (
                <Text style={styles.editedLabel}>✓ Đã chỉnh sửa</Text>
              )}
              {segment.highlightNote && (
                <Text style={styles.highlightNote}>📝 {segment.highlightNote}</Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Highlights Modal */}
      <Modal
        visible={showHighlights}
        animationType="slide"
        transparent
        onRequestClose={() => setShowHighlights(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Highlights</Text>
              <TouchableOpacity onPress={() => setShowHighlights(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={highlights}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.highlightItem,
                    { backgroundColor: getHighlightColor(item.highlightColor) }
                  ]}
                  onPress={() => scrollToSegment(item.id)}
                >
                  <Text style={styles.highlightTime}>
                    {formatTime(item.start)} - {formatTime(item.end)}
                  </Text>
                  <Text style={styles.highlightText}>{item.text}</Text>
                  {item.highlightNote && (
                    <Text style={styles.highlightNote}>📝 {item.highlightNote}</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '700', flex: 1 },
  editIcon: { fontSize: 20, marginLeft: 8 },
  description: { fontSize: 14, color: '#666', marginTop: 8 },
  metaRow: { marginTop: 8 },
  meta: { fontSize: 13, color: '#999' },
  titleInput: { fontSize: 20, fontWeight: '600', borderBottomWidth: 1, borderBottomColor: '#ccc', paddingVertical: 8, marginBottom: 12 },
  descInput: { fontSize: 14, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end' },
  button: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
  cancelButton: { backgroundColor: '#e5e5e5' },
  saveButton: { backgroundColor: '#3b82f6' },
  buttonText: { color: '#fff', fontWeight: '600' },
  highlightButton: { margin: 16, padding: 12, backgroundColor: '#fef3c7', borderRadius: 8, alignItems: 'center' },
  highlightButtonText: { fontSize: 16, fontWeight: '600', color: '#92400e' },
  segments: { padding: 16 },
  segment: { marginBottom: 16, padding: 12, borderRadius: 8, backgroundColor: '#f9fafb' },
  segmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  timestamp: { fontSize: 12, color: '#666', fontWeight: '500' },
  segmentActions: { flexDirection: 'row', gap: 12 },
  actionIcon: { fontSize: 18 },
  segmentText: { fontSize: 15, lineHeight: 22, color: '#1a1a1a' },
  segmentInput: { fontSize: 15, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: 'top', marginBottom: 8 },
  editedLabel: { fontSize: 11, color: '#059669', marginTop: 8, fontWeight: '500' },
  highlightNote: { fontSize: 12, color: '#666', marginTop: 8, fontStyle: 'italic' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  closeButton: { fontSize: 24, color: '#666' },
  highlightItem: { padding: 16, marginHorizontal: 16, marginTop: 12, borderRadius: 8 },
  highlightTime: { fontSize: 12, color: '#666', marginBottom: 4, fontWeight: '500' },
  highlightText: { fontSize: 15, color: '#1a1a1a', lineHeight: 22 }
});