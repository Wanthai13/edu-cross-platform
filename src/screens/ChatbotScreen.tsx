import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';
import { chatWithTranscript } from '../api/chatbot';
import { COLORS } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Chatbot'>;

export default function ChatbotScreen({ route }: Props) {
  const { id } = route.params;
  const [messages, setMessages] = useState<{ from: 'user' | 'ai'; text: string }[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatRef = useRef<FlatList<any> | null>(null);

  async function send() {
    if (!text.trim()) return;
    const userMsg = text.trim();
    setMessages((m) => [...m, { from: 'user', text: userMsg }]);
    setText('');
    setLoading(true);
    try {
      const resp = await chatWithTranscript(id, userMsg);
      setMessages((m) => [...m, { from: 'ai', text: resp.reply }]);
    } catch (e) {
      console.warn(e);
      setMessages((m) => [...m, { from: 'ai', text: 'Có lỗi khi gọi AI.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        try {
          (flatRef.current as any)?.scrollToEnd({ animated: true });
        } catch (e) {
          // ignore
        }
      }, 100);
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.from === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={{ color: item.from === 'user' ? '#fff' : COLORS.textMain }}>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput value={text} onChangeText={setText} placeholder="Ask something..." style={styles.input} />
        <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff' }}>Send</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: COLORS.background },
  bubble: { marginVertical: 6, padding: 12, borderRadius: 12, maxWidth: '80%' },
  userBubble: { backgroundColor: COLORS.primary, alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: '#fff', alignSelf: 'flex-start' },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  input: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 12, marginRight: 8 },
  sendBtn: { backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
});
