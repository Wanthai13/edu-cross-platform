import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { audioService } from '../services/audioService';
import { analyzeMediaContent } from '../services/mediaAnalysis';
import LiveRecording from './LiveRecording';

type Language = 'en' | 'vi';

const UI_TEXT: Record<string, any> = {
  en: {
    uploadView: {
      title: 'Upload or Record',
      subtitle: 'Upload audio/video or record directly to create learning materials',
      tabs: {
        upload: 'Upload',
        record: 'Record',
        youtube: 'YouTube'
      },
      youtubeImport: {
        title: 'YouTube',
        urlPlaceholder: 'Paste YouTube URL (e.g., https://youtube.com/watch?v=...)',
        helper: '',
        button: 'Import from YouTube',
        validating: 'Validating URL...',
        fetching: 'Fetching captions...',
        processing: 'Creating transcript...'
      },
      dragDrop: 'Drag and drop audio or video here',
      formats: 'MP3, WAV, M4A, MP4, MOV, WebM',
      browse: 'Browse files',
      cancel: 'Remove',
      button: 'Process with Whisper AI',
      analyzeButton: 'Analyze Media (Gemini)',
      languageLabel: 'Transcription Language',
      languageHint: 'Select the language spoken in your audio/video',
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
        stopped: 'Recording saved',
        recordAgain: 'Record Again'
      },
      errors: {
        noFile: 'Please select a file first',
        uploadFailed: 'Upload failed',
        notAuthenticated: 'Please login first',
        permissionDenied: 'Microphone permission denied',
        recordingFailed: 'Recording failed',
        invalidYoutubeUrl: 'Invalid YouTube URL',
        youtubeImportFailed: 'Failed to import from YouTube',
        noSubtitles: 'No subtitles found for this video'
      },
      success: {
        youtubeImported: 'YouTube transcript created successfully!',
        recordingSaved: 'Recording saved successfully'
      }
    }
  },
  vi: {
    uploadView: {
      title: 'Tải lên hoặc Ghi âm',
      subtitle: 'Tải lên audio/video hoặc ghi âm trực tiếp để tạo tài liệu học tập',
      tabs: {
        upload: 'Tải lên',
        record: 'Ghi âm',
        youtube: 'YouTube'
      },
      youtubeImport: {
        title: 'Nhập từ YouTube',
        urlPlaceholder: 'Dán liên kết YouTube (vd: https://youtube.com/watch?v=...)',
        helper: 'Chúng tôi tự động lấy phụ đề để tạo bản chép lời',
        button: 'Nhập từ YouTube',
        validating: 'Đang kiểm tra URL...',
        fetching: 'Đang lấy phụ đề...',
        processing: 'Đang tạo transcript...'
      },
      dragDrop: 'Kéo thả audio hoặc video vào đây',
      formats: 'MP3, WAV, M4A, MP4, MOV, WebM',
      browse: 'Chọn tệp',
      cancel: 'Xóa',
      button: 'Xử lý với Whisper AI',
      analyzeButton: 'Phân tích Media (Gemini)',
      languageLabel: 'Ngôn ngữ chuyển đổi',
      languageHint: 'Chọn ngôn ngữ được nói trong audio/video',
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
        stopped: 'Đã lưu ghi âm',
        recordAgain: 'Ghi lại'
      },
      errors: {
        noFile: 'Vui lòng chọn file trước',
        uploadFailed: 'Tải lên thất bại',
        notAuthenticated: 'Vui lòng đăng nhập trước',
        permissionDenied: 'Quyền truy cập microphone bị từ chối',
        recordingFailed: 'Ghi âm thất bại',
        invalidYoutubeUrl: 'URL YouTube không hợp lệ',
        youtubeImportFailed: 'Không thể nhập từ YouTube',
        noSubtitles: 'Không tìm thấy phụ đề cho video này'
      },
      success: {
        youtubeImported: 'Đã tạo transcript từ YouTube thành công!',
        recordingSaved: 'Đã lưu ghi âm thành công'
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
  blob?: any;
}

export default function UploadView({ language = 'en', onUploadComplete }: Props) {
  const t = UI_TEXT[language];
  const { width, height } = useWindowDimensions();
  const isSmall = width <= 360;
  const isMobile = width <= 768;

  const [activeTab, setActiveTab] = useState<'upload' | 'record' | 'youtube'>('upload');
  const [file, setFile] = useState<FileInfo | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentAudioId, setCurrentAudioId] = useState<string | null>(null);
  const [processingDetails, setProcessingDetails] = useState('');

  // Language selection
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  
  // YouTube states
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeStep, setYoutubeStep] = useState('');
  
  // Analysis (web-only)
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [audioLevels, setAudioLevels] = useState(new Array(15).fill(10));
  const [recordingInstance, setRecordingInstance] = useState<Audio.Recording | null>(null);
  const [useLiveRecording, setUseLiveRecording] = useState(false); // Disable live recording for Expo Go compatibility
  const [liveTranscript, setLiveTranscript] = useState<string>('');

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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const validateYoutubeUrl = (url: string): boolean => {
    const patterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[\w-]+/,
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([^&\n?#]+)$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
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
        const fileName = `Recording_${Date.now()}.m4a`;
        const estimatedSize = recordingTime * 16000;

        setFile({
          name: fileName,
          size: estimatedSize,
          uri: uri,
          type: 'recording',
        });
        setHasRecording(true);
        
        console.log('✅ Recording saved:', fileName);
        
        if (Platform.OS !== 'web') {
          Alert.alert(
            t.uploadView.success.recordingSaved,
            `Duration: ${formatTime(recordingTime)}`
          );
        }
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
        blob: selectedFile,
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
          const { status: audioStatus, processingError } = result.audio;
          const transcriptObj = (result as any).transcript;

          if (audioStatus === 'pending') {
            setStatus('pending');
            setProcessingDetails(`Waiting in queue... (${attempts}/${maxAttempts})`);
          } else if (audioStatus === 'processing') {
            setStatus('processing');
            setProcessingDetails('AI is transcribing your audio. This may take a few minutes...');
          } else if (audioStatus === 'completed') {
            clearInterval(pollingRef.current);
            setStatus('completed');
            setProcessingDetails('Transcription completed successfully!');
            
            if (onUploadComplete) {
              const transcriptId = transcriptObj?._id as string | undefined;
              const fullText = (transcriptObj?.fullText as string | undefined) || '';
              setTimeout(() => {
                onUploadComplete(transcriptId || audioId, fullText);
              }, 1200);
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
        blob: dropped,
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

  const handleAnalyzeMedia = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Unsupported', 'Analyze Media is available on Web for now.');
      return;
    }
    if (!file?.blob) {
      Alert.alert('No file', 'Please select a file first.');
      return;
    }
    try {
      setAnalysisLoading(true);
      const result = await analyzeMediaContent(file.blob);
      setAnalysisResult(result);
      setShowAnalysisModal(true);
    } catch (err: any) {
      console.error('🔴 Analyze media error:', err);
      Alert.alert('Analysis Failed', err?.message || 'Could not analyze media.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleImportYoutube = async () => {
    const trimmedUrl = youtubeUrl.trim();
    
    // Validate URL
    if (!trimmedUrl || trimmedUrl.length < 8) {
      Alert.alert(
        t.uploadView.errors.invalidYoutubeUrl,
        'Please paste a valid YouTube URL.'
      );
      return;
    }

    if (!validateYoutubeUrl(trimmedUrl)) {
      Alert.alert(
        t.uploadView.errors.invalidYoutubeUrl,
        'URL format is incorrect. Please use a valid YouTube link.'
      );
      return;
    }

    const videoId = extractVideoId(trimmedUrl);
    if (!videoId) {
      Alert.alert(
        t.uploadView.errors.invalidYoutubeUrl,
        'Could not extract video ID from URL.'
      );
      return;
    }

    try {
      setYoutubeLoading(true);
      setYoutubeStep(t.uploadView.youtubeImport.validating);
      
      console.log('📺 Importing YouTube video:', videoId);

      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setYoutubeStep(t.uploadView.youtubeImport.fetching);
      
      const lang = selectedLanguage === 'auto' ? undefined : selectedLanguage;
      
      console.log('📺 Calling audioService.importFromYouTube with language:', lang);
      
      // Use audioService to call the API (works on both web and mobile)
      const data = await audioService.importFromYouTube(trimmedUrl, lang);
      
      setYoutubeStep(t.uploadView.youtubeImport.processing);
      
      console.log('✅ YouTube import successful:', data);

      const audioId = data?.audio?._id;

      if (!audioId) {
        throw new Error('No audio ID returned from server');
      }

      Alert.alert(
        t.uploadView.success.youtubeImported,
        `Video ID: ${videoId}\nProcessing started...`
      );
      
      // Call the completion callback
      if (onUploadComplete) {
        // Note: We don't have fullText yet as transcription is still processing
        // The callback will navigate to the detail page where polling will happen
        onUploadComplete(audioId, '');
      }
      
      // Reset form
      setYoutubeUrl('');
      setYoutubeStep('');
      
    } catch (err: any) {
      console.error('🔴 YouTube import error:', err);
      
      let errorMessage = err?.message || t.uploadView.errors.youtubeImportFailed;
      
      if (errorMessage.includes('subtitles') || errorMessage.includes('captions')) {
        errorMessage = t.uploadView.errors.noSubtitles;
      }
      
      Alert.alert(
        t.uploadView.errors.youtubeImportFailed,
        errorMessage
      );
      
      setYoutubeStep('');
    } finally {
      setYoutubeLoading(false);
    }
  };

  const handleClearRecording = () => {
    setHasRecording(false);
    setRecordingTime(0);
    setFile(null);
    setError(null);
    setLiveTranscript('');
  };

  // Handle live recording save
  const handleLiveRecordingSave = (data: { audioUri: string; transcript: string; duration: number; language: string }) => {
    console.log('🎤 Live recording saved:', data);
    
    const fileName = `LiveRecording_${Date.now()}.m4a`;
    setFile({
      name: fileName,
      size: data.duration * 16000, // Estimate
      uri: data.audioUri,
      type: 'recording',
    });
    setRecordingTime(data.duration);
    setLiveTranscript(data.transcript);
    setHasRecording(true);
    
    // Auto set language based on recording
    setSelectedLanguage(data.language === 'vi' ? 'vi' : 'en');
  };

  const handleClearFile = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
              <View style={styles.loadingSpinner}>
                <ActivityIndicator size="large" color="#4f46e5" />
              </View>
            )}
          </View>

          <Text style={styles.statusTitle}>{t.uploadView.status[status]}</Text>

          {(status === 'uploading' || status === 'pending' || status === 'processing') && (
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: status === 'uploading' ? '30%' : 
                           status === 'pending' ? '50%' : '75%' 
                  }
                ]} 
              />
            </View>
          )}

          <Text style={styles.processingDetails}>{processingDetails}</Text>

          {currentAudioId && (
            <View style={styles.processIdContainer}>
              <Text style={styles.processId}>
                ID: {currentAudioId.substring(0, 8).toUpperCase()}
              </Text>
            </View>
          )}

          {error && (
            <>
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
              <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                <Ionicons name="refresh" size={18} color="white" style={{ marginRight: 6 }} />
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
            <Ionicons 
              name="cloud-upload-outline" 
              size={18} 
              color={activeTab === 'upload' ? '#4f46e5' : '#64748b'} 
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === 'upload' && styles.activeTabText]}>
              {t.uploadView.tabs.upload}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('record')}
            style={[styles.tab, activeTab === 'record' && styles.activeTab]}
          >
            <Ionicons 
              name="mic-outline" 
              size={18} 
              color={activeTab === 'record' ? '#4f46e5' : '#64748b'} 
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === 'record' && styles.activeTabText]}>
              {t.uploadView.tabs.record}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('youtube')}
            style={[styles.tab, activeTab === 'youtube' && styles.activeTab]}
          >
            <Ionicons 
              name="logo-youtube" 
              size={18} 
              color={activeTab === 'youtube' ? '#4f46e5' : '#64748b'} 
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === 'youtube' && styles.activeTabText]}>
              {t.uploadView.tabs.youtube}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardContent}>
          {activeTab === 'upload' ? (
            <View style={{ width: '100%' }}>
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
                          <Ionicons name="folder-open-outline" size={16} color="white" style={{ marginRight: 6 }} />
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
                        <Ionicons name="folder-open-outline" size={16} color="white" style={{ marginRight: 6 }} />
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
                    {formatFileSize(file.size)} • {file.type}
                  </Text>
                  <TouchableOpacity
                    onPress={handleClearFile}
                    style={styles.cancelButton}
                  >
                    <Ionicons name="close-circle" size={16} color="#ef4444" />
                    <Text style={styles.cancelText}>{t.uploadView.cancel}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : activeTab === 'record' ? (
            <View style={styles.recordArea}>
              {useLiveRecording && !hasRecording ? (
                // Live Recording with real-time transcript
                <LiveRecording
                  language={selectedLanguage === 'vi' ? 'vi' : 'en'}
                  onSave={handleLiveRecordingSave}
                  onCancel={() => setActiveTab('upload')}
                />
              ) : !hasRecording ? (
                // Fallback to basic recording (without live transcript)
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
                // Recording completed - show preview with transcript input
                <View style={styles.fileInfo}>
                  <View style={styles.fileIcon}>
                    <Ionicons name="mic" size={32} color="#10b981" />
                  </View>
                  <Text style={styles.fileName}>
                    {liveTranscript ? '🎤 Ghi âm với Transcript' : '🎤 Ghi âm mới'}
                  </Text>
                  <Text style={styles.fileSize}>Thời lượng: {formatTime(recordingTime)}</Text>
                  
                  {/* Transcript input area */}
                  <View style={styles.transcriptInputContainer}>
                    <Text style={styles.transcriptInputLabel}>
                      📝 Nhập transcript (tùy chọn):
                    </Text>
                    <TextInput
                      style={styles.transcriptTextInput}
                      multiline
                      numberOfLines={4}
                      value={liveTranscript}
                      onChangeText={setLiveTranscript}
                      placeholder="Nhập nội dung transcript ở đây...&#10;Bạn có thể để trống nếu muốn dùng Whisper AI để tự động chuyển đổi."
                      placeholderTextColor="#9ca3af"
                      textAlignVertical="top"
                    />
                  </View>
                  
                  <TouchableOpacity
                    onPress={handleClearRecording}
                    style={styles.cancelButton}
                  >
                    <Ionicons name="refresh" size={16} color="#ef4444" />
                    <Text style={styles.cancelText}>{t.uploadView.record.recordAgain}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.youtubeArea}>
              <View style={styles.youtubeHeader}>
                <Ionicons name="logo-youtube" size={32} color="#ef4444" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.youtubeTitle}>{t.uploadView.youtubeImport.title}</Text>
                  <Text style={styles.youtubeHelper}>{t.uploadView.youtubeImport.helper}</Text>
                </View>
              </View>

              <View style={styles.youtubeInputContainer}>
                <Ionicons name="link-outline" size={20} color="#94a3b8" style={styles.youtubeInputIcon} />
                <TextInput
                  style={styles.youtubeInput}
                  value={youtubeUrl}
                  onChangeText={setYoutubeUrl}
                  placeholder={t.uploadView.youtubeImport.urlPlaceholder}
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType={Platform.OS === 'web' ? 'default' : 'url'}
                  editable={!youtubeLoading}
                />
                {youtubeUrl.length > 0 && !youtubeLoading && (
                  <TouchableOpacity 
                    onPress={() => setYoutubeUrl('')}
                    style={styles.youtubeClearButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              {youtubeStep && (
                <View style={styles.youtubeStepContainer}>
                  <ActivityIndicator size="small" color="#4f46e5" />
                  <Text style={styles.youtubeStepText}>{youtubeStep}</Text>
                </View>
              )}

              <View style={styles.youtubeLangRow}>
                <Text style={styles.languageLabel}>{t.uploadView.languageLabel}</Text>
                <TouchableOpacity 
                  style={styles.languageButton} 
                  onPress={() => setShowLanguageModal(true)}
                  disabled={youtubeLoading}
                >
                  <Text style={styles.languageButtonText}>{getSelectedLanguageName()}</Text>
                  <Ionicons name="chevron-down" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleImportYoutube}
                style={[
                  styles.processButton, 
                  (!youtubeUrl || youtubeLoading) && styles.processButtonDisabled
                ]}
                disabled={!youtubeUrl || youtubeLoading}
              >
                {youtubeLoading ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={[styles.processButtonText, { marginLeft: 8 }]}>Processing...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="white" style={{ marginRight: 6 }} />
                    <Text style={styles.processButtonText}>{t.uploadView.youtubeImport.button}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Language Selection Section for Upload Tab */}
        {file && activeTab === 'upload' && (
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

        {/* Language Selection Section for Recording Tab */}
        {hasRecording && activeTab === 'record' && (
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

        {/* Action Buttons */}
        {((activeTab === 'upload' && file) || (activeTab === 'record' && hasRecording)) && (
          <View style={styles.cardFooter}>
            <TouchableOpacity
              onPress={handleProcess}
              style={[styles.processButton, !file && styles.processButtonDisabled]}
              disabled={!file}
            >
              <Ionicons name="sparkles-outline" size={18} color="white" style={{ marginRight: 6 }} />
              <Text style={styles.processButtonText}>{t.uploadView.button}</Text>
            </TouchableOpacity>
            
            {Platform.OS === 'web' && activeTab === 'upload' && (
              <TouchableOpacity
                onPress={handleAnalyzeMedia}
                style={[
                  styles.secondaryButton, 
                  (!file || analysisLoading) && styles.processButtonDisabled
                ]}
                disabled={!file || analysisLoading}
              >
                {analysisLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="analytics-outline" size={18} color="white" style={{ marginRight: 6 }} />
                    <Text style={styles.secondaryButtonText}>{t.uploadView.analyzeButton}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
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
                    <Ionicons name="checkmark-circle" size={20} color="#4f46e5" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Analysis Result Modal */}
      <Modal
        visible={showAnalysisModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAnalysisModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAnalysisModal(false)}
        >
          <View style={styles.analysisModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.languageModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="analytics" size={20} color="#4f46e5" style={{ marginRight: 8 }} />
                <Text style={styles.languageModalTitle}>Media Analysis Results</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAnalysisModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.analysisScroll}>
              {analysisResult ? (
                <View style={{ padding: 20 }}>
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>📝 Summary</Text>
                    <Text style={styles.analysisSummaryText}>
                      {analysisResult.summary || 'No summary available'}
                    </Text>
                  </View>

                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>📊 Statistics</Text>
                    <View style={styles.analysisStatsGrid}>
                      <View style={styles.analysisStat}>
                        <Text style={styles.analysisStatLabel}>Transcript Lines</Text>
                        <Text style={styles.analysisStatValue}>
                          {analysisResult.transcript?.length ?? 0}
                        </Text>
                      </View>
                      <View style={styles.analysisStat}>
                        <Text style={styles.analysisStatLabel}>Keywords</Text>
                        <Text style={styles.analysisStatValue}>
                          {analysisResult.keywords?.length ?? 0}
                        </Text>
                      </View>
                      <View style={styles.analysisStat}>
                        <Text style={styles.analysisStatLabel}>Flashcards</Text>
                        <Text style={styles.analysisStatValue}>
                          {analysisResult.flashcards?.length ?? 0}
                        </Text>
                      </View>
                      <View style={styles.analysisStat}>
                        <Text style={styles.analysisStatLabel}>Quiz Questions</Text>
                        <Text style={styles.analysisStatValue}>
                          {analysisResult.quiz?.length ?? 0}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {typeof analysisResult.meetingScore === 'number' && (
                    <View style={styles.analysisSection}>
                      <Text style={styles.analysisSectionTitle}>🎯 Meeting Score</Text>
                      <View style={styles.analysisScoreContainer}>
                        <Text style={styles.analysisScoreValue}>
                          {analysisResult.meetingScore}/100
                        </Text>
                        <View style={styles.analysisScoreBar}>
                          <View 
                            style={[
                              styles.analysisScoreFill, 
                              { width: `${analysisResult.meetingScore}%` }
                            ]} 
                          />
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Ionicons name="alert-circle-outline" size={48} color="#94a3b8" />
                  <Text style={[styles.analysisSummaryText, { marginTop: 12, textAlign: 'center' }]}>
                    No analysis results available
                  </Text>
                </View>
              )}
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
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#1e293b', 
    marginBottom: 8, 
    textAlign: 'center' 
  },
  subtitle: { 
    fontSize: 16, 
    color: '#64748b', 
    textAlign: 'center', 
    maxWidth: 500, 
    lineHeight: 24 
  },
  card: { 
    backgroundColor: 'white', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    overflow: 'hidden', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 12, 
    elevation: 3 
  },
  tabs: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f5f9' 
  },
  tab: { 
    flex: 1, 
    paddingVertical: 16, 
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center',
    borderBottomWidth: 3, 
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
    minHeight: 280, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  uploadArea: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    width: '100%', 
    minHeight: 250, 
    padding: 24, 
    borderWidth: 2, 
    borderColor: '#e2e8f0', 
    borderRadius: 16, 
    borderStyle: 'dashed',
    backgroundColor: '#fafbfc'
  },
  uploadAreaDragging: { 
    borderColor: '#4f46e5', 
    backgroundColor: '#eff6ff' 
  },
  uploadIcon: { 
    width: 64, 
    height: 64, 
    backgroundColor: '#f1f5f9', 
    borderRadius: 32, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 16 
  },
  uploadIconDragging: { 
    backgroundColor: '#dbeafe' 
  },
  uploadTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#334155', 
    marginBottom: 8, 
    textAlign: 'center' 
  },
  uploadFormats: { 
    fontSize: 14, 
    color: '#94a3b8', 
    marginBottom: 24, 
    textAlign: 'center' 
  },
  browseButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5', 
    paddingHorizontal: 24, 
    paddingVertical: 14, 
    borderRadius: 12, 
    shadowColor: '#4f46e5', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 6,
    elevation: 3
  },
  browseButtonText: { 
    color: 'white', 
    fontWeight: '700', 
    fontSize: 15 
  },
  fileInfo: { 
    alignItems: 'center',
    width: '100%'
  },
  fileIcon: { 
    width: 72, 
    height: 72, 
    backgroundColor: '#ecfdf5', 
    borderRadius: 36, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 16 
  },
  fileName: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#1e293b', 
    marginBottom: 6, 
    maxWidth: 320,
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
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fee2e2'
  },
  cancelText: { 
    color: '#ef4444', 
    fontWeight: '600', 
    fontSize: 13, 
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
    height: 80, 
    marginBottom: 24 
  },
  bar: { 
    width: 6, 
    borderRadius: 3, 
    marginHorizontal: 2 
  },
  timer: { 
    fontSize: 56, 
    fontWeight: 'bold', 
    color: '#1e293b', 
    marginBottom: 12,
    fontVariant: ['tabular-nums']
  },
  recordStatus: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#94a3b8', 
    textTransform: 'uppercase', 
    letterSpacing: 1.2, 
    marginBottom: 32 
  },
  recordBtn: { 
    width: 80, 
    height: 80, 
    backgroundColor: '#ef4444', 
    borderRadius: 40, 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: '#ef4444', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 12,
    elevation: 6
  },
  stopBtn: { 
    width: 80, 
    height: 80, 
    backgroundColor: '#1e293b', 
    borderRadius: 40, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8,
    elevation: 4
  },
  
  // Transcript input styles
  transcriptInputContainer: {
    width: '100%',
    marginTop: 16,
    marginBottom: 12,
  },
  transcriptInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  transcriptTextInput: {
    width: '100%',
    minHeight: 100,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    lineHeight: 20,
  },
  // Transcript preview styles (legacy)
  transcriptPreview: {
    width: '100%',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  transcriptPreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  transcriptPreviewText: {
    fontSize: 14,
    color: '#15803d',
    lineHeight: 20,
  },
  
  // YouTube styles
  youtubeArea: {
    width: '100%',
    maxWidth: 600
  },
  youtubeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fee2e2'
  },
  youtubeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4
  },
  youtubeHelper: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18
  },
  youtubeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: 'white',
    marginBottom: 16,
    paddingLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  youtubeInputIcon: {
    marginRight: 8
  },
  youtubeInput: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 12,
    fontSize: 15,
    color: '#0f172a'
  },
  youtubeClearButton: {
    padding: 8
  },
  youtubeStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginBottom: 16
  },
  youtubeStepText: {
    fontSize: 13,
    color: '#4f46e5',
    fontWeight: '600',
    marginLeft: 8
  },
  youtubeLangRow: {
    width: '100%',
    marginBottom: 20
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
    marginBottom: 6 
  },
  languageHint: { 
    fontSize: 12, 
    color: '#94a3b8', 
    marginBottom: 12,
    lineHeight: 16
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
    paddingVertical: 14,
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  languageOptionSelected: { 
    backgroundColor: '#eff6ff' 
  },
  languageFlag: { 
    fontSize: 24, 
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
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
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
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  languageModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fafbfc',
  },
  languageModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  languageModalList: {
    maxHeight: 400,
    paddingVertical: 4,
    backgroundColor: 'white',
  },
  analysisModalContent: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  analysisScroll: { 
    maxHeight: 500, 
    backgroundColor: 'white' 
  },
  analysisSection: {
    marginBottom: 24
  },
  analysisSectionTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#111827', 
    marginBottom: 12 
  },
  analysisSummaryText: { 
    fontSize: 14, 
    color: '#374151', 
    lineHeight: 22 
  },
  analysisStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8
  },
  analysisStat: {
    width: '50%',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginHorizontal: 0,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  analysisStatLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4
  },
  analysisStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b'
  },
  analysisScoreContainer: {
    alignItems: 'center'
  },
  analysisScoreValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#4f46e5',
    marginBottom: 12
  },
  analysisScoreBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden'
  },
  analysisScoreFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 6
  },
  
  // Footer styles
  cardFooter: { 
    backgroundColor: '#f8fafc', 
    padding: 24, 
    borderTopWidth: 1, 
    borderTopColor: '#f1f5f9', 
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    flexWrap: 'wrap'
  },
  processButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5', 
    paddingHorizontal: 24, 
    paddingVertical: 14, 
    borderRadius: 12, 
    shadowColor: '#4f46e5', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 6,
    elevation: 3
  },
  processButtonDisabled: { 
    backgroundColor: '#cbd5e1', 
    shadowOpacity: 0 
  },
  processButtonText: { 
    color: 'white', 
    fontWeight: '700', 
    fontSize: 15 
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3
  },
  secondaryButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15
  },
  
  // Status card styles
  statusCard: { 
    backgroundColor: 'white', 
    padding: 40, 
    borderRadius: 24, 
    alignItems: 'center', 
    width: '100%', 
    maxWidth: 420, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  statusIconContainer: { 
    width: 96, 
    height: 96, 
    backgroundColor: '#f5f3ff', 
    borderRadius: 48, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 24 
  },
  loadingSpinner: {
    padding: 8
  },
  statusTitle: { 
    fontSize: 22, 
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
    marginBottom: 20 
  },
  progressFill: { 
    height: '100%', 
    backgroundColor: '#4f46e5',
    borderRadius: 4
  },
  processingDetails: { 
    fontSize: 15, 
    color: '#64748b', 
    textAlign: 'center', 
    marginBottom: 16, 
    lineHeight: 22,
    paddingHorizontal: 20
  },
  processIdContainer: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8
  },
  processId: { 
    fontSize: 12, 
    color: '#94a3b8', 
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600'
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fee2e2'
  },
  errorText: { 
    fontSize: 13, 
    color: '#ef4444', 
    textAlign: 'center',
    flex: 1,
    marginLeft: 8
  },
  retryButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5', 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 10, 
    marginTop: 8,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  retryButtonText: { 
    color: 'white', 
    fontWeight: '700', 
    fontSize: 14 
  },
});