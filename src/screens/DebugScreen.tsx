import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, Keyboard } from 'react-native';
import client, { getApiBaseUrl } from '../api/client';
import { initGenAI } from '../services/genai';

export default function DebugScreen() {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [apiInput, setApiInput] = useState<string>('');
  const [genAiInput, setGenAiInput] = useState<string>('');
  const [resolved, setResolved] = useState<string | null>(null);

  const handlePing = async () => {
    setLoading(true);
    setLastResult(null);
    try {
      const resp = await client.get('/health');
      setLastResult(JSON.stringify(resp.data));
    } catch (err: any) {
      const msg = err?.response?.data ? JSON.stringify(err.response.data) : err?.message || String(err);
      setLastResult(`Error: ${msg}`);
      // Small user-facing alert
      Alert.alert('Ping failed', String(msg));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setResolved(getApiBaseUrl());
  }, []);

  const applyApiOverride = () => {
    const value = apiInput?.trim();
    if (!value) {
      (global as any).__API_BASE_URL__ = undefined;
      setResolved(getApiBaseUrl());
      Alert.alert('Cleared', 'API_BASE_URL override cleared');
      return;
    }
    (global as any).__API_BASE_URL__ = value;
    setResolved(getApiBaseUrl());
    Keyboard.dismiss();
    Alert.alert('Applied', `Set runtime API_BASE_URL to ${value}`);
  };

  const clearApiOverride = () => {
    (global as any).__API_BASE_URL__ = undefined;
    setResolved(getApiBaseUrl());
    setApiInput('');
    Alert.alert('Cleared', 'API_BASE_URL override cleared');
  };

  const applyGenAiKey = () => {
    const key = genAiInput?.trim();
    if (!key) {
      (global as any).__GENAI_API_KEY__ = undefined;
      Alert.alert('Cleared', 'GenAI API key cleared (client disabled)');
      return;
    }
    (global as any).__GENAI_API_KEY__ = key;
    try {
      initGenAI(key);
      Keyboard.dismiss();
      Alert.alert('Applied', 'GenAI client initialized');
    } catch (e: any) {
      Alert.alert('Init failed', e?.message || String(e));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Debug</Text>

      <Text style={styles.label}>Resolved API_BASE_URL:</Text>
      <Text style={styles.value}>{resolved ?? getApiBaseUrl()}</Text>

      <Text style={[styles.label, { marginTop: 12 }]}>Set runtime API base URL (dev only)</Text>
      <TextInput
        value={apiInput}
        onChangeText={setApiInput}
        placeholder="http://192.168.x.y:3000/api"
        style={styles.input}
        autoCapitalize="none"
        keyboardType="url"
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity style={[styles.smallButton, { flex: 1 }]} onPress={applyApiOverride}>
          <Text style={styles.buttonText}>Apply</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.smallButton, { flex: 1, backgroundColor: '#ef4444' }]} onPress={clearApiOverride}>
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { marginTop: 12 }]}>Set GenAI API key (dev only)</Text>
      <TextInput
        value={genAiInput}
        onChangeText={setGenAiInput}
        placeholder="GENAI_API_KEY"
        style={styles.input}
        autoCapitalize="none"
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity style={[styles.smallButton, { flex: 1 }]} onPress={applyGenAiKey}>
          <Text style={styles.buttonText}>Apply Key</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.smallButton, { flex: 1, backgroundColor: '#ef4444' }]}
          onPress={() => {
            setGenAiInput('');
            (global as any).__GENAI_API_KEY__ = undefined;
            Alert.alert('Cleared', 'GenAI API key cleared');
          }}
        >
          <Text style={styles.buttonText}>Clear Key</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handlePing} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Ping /health</Text>}
      </TouchableOpacity>

      <View style={styles.resultBox}>
        <Text style={styles.resultLabel}>Last result:</Text>
        <Text style={styles.resultText}>{lastResult ?? 'No result yet'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  label: { color: '#64748b' },
  value: { marginBottom: 16, color: '#111827', fontWeight: '600' },
  button: { backgroundColor: '#4f46e5', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: 'white', fontWeight: '700' },
  resultBox: { backgroundColor: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  resultLabel: { color: '#64748b', marginBottom: 6 },
  resultText: { color: '#111827' },
});
