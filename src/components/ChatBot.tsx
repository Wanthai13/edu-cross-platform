import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { chatWithTranscript } from '../api/chatbot';
import { COLORS } from '../theme/colors';

type Msg = { id: string; from: 'user' | 'ai'; text: string };

type Props = {
  transcriptId: string;
  placeholder?: string;
};

export default function ChatBot({ transcriptId, placeholder }: Props) {
  const [messages, setMessages] = useState<Msg[]>([
    { id: 'welcome', from: 'ai', text: 'Hi! I can answer questions about this session. Ask me anything.' },
  ]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<Msg> | null>(null);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Msg = { id: String(Date.now()), from: 'user', text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setText('');
    setLoading(true);
    try {
      const resp = await chatWithTranscript(transcriptId, trimmed);
      const reply = (resp && (resp.reply ?? resp)) || "I'm sorry, I couldn't generate a response.";
      const aiMsg: Msg = { id: String(Date.now() + 1), from: 'ai', text: reply };
      setMessages((m) => [...m, aiMsg]);
      // scroll after a small delay to allow render
      setTimeout(() => {
        try {
          (listRef.current as any)?.scrollToEnd({ animated: true });
        } catch (e) {
          // ignore
        }
      }, 100);
    } catch (e) {
      console.warn(e);
      setMessages((m) => [...m, { id: String(Date.now() + 2), from: 'ai', text: 'Sorry, an error occurred while contacting the AI.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container} keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={[styles.row, item.from === 'user' ? styles.rowUser : styles.rowAi]}>
            <View style={[styles.bubble, item.from === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
              <Text style={[styles.msgText, item.from === 'user' ? styles.msgTextUser : styles.msgTextAi]}>{item.text}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder ?? 'Ask a question about the session...'}
          style={styles.input}
          editable={!loading}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <TouchableOpacity style={[styles.sendBtn, loading && { opacity: 0.6 }]} onPress={send} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  row: { marginVertical: 6, flexDirection: 'row' },
  rowUser: { justifyContent: 'flex-end' },
  rowAi: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 12 },
  bubbleUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleAi: { backgroundColor: COLORS.card, borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14 },
  msgTextUser: { color: '#fff' },
  msgTextAi: { color: COLORS.textMain },
  inputRow: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: COLORS.card, alignItems: 'center' },
  input: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#F8FAFC', borderRadius: 10, marginRight: 8 },
  sendBtn: { backgroundColor: COLORS.primary, padding: 10, borderRadius: 10 },
});
