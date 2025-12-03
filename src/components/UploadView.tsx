
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, useWindowDimensions, Alert, Modal } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { audioService } from '../services/audioService';

type Language = 'en' | 'vi';

const UI_TEXT: Record<string, any> = {
  en: {
    uploadView: {
      title: 'Upload or Record',
      subtitle: 'Upload audio/video or record directly to create learning materials',
      tabs: {
        upload: 'Upload',
        record: 'Record'
      },
      dragDrop: 'Drag and drop audio or video here',
      formats: 'MP3, WAV, M4A, MP4, MOV, WebM',
      browse: 'Browse files',
      cancel: 'Remove',
      button: 'Process with Whisper AI',
      languageLabel: 'Transcription Language',
      languageHint: 'Select the language spoken in your audio',
      languageModalTitle: 'Select Language',
      status: {
        uploading: 'Uploading to server',
        pending: 'Waiting in queue',
        processing: 'AI is transcribing',
        completed: 'Transcription completed',
        failed: 'Processing failed',
      },
      record: {
        listening: 'Recording…',
        ready: 'Ready to record',
        stopped: 'Recording saved'
      },
      errors: {
        noFile: 'Please select a file first',
        uploadFailed: 'Upload failed',
        notAuthenticated: 'Please login first',
        permissionDenied: 'Microphone permission denied',
        recordingFailed: 'Recording failed'
      }
    }
  },
  vi: {
    uploadView: {
      title: 'Tải lên hoặc Ghi âm',
      subtitle: 'Tải lên audio/video hoặc ghi âm trực tiếp để AI chuyển đổi thành văn bản',
      tabs: {
        upload: 'Tải lên',
        record: 'Ghi âm'
      },
      dragDrop: 'Kéo thả audio hoặc video vào đây',
      formats: 'MP3, WAV, M4A, MP4, MOV, WebM',
      browse: 'Chọn tệp',
      cancel: 'Xóa',
      button: 'Xử lý với Whisper AI',
      languageLabel: 'Ngôn ngữ chuyển đổi',
      languageHint: 'Chọn ngôn ngữ được nói trong audio',
      languageModalTitle: 'Chọn ngôn ngữ',
      status: {
        uploading: 'Đang tải lên server',
        pending: 'Đang chờ trong hàng',
        processing: 'AI đang chuyển đổi',
        completed: 'Hoàn thành chuyển đổi',
        failed: 'Xử lý thất bại',
      },
      record: {
        listening: 'Đang ghi...',
        ready: 'Sẵn sàng ghi',
        stopped: 'Đã lưu ghi âm'
      },
      errors: {
        noFile: 'Vui lòng chọn file trước',
        uploadFailed: 'Tải lên thất bại',
        notAuthenticated: 'Vui lòng đăng nhập trước',
        permissionDenied: 'Quyền truy cập microphone bị từ chối',
        recordingFailed: 'Ghi âm thất bại'
      }
    }
  }
};

const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect', flag: '🌐' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
];

type Props = {
  language?: Language;
  onUploadComplete?: (audioId: string, transcription: string) => void;
};

type UploadStatus = 'idle' | 'uploading' | 'pending' | 'processing' | 'completed' | 'failed';

interface FileInfo {
  name: string;
  size: number;
  uri?: string;
  type: 'audio' | 'video' | 'recording';
}

