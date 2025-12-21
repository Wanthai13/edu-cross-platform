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
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from './../AppNavigator';
import {
  transcriptService,
  TranscriptDetail,
  Segment
} from '../services/transcriptService';
import { transcriptEvents } from '../utils/transcriptEvents';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

type Props = NativeStackScreenProps<RootStackParamList, 'TranscriptDetail'>;

export default function TranscriptDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const scrollViewRef = useRef<ScrollView>(null);
  const { colors, isDark } = useTheme();
  const { language, t } = useLanguage();
  
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
      
      // Load highlights count
      const highlightsData = await transcriptService.fetchHighlights(id);
      setHighlights(highlightsData);
    } catch (error) {
      console.error('🔴 Load error:', error);
      Alert.alert(language === 'vi' ? 'Lỗi' : 'Error', 
        language === 'vi' ? 'Không thể tải transcript' : 'Failed to load transcript');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMetadata = async () => {
    try {
      console.log('🔵 Saving metadata:', { title, description });

      await transcriptService.updateTranscriptMetadata(id, { title, description });
      setEditingTitle(false);
      Alert.alert(language === 'vi' ? 'Thành công' : 'Success', 
        language === 'vi' ? 'Đã cập nhật thông tin' : 'Information updated');
      loadTranscript();
      
      // Emit event to notify other screens
      transcriptEvents.emit();
    } catch (error) {
      console.error('🔴 Save metadata error:', error);
      Alert.alert(language === 'vi' ? 'Lỗi' : 'Error', 
        language === 'vi' ? 'Không thể cập nhật' : 'Failed to update');
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
      Alert.alert(language === 'vi' ? 'Thành công' : 'Success', 
        language === 'vi' ? 'Đã cập nhật đoạn text' : 'Segment updated');
      loadTranscript();
      
      // Emit event to notify other screens
      transcriptEvents.emit();
    } catch (error) {
      console.error('🔴 Save segment error:', error);
      Alert.alert(language === 'vi' ? 'Lỗi' : 'Error', 
        language === 'vi' ? 'Không thể cập nhật' : 'Failed to update');
    }
  };

  const handleToggleHighlight = async (segment: Segment) => {
    const colorOptions = [
      { name: 'Yellow', value: 'yellow', color: '#fef08a' },
      { name: 'Green', value: 'green', color: '#bbf7d0' },
      { name: 'Blue', value: 'blue', color: '#bfdbfe' },
      { name: 'Red', value: 'red', color: '#fecaca' },
      { name: 'Purple', value: 'purple', color: '#e9d5ff' }
    ];
    
    if (segment.isHighlighted) {
      try {
        console.log('🔵 Removing highlight:', segment.id);

        await transcriptService.updateSegmentHighlight(id, segment.id, false);
        loadTranscript();
        transcriptEvents.emit();
      } catch (error) {
        console.error('🔴 Remove highlight error:', error);
        Alert.alert(language === 'vi' ? 'Lỗi' : 'Error', 
          language === 'vi' ? 'Không thể bỏ highlight' : 'Failed to remove highlight');
      }
    } else {
      Alert.alert(
        language === 'vi' ? 'Chọn màu highlight' : 'Choose highlight color',
        '',
        [
          { text: language === 'vi' ? 'Hủy' : 'Cancel', style: 'cancel' },
          ...colorOptions.map(opt => ({
            text: opt.name,
            onPress: async () => {
              try {
                console.log('🔵 Adding highlight:', segment.id, opt.value);

                await transcriptService.updateSegmentHighlight(id, segment.id, true, opt.value);
                loadTranscript();
                transcriptEvents.emit();
              } catch (error) {
                console.error('🔴 Add highlight error:', error);
                Alert.alert(language === 'vi' ? 'Lỗi' : 'Error', 
                  language === 'vi' ? 'Không thể highlight' : 'Failed to highlight');
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
      Alert.alert(language === 'vi' ? 'Lỗi' : 'Error', 
        language === 'vi' ? 'Không thể tải highlights' : 'Failed to load highlights');
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

  const getHighlightColor = (color?: string, forDark = false) => {
    const lightColors: { [key: string]: string } = {
      yellow: '#fef08a',
      green: '#bbf7d0',
      blue: '#bfdbfe',
      red: '#fecaca',
      purple: '#e9d5ff'
    };
    const darkColors: { [key: string]: string } = {
      yellow: '#854d0e40',
      green: '#16653440',
      blue: '#1e40af40',
      red: '#7f1d1d40',
      purple: '#581c8740'
    };
    const colorSet = forDark ? darkColors : lightColors;
    return colorSet[color || 'yellow'] || colorSet.yellow;
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

  if (!transcript) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="document-text-outline" size={64} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.text }]}>
          {language === 'vi' ? 'Không tìm thấy transcript' : 'Transcript not found'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView ref={scrollViewRef} style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header Card */}
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {editingTitle ? (
            <View>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {language === 'vi' ? 'Tiêu đề' : 'Title'}
              </Text>
              <TextInput
                style={[styles.titleInput, { 
                  backgroundColor: colors.inputBackground, 
                  borderColor: colors.inputBorder,
                  color: colors.text 
                }]}
                value={title}
                onChangeText={setTitle}
                placeholder={language === 'vi' ? 'Nhập tiêu đề...' : 'Enter title...'}
                placeholderTextColor={colors.placeholder}
              />
              
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 16 }]}>
                {language === 'vi' ? 'Mô tả (tùy chọn)' : 'Description (optional)'}
              </Text>
              <TextInput
                style={[styles.descInput, { 
                  backgroundColor: colors.inputBackground, 
                  borderColor: colors.inputBorder,
                  color: colors.text 
                }]}
                value={description}
                onChangeText={setDescription}
                placeholder={language === 'vi' ? 'Nhập mô tả...' : 'Enter description...'}
                placeholderTextColor={colors.placeholder}
                multiline
              />
              
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.surfaceVariant }]}
                  onPress={() => setEditingTitle(false)}
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                  <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                    {language === 'vi' ? 'Hủy' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={handleSaveMetadata}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={[styles.buttonText, { color: '#fff' }]}>
                    {language === 'vi' ? 'Lưu' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                  {title}
                </Text>
                <TouchableOpacity 
                  style={[styles.editTitleButton, { backgroundColor: colors.primaryLight }]}
                  onPress={() => setEditingTitle(true)}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
              
              {description ? (
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {description}
                </Text>
              ) : null}
              
              <View style={styles.metaRow}>
                <View style={[styles.metaBadge, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                  <Text style={[styles.metaText, { color: colors.primary }]}>
                    {transcript.segments.length} {language === 'vi' ? 'đoạn' : 'segments'}
                  </Text>
                </View>
                <View style={[styles.metaBadge, { backgroundColor: colors.accentLight }]}>
                  <Ionicons name="globe-outline" size={14} color={colors.accent} />
                  <Text style={[styles.metaText, { color: colors.accent }]}>
                    {transcript.language.toUpperCase()}
                  </Text>
                </View>
                {highlights.length > 0 && (
                  <View style={[styles.metaBadge, { backgroundColor: isDark ? '#854d0e30' : '#fef3c7' }]}>
                    <Ionicons name="star" size={14} color="#f59e0b" />
                    <Text style={[styles.metaText, { color: '#f59e0b' }]}>
                      {highlights.length}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Highlights Button */}
        {highlights.length > 0 && (
          <TouchableOpacity
            style={[styles.highlightButton, { 
              backgroundColor: isDark ? '#854d0e30' : '#fef3c7',
              borderColor: isDark ? '#92400e' : '#fcd34d'
            }]}
            onPress={handleShowHighlights}
          >
            <View style={styles.highlightButtonContent}>
              <View style={styles.highlightButtonLeft}>
                <View style={[styles.highlightIconBox, { backgroundColor: isDark ? '#78350f' : '#fbbf24' }]}>
                  <Ionicons name="star" size={18} color="#fff" />
                </View>
                <View>
                  <Text style={[styles.highlightButtonTitle, { color: isDark ? '#fbbf24' : '#92400e' }]}>
                    {language === 'vi' ? 'Các đoạn highlight' : 'Highlighted Segments'}
                  </Text>
                  <Text style={[styles.highlightButtonSubtitle, { color: isDark ? '#fcd34d' : '#b45309' }]}>
                    {highlights.length} {language === 'vi' ? 'đoạn được đánh dấu' : 'segments marked'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDark ? '#fbbf24' : '#92400e'} />
            </View>
          </TouchableOpacity>
        )}

        {/* Segments List */}
        <View style={styles.segmentsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📝 {language === 'vi' ? 'Nội dung' : 'Content'}
          </Text>
          
          {transcript.segments.map((segment, index) => (
            <View
              key={segment.id}
              style={[
                styles.segment,
                { 
                  backgroundColor: segment.isHighlighted 
                    ? getHighlightColor(segment.highlightColor, isDark) 
                    : colors.surface,
                  borderColor: segment.isHighlighted 
                    ? getHighlightColor(segment.highlightColor, false) 
                    : colors.border
                }
              ]}
              onLayout={(event) => {
                const { y } = event.nativeEvent.layout;
                setSegmentPositions(prev => ({ ...prev, [segment.id]: y + 200 }));
              }}
            >
              <View style={styles.segmentHeader}>
                <View style={[styles.timestampBadge, { backgroundColor: colors.surfaceVariant }]}>
                  <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                  <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                    {formatTime(segment.start)} - {formatTime(segment.end)}
                  </Text>
                </View>
                
                <View style={styles.segmentActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
                    onPress={() => handleEditSegment(segment)}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, { 
                      backgroundColor: segment.isHighlighted 
                        ? (isDark ? '#78350f' : '#fef3c7')
                        : colors.surfaceVariant 
                    }]}
                    onPress={() => handleToggleHighlight(segment)}
                  >
                    <Ionicons 
                      name={segment.isHighlighted ? 'star' : 'star-outline'} 
                      size={16} 
                      color={segment.isHighlighted ? '#f59e0b' : colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {editingSegmentId === segment.id ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={[styles.segmentInput, { 
                      backgroundColor: colors.inputBackground, 
                      borderColor: colors.inputBorder,
                      color: colors.text 
                    }]}
                    value={editText}
                    onChangeText={setEditText}
                    multiline
                    autoFocus
                  />
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: colors.surfaceVariant }]}
                      onPress={() => setEditingSegmentId(null)}
                    >
                      <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                        {language === 'vi' ? 'Hủy' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: colors.primary }]}
                      onPress={handleSaveSegment}
                    >
                      <Text style={[styles.buttonText, { color: '#fff' }]}>
                        {language === 'vi' ? 'Lưu' : 'Save'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={[styles.segmentText, { color: colors.text }]}>
                  {segment.text}
                </Text>
              )}

              {(segment.isEdited || segment.highlightNote) && (
                <View style={styles.segmentFooter}>
                  {segment.isEdited && (
                    <View style={[styles.editedBadge, { backgroundColor: colors.successLight }]}>
                      <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                      <Text style={[styles.editedLabel, { color: colors.success }]}>
                        {language === 'vi' ? 'Đã chỉnh sửa' : 'Edited'}
                      </Text>
                    </View>
                  )}
                  {segment.highlightNote && (
                    <View style={styles.noteContainer}>
                      <Ionicons name="chatbubble-outline" size={12} color={colors.textSecondary} />
                      <Text style={[styles.highlightNote, { color: colors.textSecondary }]}>
                        {segment.highlightNote}
                      </Text>
                    </View>
                  )}
                </View>
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
        <View style={[styles.modalContainer, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.modalTitleRow}>
                <View style={[styles.modalTitleIcon, { backgroundColor: isDark ? '#78350f' : '#fef3c7' }]}>
                  <Ionicons name="star" size={20} color="#f59e0b" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {language === 'vi' ? 'Highlights' : 'Highlights'}
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.closeButton, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => setShowHighlights(false)}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {highlights.length === 0 ? (
              <View style={styles.emptyHighlights}>
                <Ionicons name="star-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyHighlightsText, { color: colors.textSecondary }]}>
                  {language === 'vi' ? 'Chưa có highlight nào' : 'No highlights yet'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={highlights}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.highlightsList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.highlightItem,
                      { 
                        backgroundColor: getHighlightColor(item.highlightColor, isDark),
                        borderLeftColor: getHighlightColor(item.highlightColor, false)
                      }
                    ]}
                    onPress={() => scrollToSegment(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.highlightItemHeader}>
                      <View style={[styles.highlightTimeBadge, { backgroundColor: colors.surface }]}>
                        <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                        <Text style={[styles.highlightTime, { color: colors.textSecondary }]}>
                          {formatTime(item.start)} - {formatTime(item.end)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </View>
                    <Text style={[styles.highlightText, { color: colors.text }]} numberOfLines={3}>
                      {item.text}
                    </Text>
                    {item.highlightNote && (
                      <View style={styles.highlightNoteRow}>
                        <Ionicons name="chatbubble-outline" size={12} color={colors.textSecondary} />
                        <Text style={[styles.highlightNoteText, { color: colors.textSecondary }]}>
                          {item.highlightNote}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
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
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500'
  },
  scrollView: { 
    flex: 1 
  },
  
  // Header Card
  headerCard: { 
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3
  },
  titleRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    justifyContent: 'space-between' 
  },
  title: { 
    fontSize: 22, 
    fontWeight: '700', 
    flex: 1,
    lineHeight: 30
  },
  editTitleButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12
  },
  description: { 
    fontSize: 14, 
    marginTop: 10,
    lineHeight: 20
  },
  metaRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    marginTop: 14,
    gap: 8
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600'
  },
  
  // Input styles
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8
  },
  titleInput: { 
    fontSize: 18, 
    fontWeight: '600', 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 14
  },
  descInput: { 
    fontSize: 14, 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 14, 
    minHeight: 80, 
    textAlignVertical: 'top' 
  },
  buttonRow: { 
    flexDirection: 'row', 
    marginTop: 16, 
    justifyContent: 'flex-end',
    gap: 10
  },
  button: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12,
    gap: 6
  },
  buttonText: { 
    fontWeight: '600',
    fontSize: 14
  },
  
  // Highlights Button
  highlightButton: { 
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14, 
    borderRadius: 16, 
    borderWidth: 1
  },
  highlightButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  highlightButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  highlightIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  highlightButtonTitle: { 
    fontSize: 15, 
    fontWeight: '600'
  },
  highlightButtonSubtitle: {
    fontSize: 12,
    marginTop: 2
  },
  
  // Segments
  segmentsContainer: { 
    paddingHorizontal: 16 
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16
  },
  segment: { 
    marginBottom: 12, 
    padding: 16, 
    borderRadius: 16,
    borderWidth: 1
  },
  segmentHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  timestampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5
  },
  timestamp: { 
    fontSize: 12, 
    fontWeight: '500' 
  },
  segmentActions: { 
    flexDirection: 'row', 
    gap: 8 
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  segmentText: { 
    fontSize: 15, 
    lineHeight: 24 
  },
  editContainer: {
    marginTop: 8
  },
  segmentInput: { 
    fontSize: 15, 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 14, 
    minHeight: 100, 
    textAlignVertical: 'top',
    lineHeight: 22
  },
  segmentFooter: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  editedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4
  },
  editedLabel: { 
    fontSize: 11, 
    fontWeight: '500' 
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1
  },
  highlightNote: { 
    fontSize: 12, 
    fontStyle: 'italic',
    flex: 1
  },
  
  // Modal
  modalContainer: { 
    flex: 1, 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    maxHeight: '80%'
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 1 
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  modalTitleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '700' 
  },
  closeButton: { 
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyHighlights: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyHighlightsText: {
    marginTop: 12,
    fontSize: 15
  },
  highlightsList: {
    padding: 16
  },
  highlightItem: { 
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4
  },
  highlightItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  highlightTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4
  },
  highlightTime: { 
    fontSize: 11, 
    fontWeight: '500' 
  },
  highlightText: { 
    fontSize: 14, 
    lineHeight: 20 
  },
  highlightNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 5
  },
  highlightNoteText: { 
    fontSize: 12, 
    fontStyle: 'italic',
    flex: 1
  }
});
