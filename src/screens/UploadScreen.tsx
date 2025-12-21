import React from 'react';
import { View, StyleSheet } from 'react-native';
import UploadView from '../components/UploadView';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';
import { transcriptEvents } from '../utils/transcriptEvents';
import { transcriptService } from '../services/transcriptService';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Upload'>;

export default function UploadScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { language } = useLanguage();

  const handleUploadComplete = async (transcriptId: string, fullText: string) => {
    console.log('📢 Upload complete, transcriptId:', transcriptId);
    console.log('📢 Current listeners:', transcriptEvents.listenerCount);
    
    // Emit events with delays to ensure DB is synced and all screens receive updates
    console.log('📢 Emitting transcript update events...');
    
    // First emit immediately for screens that are already mounted
    transcriptEvents.emit();
    
    // Emit with multiple delays to catch all screens
    const delays = [500, 1000, 1500, 2000, 3000];
    delays.forEach(delay => {
      transcriptEvents.emitDelayed(delay);
    });
    
    // Verify and navigate
    if (transcriptId) {
      // Wait for DB to sync, then navigate
      setTimeout(async () => {
        try {
          await transcriptService.fetchTranscriptById(transcriptId);
          console.log('✅ Transcript verified in DB');
        } catch (error) {
          console.log('⚠️ Transcript verification failed, but proceeding anyway');
        }
        
        // Navigate to detail screen
        navigation.navigate('TranscriptDetail', { id: transcriptId });
        
        // Final emit after navigation
        transcriptEvents.emitDelayed(500);
      }, 1200);
    } else {
      // No transcriptId, just go back
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <UploadView language={language} onUploadComplete={handleUploadComplete} />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