export default function UploadView({ language = 'en', onUploadComplete }: Props) {
  const t = UI_TEXT[language];
  const { width, height } = useWindowDimensions();
  const isSmall = width <= 360;

  const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');
  const [file, setFile] = useState<FileInfo | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentAudioId, setCurrentAudioId] = useState<string | null>(null);
  const [processingDetails, setProcessingDetails] = useState('');

  // Language selection
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [audioLevels, setAudioLevels] = useState(new Array(15).fill(10));
  const [recordingInstance, setRecordingInstance] = useState<Audio.Recording | null>(null);

  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<any>(null);
  const pollingRef = useRef<any>(null);

  // Recording animation
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setAudioLevels((prev) => prev.map(() => Math.floor(Math.random() * 80) + 10));
      }, 100);
    } else {
      setAudioLevels(new Array(15).fill(10));
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (recordingInstance) {
        recordingInstance.stopAndUnloadAsync().catch(console.error);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      console.log('🎤 Requesting microphone permission...');
      const permission = await Audio.requestPermissionsAsync();
      
      if (permission.status !== 'granted') {
        Alert.alert(
          t.uploadView.errors.permissionDenied,
          'Please enable microphone access in settings.'
        );
        return;
      }

      console.log('🎤 Permission granted, starting recording...');

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecordingInstance(recording);
      setIsRecording(true);
      setRecordingTime(0);
      setHasRecording(false);

      console.log('🎤 Recording started');

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev: number) => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('🔴 Recording error:', err);
      Alert.alert(
        t.uploadView.errors.recordingFailed,
        err.message || 'Could not start recording'
      );
    }
  };

  const handleStopRecording = async () => {
    try {
      if (!recordingInstance) {
        console.warn('No recording instance');
        return;
      }

      console.log('🎤 Stopping recording...');

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      setIsRecording(false);

      const uri = recordingInstance.getURI();
      await recordingInstance.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      console.log('🎤 Recording stopped, URI:', uri);

      if (uri) {
        const fileName = `Recording_${Date.now()}.mp3`;
        
        // Get file size (approximate based on duration and quality)
        const estimatedSize = recordingTime * 16000; // Rough estimate

        setFile({
          name: fileName,
          size: estimatedSize,
          uri: uri,
          type: 'recording',
        });
        setHasRecording(true);
        
        console.log('✅ Recording saved:', fileName);
      } else {
        throw new Error('Recording URI is null');
      }

      setRecordingInstance(null);

    } catch (err: any) {
      console.error('🔴 Stop recording error:', err);
      Alert.alert(
        t.uploadView.errors.recordingFailed,
        'Could not save recording'
      );
    }
  };

  const handleBrowseFiles = async () => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'video/*'],
        copyToCacheDirectory: true,
      });

      if ((result as any)?.type === 'success' || !(result as any)?.canceled) {
        const r = result as any;
        const name = r.name ?? r.assets?.[0]?.name ?? 'file';
        const size = r.size ?? r.assets?.[0]?.size ?? 0;
        const uri = r.uri ?? r.assets?.[0]?.uri;

        if (!uri) {
          Alert.alert('Error', 'Could not get file URI');
          return;
        }

        const type = name.match(/\.(mp4|mov|avi|mkv|webm)$/i) ? 'video' : 'audio';

        setFile({ name, size, uri, type });
        setError(null);
      }
    } catch (err) {
      console.warn('DocumentPicker error', err);
      Alert.alert('Error', 'Failed to select file');
    }
  };

  const handleFileChange = (event: any) => {
    const selectedFile = event?.target?.files?.[0];
    if (selectedFile) {
      const type = selectedFile.type.startsWith('video/') ? 'video' : 'audio';
      const uri = URL.createObjectURL(selectedFile);

      setFile({
        name: selectedFile.name,
        size: selectedFile.size,
        uri,
        type,
      });
      setError(null);
    }
  };

  const handleProcess = async () => {
    if (!file) {
      Alert.alert(t.uploadView.errors.noFile);
      return;
    }

    if (!file.uri) {
      Alert.alert('No file', 'File URI is missing');
      return;
    }

    try {
      setError(null);
      setStatus('uploading');
      setProcessingDetails('Uploading file to server...');

      console.log('📤 Uploading with language:', selectedLanguage);

      // Upload file with selected language
      const uploadResult = await audioService.uploadFile(
        file.uri,
        file.name,
        file.type,
        {
          title: file.name.replace(/\.[^/.]+$/, ''),
          tags: ['learning', 'transcription'],
          language: selectedLanguage,
        }
      );

      if (!uploadResult.success || !uploadResult.audio?._id) {
        throw new Error(uploadResult.message || 'Upload failed');
      }

      const audioId = uploadResult.audio._id;
      setCurrentAudioId(audioId);
      setStatus('pending');
      setProcessingDetails('File uploaded. Waiting for AI processing...');

      await pollTranscriptionStatus(audioId);

    } catch (err: any) {
      console.error('🔴 Process error:', err);
      setStatus('failed');
      setError(err.message || 'Processing failed');

      if (err.message?.includes('authenticated')) {
        Alert.alert(
          t.uploadView.errors.notAuthenticated,
          'Please login to upload files.'
        );
      } else {
        Alert.alert(
          t.uploadView.errors.uploadFailed,
          err.message || 'Please try again.'
        );
      }
    }
  };

  const pollTranscriptionStatus = async (audioId: string) => {
    let attempts = 0;
    const maxAttempts = 120;

    pollingRef.current = setInterval(async () => {
      try {
        attempts++;
        const result = await audioService.getAudio(audioId);

        if (result.audio) {
          const { status: audioStatus, transcription, processingError } = result.audio;

          if (audioStatus === 'pending') {
            setStatus('pending');
            setProcessingDetails('Waiting in queue...');
          } else if (audioStatus === 'processing') {
            setStatus('processing');
            setProcessingDetails('AI is transcribing your audio. This may take a few minutes...');
          } else if (audioStatus === 'completed') {
            clearInterval(pollingRef.current);
            setStatus('completed');
            setProcessingDetails('Transcription completed successfully!');

            if (onUploadComplete && transcription) {
              setTimeout(() => {
                onUploadComplete(audioId, transcription);
              }, 1500);
            }
          } else if (audioStatus === 'failed') {
            clearInterval(pollingRef.current);
            setStatus('failed');
            setError(processingError || 'Transcription failed');
            Alert.alert('Processing Failed', processingError || 'Please try again.');
          }
        }

        if (attempts >= maxAttempts) {
          clearInterval(pollingRef.current);
          setStatus('failed');
          setError('Processing timeout. Please try again later.');
          Alert.alert('Timeout', 'Processing took too long. Please check back later.');
        }
      } catch (err: any) {
        console.error('🔴 Polling error:', err);
        clearInterval(pollingRef.current);
        setStatus('failed');
        setError(err.message || 'Failed to check status');
      }
    }, 5000);
  };

  const handleRetry = () => {
    setStatus('idle');
    setError(null);
    setProcessingDetails('');
    setCurrentAudioId(null);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
  };

  const handleDragOver = (e: any) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: any) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    setIsDragging(false);

    const dropped = e?.dataTransfer?.files?.[0];
    if (dropped) {
      const type = dropped.type.startsWith('video/') ? 'video' : 'audio';
      const uri = URL.createObjectURL(dropped);

      setFile({
        name: dropped.name,
        size: dropped.size,
        uri,
        type,
      });
      setError(null);
    }
  };

  const getSelectedLanguageName = () => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage);
    return lang ? `${lang.flag} ${lang.name}` : '🌐 Auto Detect';
  };

  const handleLanguageSelect = (code: string) => {
    setSelectedLanguage(code);
    setShowLanguageModal(false);
  };

  // Status view
  if (status !== 'idle') {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.statusCard}>
          <View style={styles.statusIconContainer}>
            {status === 'completed' ? (
              <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            ) : status === 'failed' ? (
              <Ionicons name="close-circle" size={48} color="#ef4444" />
            ) : (
              <Ionicons name="hourglass-outline" size={48} color="#4f46e5" />
            )}
          </View>

          <Text style={styles.statusTitle}>{t.uploadView.status[status]}</Text>

          {status !== 'failed' && status !== 'completed' && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '60%' }]} />
            </View>
          )}

          <Text style={styles.processingDetails}>{processingDetails}</Text>

          {currentAudioId && (
            <Text style={styles.processId}>
              ID: {currentAudioId.substring(0, 8).toUpperCase()}
            </Text>
          )}

          {error && (
            <>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {Platform.OS === 'web' && React.createElement('input', {
        type: 'file',
        ref: fileInputRef,
        style: { display: 'none' },
        onChange: handleFileChange,
        accept: 'audio/*,video/*,.mp3,.wav,.mp4,.m4a,.mov,.webm,.ogg'
      })}

      <View style={styles.header}>
        <Text style={styles.title}>{t.uploadView.title}</Text>
        <Text style={styles.subtitle}>{t.uploadView.subtitle}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => setActiveTab('upload')}
            style={[styles.tab, activeTab === 'upload' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'upload' && styles.activeTabText]}>
              {t.uploadView.tabs.upload}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('record')}
            style={[styles.tab, activeTab === 'record' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'record' && styles.activeTabText]}>
              {t.uploadView.tabs.record}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardContent}>
  {activeTab === 'upload' ? (
    <View>
      {!file ? (
        <>
          {Platform.OS === 'web' ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{ width: '100%' }}
            >
              <View style={[styles.uploadArea, isDragging && styles.uploadAreaDragging]}>
                <View style={[styles.uploadIcon, isDragging && styles.uploadIconDragging]}>
                  <Ionicons name="cloud-upload-outline" size={32} color="#64748b" />
                </View>
                <Text style={styles.uploadTitle}>{t.uploadView.dragDrop}</Text>
                <Text style={styles.uploadFormats}>{t.uploadView.formats}</Text>
                <TouchableOpacity onPress={handleBrowseFiles} style={styles.browseButton}>
                  <Text style={styles.browseButtonText}>{t.uploadView.browse}</Text>
                </TouchableOpacity>
              </View>
            </div>
          ) : (
            <View style={styles.uploadArea}>
              <View style={styles.uploadIcon}>
                <Ionicons name="cloud-upload-outline" size={32} color="#64748b" />
              </View>
              <Text style={styles.uploadTitle}>Tap to select audio or video</Text>
              <Text style={styles.uploadFormats}>{t.uploadView.formats}</Text>
              <TouchableOpacity onPress={handleBrowseFiles} style={styles.browseButton}>
                <Text style={styles.browseButtonText}>{t.uploadView.browse}</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : (
        <View style={styles.fileInfo}>
          <View style={styles.fileIcon}>
            <Ionicons
              name={file.type === 'video' ? 'videocam' : 'musical-notes'}
              size={32}
              color="#10b981"
            />
          </View>
          <Text style={styles.fileName} numberOfLines={2}>
            {file.name}
          </Text>
          <Text style={styles.fileSize}>
            {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            style={styles.cancelButton}
          >
            <Ionicons name="close-circle" size={16} color="#ef4444" />
            <Text style={styles.cancelText}>{t.uploadView.cancel}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  ) : (
    <View style={styles.recordArea}>
      {!hasRecording ? (
        <>
          <View style={styles.visualizer}>
            {audioLevels.map((level, i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: level,
                    backgroundColor: isRecording ? '#ef4444' : '#cbd5e1',
                  },
                ]}
              />
            ))}
          </View>

          <Text style={styles.timer}>{formatTime(recordingTime)}</Text>
          <Text style={styles.recordStatus}>
            {isRecording ? t.uploadView.record.listening : t.uploadView.record.ready}
          </Text>

          {!isRecording ? (
            <TouchableOpacity onPress={handleStartRecording} style={styles.recordBtn}>
              <Ionicons name="mic" size={32} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleStopRecording} style={styles.stopBtn}>
              <Ionicons name="stop" size={32} color="white" />
            </TouchableOpacity>
          )}
        </>
      ) : (
        <View style={styles.fileInfo}>
          <View style={styles.fileIcon}>
            <Ionicons name="mic" size={32} color="#10b981" />
          </View>
          <Text style={styles.fileName}>New Recording</Text>
          <Text style={styles.fileSize}>Duration: {formatTime(recordingTime)}</Text>
          <TouchableOpacity
            onPress={() => {
              setHasRecording(false);
              setRecordingTime(0);
              setFile(null);
            }}
            style={styles.cancelButton}
          >
            <Ionicons name="refresh" size={16} color="#ef4444" />
            <Text style={styles.cancelText}>Record Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )}
</View>

        {/* Language Selection Section */}
        {file && (
          <View style={styles.languageSection}>
            <Text style={styles.languageLabel}>{t.uploadView.languageLabel}</Text>
            <Text style={styles.languageHint}>{t.uploadView.languageHint}</Text>

            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => setShowLanguageModal(true)}
            >
              <Text style={styles.languageButtonText}>{getSelectedLanguageName()}</Text>
              <Ionicons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.cardFooter}>
          <TouchableOpacity
            onPress={handleProcess}
            style={[styles.processButton, !file && styles.processButtonDisabled]}
            disabled={!file}
          >
            <Text style={styles.processButtonText}>{t.uploadView.button}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.languageModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.languageModalHeader}>
              <Text style={styles.languageModalTitle}>{t.uploadView.languageModalTitle}</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.languageModalList}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    selectedLanguage === lang.code && styles.languageOptionSelected,
                  ]}
                  onPress={() => handleLanguageSelect(lang.code)}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text
                    style={[
                      styles.languageOptionText,
                      selectedLanguage === lang.code && styles.languageOptionTextSelected,
                    ]}
                  >
                    {lang.name}
                  </Text>
                  {selectedLanguage === lang.code && (
                    <Ionicons name="checkmark" size={20} color="#4f46e5" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  contentContainer: { 
    padding: 20, 
    paddingBottom: 40 
  },
  centerContainer: { 
    flex: 1, 
    backgroundColor: '#f8fafc', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 20 
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 30 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#1e293b', 
    marginBottom: 8, 
    textAlign: 'center' 
  },
  subtitle: { 
    fontSize: 16, 
    color: '#64748b', 
    textAlign: 'center', 
    maxWidth: 400, 
    lineHeight: 22 
  },
  card: { 
    backgroundColor: 'white', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    overflow: 'hidden', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 8, 
    elevation: 2 
  },
  tabs: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f5f9' 
  },
  tab: { 
    flex: 1, 
    paddingVertical: 16, 
    alignItems: 'center', 
    borderBottomWidth: 2, 
    borderBottomColor: 'transparent' 
  },
  activeTab: { 
    backgroundColor: '#eff6ff', 
    borderBottomColor: '#4f46e5' 
  },
  tabText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#64748b' 
  },
  activeTabText: { 
    color: '#4f46e5' 
  },
  cardContent: { 
    padding: 40, 
    minHeight: 250, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  uploadArea: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    width: '100%', 
    height: 250, 
    padding: 16, 
    borderWidth: 2, 
    borderColor: '#e2e8f0', 
    borderRadius: 16, 
    borderStyle: 'dashed' 
  },
  uploadAreaDragging: { 
    borderColor: '#4f46e5', 
    backgroundColor: '#eff6ff' 
  },
  uploadIcon: { 
    width: 56, 
    height: 56, 
    backgroundColor: '#f1f5f9', 
    borderRadius: 28, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 16 
  },
  uploadIconDragging: { 
    backgroundColor: '#e0e7ff' 
  },
  uploadTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#334155', 
    marginBottom: 6, 
    textAlign: 'center' 
  },
  uploadFormats: { 
    fontSize: 14, 
    color: '#94a3b8', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  browseButton: { 
    backgroundColor: '#4f46e5', 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 12, 
    shadowColor: '#4f46e5', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 4 
  },
  browseButtonText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 14 
  },
  fileInfo: { 
    alignItems: 'center' 
  },
  fileIcon: { 
    width: 64, 
    height: 64, 
    backgroundColor: '#ecfdf5', 
    borderRadius: 32, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 16 
  },
  fileName: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1e293b', 
    marginBottom: 4, 
    maxWidth: 280,
    textAlign: 'center'
  },
  fileSize: { 
    fontSize: 14, 
    color: '#64748b', 
    marginBottom: 20 
  },
  cancelButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fef2f2', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  cancelText: { 
    color: '#ef4444', 
    fontWeight: '600', 
    fontSize: 12, 
    marginLeft: 4 
  },
  
  // Recording styles
  recordArea: { 
    alignItems: 'center', 
    width: '100%' 
  },
  visualizer: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    height: 60, 
    marginBottom: 20 
  },
  bar: { 
    width: 6, 
    borderRadius: 3, 
    marginHorizontal: 2 
  },
  timer: { 
    fontSize: 48, 
    fontWeight: 'bold', 
    color: '#1e293b', 
    marginBottom: 8 
  },
  recordStatus: { 
    fontSize: 13, 
    fontWeight: 'bold', 
    color: '#94a3b8', 
    textTransform: 'uppercase', 
    letterSpacing: 1, 
    marginBottom: 24 
  },
  recordBtn: { 
    width: 72, 
    height: 72, 
    backgroundColor: '#ef4444', 
    borderRadius: 36, 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: '#ef4444', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8 
  },
  stopBtn: { 
    width: 72, 
    height: 72, 
    backgroundColor: '#1e293b', 
    borderRadius: 36, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  
  // Language selection styles
  languageSection: { 
    padding: 20, 
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1, 
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fafbfc'
  },
  languageLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#334155', 
    marginBottom: 4 
  },
  languageHint: { 
    fontSize: 12, 
    color: '#94a3b8', 
    marginBottom: 12 
  },
  languageButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: 'white', 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  languageButtonText: { 
    fontSize: 15, 
    color: '#1e293b', 
    fontWeight: '500',
    flex: 1
  },
  languageOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  languageOptionSelected: { 
    backgroundColor: '#eff6ff' 
  },
  languageFlag: { 
    fontSize: 20, 
    marginRight: 12 
  },
  languageOptionText: { 
    flex: 1,
    fontSize: 15, 
    color: '#475569' 
  },
  languageOptionTextSelected: { 
    color: '#4f46e5', 
    fontWeight: '600' 
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  languageModalContent: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  languageModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  languageModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  languageModalList: {
    maxHeight: 320,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'white',
  },
  
  // Footer styles
  cardFooter: { 
    backgroundColor: '#f8fafc', 
    padding: 24, 
    borderTopWidth: 1, 
    borderTopColor: '#f1f5f9', 
    alignItems: 'flex-end' 
  },
  processButton: { 
    backgroundColor: '#4f46e5', 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    shadowColor: '#4f46e5', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 4 
  },
  processButtonDisabled: { 
    backgroundColor: '#cbd5e1', 
    shadowOpacity: 0 
  },
  processButtonText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 14 
  },
  
  // Status card styles
  statusCard: { 
    backgroundColor: 'white', 
    padding: 40, 
    borderRadius: 24, 
    alignItems: 'center', 
    width: '100%', 
    maxWidth: 360, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 12 
  },
  statusIconContainer: { 
    width: 80, 
    height: 80, 
    backgroundColor: '#f5f3ff', 
    borderRadius: 40, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 20 
  },
  statusTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#1e293b', 
    marginBottom: 16, 
    textAlign: 'center' 
  },
  progressBar: { 
    width: '100%', 
    height: 8, 
    backgroundColor: '#f1f5f9', 
    borderRadius: 4, 
    overflow: 'hidden', 
    marginBottom: 16 
  },
  progressFill: { 
    height: '100%', 
    backgroundColor: '#4f46e5' 
  },
  processingDetails: { 
    fontSize: 14, 
    color: '#64748b', 
    textAlign: 'center', 
    marginBottom: 12, 
    lineHeight: 20 
  },
  processId: { 
    fontSize: 11, 
    color: '#94a3b8', 
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' 
  },
  errorText: { 
    fontSize: 13, 
    color: '#ef4444', 
    textAlign: 'center', 
    marginTop: 12, 
    marginBottom: 16 
  },
  retryButton: { 
    backgroundColor: '#4f46e5', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 10, 
    marginTop: 8 
  },
  retryButtonText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 14 
  },
});