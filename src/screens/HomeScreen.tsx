import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../theme/colors';
import { TYPO } from '../theme/typography';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.uploadIcon} onPress={() => navigation.navigate('Upload')}>
        <Ionicons name="cloud-upload-outline" size={26} color="#4f46e5" />
      </TouchableOpacity>
      <View style={styles.hero}>
        <View style={styles.illustration} />
        <Text style={[TYPO.title, styles.title]}>AI Learning Review Engine</Text>
        <Text style={styles.desc}>Tự động tóm tắt, sinh flashcards, quiz và đánh giá hiệu quả học tập từ audio/video.</Text>
      </View>
      <PrimaryButton title="View Sessions" onPress={() => navigation.navigate('Transcripts')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'space-between' },
  uploadIcon: { position: 'absolute', top: 18, right: 18, zIndex: 10, backgroundColor: '#fff', padding: 8, borderRadius: 20, borderWidth: 1, borderColor: '#eef2ff' },
  hero: { alignItems: 'center', marginTop: 36 },
  illustration: { width: 160, height: 120, backgroundColor: '#E8EEFF', borderRadius: 12, marginBottom: 18 },
  title: { textAlign: 'center', marginBottom: 8 },
  desc: { textAlign: 'center', color: COLORS.textMuted, paddingHorizontal: 12 },
});
