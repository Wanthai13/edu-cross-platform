import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Platform, LogBox } from 'react-native';
import AppNavigator from './src/AppNavigator';
import { COLORS } from './src/theme/colors';
import { getApiBaseUrl } from './src/api/client';
import { initGenAI } from './src/services/genai';
import Constants from 'expo-constants';
import { AuthProvider } from './src/components/AuthContext';
LogBox.ignoreLogs([
  "The action 'REPLACE' with payload",
]);

export default function App() {
  // Log environment info to help debug network issues
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[APP START]', 'Platform:', Platform.OS, 'API_BASE_URL:', getApiBaseUrl(), 'debuggerHost:', (Constants as any)?.manifest?.debuggerHost || (Constants as any)?.debuggerHost);
  }
  // Initialize GenAI if key available via runtime override or Expo extra or env
  try {
    const globalKey = (global as any)?.__GENAI_API_KEY__;
    const expoKey = (Constants as any)?.manifest?.extra?.GENAI_API_KEY || (Constants as any)?.expoConfig?.extra?.GENAI_API_KEY;
    const envKey = process.env?.GENAI_API_KEY;
    const apiKey = globalKey || expoKey || envKey;
    if (apiKey) {
      initGenAI(apiKey);
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[APP START] GenAI initialized from', !!globalKey ? 'global' : !!expoKey ? 'expoExtra' : 'env');
      }
    } else if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[APP START] GenAI API key not found. Client-side GenAI fallbacks will be disabled until `initGenAI` is called.');
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Failed to initialize GenAI client', e);
  }
  return (
    <SafeAreaProvider>
      <AuthProvider>
      <NavigationContainer>
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
          <AppNavigator />
          <StatusBar style="auto" />
        </SafeAreaView>
      </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
