import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

type PickedFile = {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

type Props = {
  onFileSelect: (file: PickedFile) => void;
  disabled?: boolean;
};

export default function FileUpload({ onFileSelect, disabled = false }: Props) {
  const [loading, setLoading] = React.useState(false);

  const pick = async () => {
    if (disabled) return;
    try {
      setLoading(true);
      const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*,video/*' });
      if ((res as any)?.type === 'success' && (res as any).uri) {
        const r = res as any;
        const file: PickedFile = {
          uri: r.uri,
          name: r.name ?? null,
          mimeType: r.mimeType ?? null,
          size: r.size ?? null,
        };
        onFileSelect(file);
      }
    } catch (e) {
      console.warn('DocumentPicker error', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={pick} disabled={disabled} style={[styles.container, disabled ? styles.disabled : null]}>
      <View style={styles.inner}>
        <View style={styles.iconWrap}>
          <Ionicons name="cloud-upload-outline" size={28} color={COLORS.primary} />
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.title}>Upload Lecture or Meeting</Text>
          <Text style={styles.subtitle}>Tap to browse audio/video or use drag-drop (web)</Text>
          <View style={styles.formatsRow}>
            <Text style={styles.format}>MP3 • WAV • M4A</Text>
            <Text style={[styles.format, { marginLeft: 12 }]}>MP4 • WEBM</Text>
          </View>
        </View>

        <View style={styles.actionWrap}>
          {loading ? <ActivityIndicator /> : <View style={styles.btn}><Text style={styles.btnText}>Select</Text></View>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E6EEF9',
    backgroundColor: '#fff',
    padding: 14,
  },
  inner: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#F0F6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  textWrap: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textMain },
  subtitle: { marginTop: 4, color: COLORS.textMuted, fontSize: 13 },
  formatsRow: { flexDirection: 'row', marginTop: 8 },
  format: { fontSize: 12, color: COLORS.textMuted },
  actionWrap: { marginLeft: 12 },
  btn: { backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
