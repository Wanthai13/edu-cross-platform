import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

// Try to import Voice, but handle if it's not available (Expo Go)
let Voice: any = null;
try {
  Voice = require('@react-native-voice/voice').default;
} catch (e) {
  console.log('Voice module not available (expected in Expo Go)');
}

type Language = 'vi-VN' | 'en-US';

interface Props {
  onSave?: (data: { audioUri: string; transcript: string; duration: number; language: string }) => void;
  onCancel?: () => void;
  language?: 'vi' | 'en';
}

export default function LiveRecording({ onSave, onCancel, language = 'vi' }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceAvailable, setVoiceAvailable] = useState(true);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<any>(null);
  const voiceLocale: Language = language === 'vi' ? 'vi-VN' : 'en-US';

  // Initialize Voice
  useEffect(() => {
    const initVoice = async () => {
      // Check if Voice module is available (not in Expo Go)
      if (!Voice) {
        console.log('Voice module not loaded (Expo Go does not support native modules)');
        setVoiceAvailable(false);
        return;
      }

      try {
        // Check if voice is available on device
        const available = await Voice.isAvailable();
        setVoiceAvailable(!!available);

        if (!available) {
          console.log('Voice recognition not available on this device');
          return;
        }

        // Set up Voice event handlers
        Voice.onSpeechStart = onSpeechStart;
        Voice.onSpeechEnd = onSpeechEnd;
        Voice.onSpeechResults = onSpeechResults;
        Voice.onSpeechPartialResults = onSpeechPartialResults;
        Voice.onSpeechError = onSpeechError;
      } catch (err) {
        console.error('Voice init error:', err);
        setVoiceAvailable(false);
      }
    };

    initVoice();

    return () => {
      if (Voice) {
        Voice.destroy().then(() => Voice.removeAllListeners()).catch(() => {});
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const onSpeechStart = (e: any) => {
    console.log('🎤 Speech started');
  };

  const onSpeechEnd = (e: any) => {
    console.log('🎤 Speech ended');
  };

  const onSpeechResults = (e: any) => {
    if (e.value && e.value.length > 0) {
      const newText = e.value[0];
      setTranscript(prev => {
        // Append new result to existing transcript
        if (prev) {
          return prev + ' ' + newText;
        }
        return newText;
      });
      setPartialTranscript('');
    }
  };

  const onSpeechPartialResults = (e: any) => {
    if (e.value && e.value.length > 0) {
      setPartialTranscript(e.value[0]);
    }
  };

  const onSpeechError = (e: any) => {
    console.error('🔴 Speech error:', e.error);
    // Don't show error for common interruptions
    if (e.error?.code !== '7' && e.error?.code !== '5') {
      setError(`Speech recognition error: ${e.error?.message || 'Unknown error'}`);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {   
      setError(null);
      setIsProcessing(true);

      // Request microphone permission
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Lỗi', 'Cần quyền truy cập microphone để ghi âm');
        setIsProcessing(false);
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start audio recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;

      // Start voice recognition if available
      if (voiceAvailable && Voice) {
        try {
          await Voice.start(voiceLocale);
        } catch (voiceErr) {
          console.log('Voice start error (will continue without):', voiceErr);
        }
      }

      // Start timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      setIsRecording(true);
      setIsProcessing(false);
      console.log('🎤 Recording started');

    } catch (err: any) {
      console.error('🔴 Start recording error:', err);
      setError(err.message || 'Không thể bắt đầu ghi âm');
      setIsProcessing(false);
    }
  };

  const stopRecording = async () => {
    try {
      setIsProcessing(true);

      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop voice recognition
      if (voiceAvailable && Voice) {
        try {
          await Voice.stop();
        } catch (e) {
          console.log('Voice stop error:', e);
        }
      }

      // Stop audio recording
      if (recordingRef.current) {
        const uri = recordingRef.current.getURI();
        await recordingRef.current.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
        setAudioUri(uri);
        recordingRef.current = null;
        console.log('🎤 Recording stopped, URI:', uri);
      }

      setIsRecording(false);
      setIsProcessing(false);

    } catch (err: any) {
      console.error('🔴 Stop recording error:', err);
      setError(err.message || 'Không thể dừng ghi âm');
      setIsProcessing(false);
    }
  };

  const restartVoiceRecognition = async () => {
    // Restart voice recognition if it stops (common behavior)
    if (isRecording && voiceAvailable && Voice) {
      try {
        await Voice.start(voiceLocale);
      } catch (e) {
        console.log('Restart voice error:', e);
      }
    }
  };

  const handleSave = () => {
    if (!audioUri) {
      Alert.alert('Lỗi', 'Không có file ghi âm');
      return;
    }

    const finalTranscript = transcript + (partialTranscript ? ' ' + partialTranscript : '');
    
    onSave?.({
      audioUri,
      transcript: finalTranscript.trim(),
      duration: recordingTime,
      language: language,
    });
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    onCancel?.();
  };

  const handleReset = () => {
    setTranscript('');
    setPartialTranscript('');
    setAudioUri(null);
    setRecordingTime(0);
    setError(null);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {language === 'vi' ? '🎤 Ghi âm trực tiếp' : '🎤 Live Recording'}
        </Text>
        <Text style={styles.subtitle}>
          {language === 'vi' 
            ? 'Transcript hiện real-time, có thể chỉnh sửa ngay'
            : 'Real-time transcript with live editing'}
        </Text>
      </View>

      {/* Timer & Status */}
      <View style={styles.timerContainer}>
        <Text style={[styles.timer, isRecording && styles.timerRecording]}>
          {formatTime(recordingTime)}
        </Text>
        <View style={styles.statusContainer}>
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>
                {language === 'vi' ? 'Đang ghi...' : 'Recording...'}
              </Text>
            </View>
          )}
          {!voiceAvailable && (
            <View style={styles.warningContainer}>
              <Ionicons name="information-circle" size={16} color="#f59e0b" />
              <Text style={styles.warningText}>
                {language === 'vi' 
                  ? 'Real-time transcript không khả dụng trong Expo Go. Bạn vẫn có thể ghi âm và nhập transcript thủ công.'
                  : 'Real-time transcript not available in Expo Go. You can still record and enter transcript manually.'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Transcript Editor */}
      <View style={styles.transcriptContainer}>
        <View style={styles.transcriptHeader}>
          <Ionicons name="document-text-outline" size={18} color="#4f46e5" />
          <Text style={styles.transcriptLabel}>
            {language === 'vi' ? 'Transcript (chỉnh sửa được)' : 'Transcript (editable)'}
          </Text>
        </View>
        
        <ScrollView style={styles.transcriptScroll} nestedScrollEnabled>
          <TextInput
            style={styles.transcriptInput}
            multiline
            value={transcript + (partialTranscript ? ' ' + partialTranscript : '')}
            onChangeText={(text) => {
              setTranscript(text);
              setPartialTranscript('');
            }}
            placeholder={
              language === 'vi'
                ? 'Nội dung sẽ hiện ở đây khi bạn nói...\n\nBạn có thể chỉnh sửa trực tiếp.'
                : 'Content will appear here as you speak...\n\nYou can edit directly.'
            }
            placeholderTextColor="#9ca3af"
            editable={!isRecording} // Only editable when not recording
          />
        </ScrollView>

        {isRecording && partialTranscript && (
          <View style={styles.partialContainer}>
            <Text style={styles.partialLabel}>
              {language === 'vi' ? 'Đang nghe:' : 'Listening:'}
            </Text>
            <Text style={styles.partialText}>{partialTranscript}</Text>
          </View>
        )}
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={18} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Control Buttons */}
      <View style={styles.controls}>
        {!isRecording && !audioUri && (
          <TouchableOpacity
            style={styles.recordButton}
            onPress={startRecording}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="mic" size={32} color="#fff" />
                <Text style={styles.recordButtonText}>
                  {language === 'vi' ? 'Bắt đầu ghi' : 'Start Recording'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {isRecording && (
          <View style={styles.recordingControls}>
            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopRecording}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="stop" size={28} color="#fff" />
                  <Text style={styles.stopButtonText}>
                    {language === 'vi' ? 'Dừng' : 'Stop'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {voiceAvailable && (
              <TouchableOpacity
                style={styles.restartVoiceButton}
                onPress={restartVoiceRecognition}
              >
                <Ionicons name="refresh" size={20} color="#4f46e5" />
                <Text style={styles.restartVoiceText}>
                  {language === 'vi' ? 'Khởi động lại nhận diện' : 'Restart recognition'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {audioUri && !isRecording && (
          <View style={styles.savedControls}>
            <View style={styles.savedInfo}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.savedText}>
                {language === 'vi' 
                  ? `Đã ghi ${formatTime(recordingTime)}` 
                  : `Recorded ${formatTime(recordingTime)}`}
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                <Ionicons name="refresh" size={20} color="#6b7280" />
                <Text style={styles.resetButtonText}>
                  {language === 'vi' ? 'Ghi lại' : 'Record Again'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>
                  {language === 'vi' ? 'Lưu' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Cancel Button */}
      {onCancel && (
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>
            {language === 'vi' ? 'Hủy' : 'Cancel'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Tips */}
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>
          {language === 'vi' ? '💡 Mẹo:' : '💡 Tips:'}
        </Text>
        <Text style={styles.tipsText}>
          {language === 'vi'
            ? '• Nói rõ ràng, không quá nhanh\n• Nếu nhận diện dừng, nhấn "Khởi động lại nhận diện"\n• Có thể chỉnh sửa transcript sau khi dừng ghi'
            : '• Speak clearly, not too fast\n• If recognition stops, tap "Restart recognition"\n• You can edit transcript after stopping'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timer: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1e293b',
    fontVariant: ['tabular-nums'],
  },
  timerRecording: {
    color: '#ef4444',
  },
  statusContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
    maxWidth: 300,
  },
  warningText: {
    fontSize: 12,
    color: '#92400e',
    flex: 1,
    lineHeight: 18,
  },
  transcriptContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  transcriptLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
  },
  transcriptScroll: {
    flex: 1,
    maxHeight: 200,
  },
  transcriptInput: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1e293b',
    textAlignVertical: 'top',
    minHeight: 150,
  },
  partialContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  partialLabel: {
    fontSize: 12,
    color: '#92400e',
    marginBottom: 4,
  },
  partialText: {
    fontSize: 14,
    color: '#78350f',
    fontStyle: 'italic',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    flex: 1,
  },
  controls: {
    marginBottom: 16,
  },
  recordButton: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  recordingControls: {
    alignItems: 'center',
    gap: 12,
  },
  stopButton: {
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  restartVoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
    gap: 6,
  },
  restartVoiceText: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '500',
  },
  savedControls: {
    gap: 16,
  },
  savedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  savedText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    gap: 8,
  },
  resetButtonText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#10b981',
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 15,
  },
  tipsContainer: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 13,
    color: '#15803d',
    lineHeight: 20,
  },
});

