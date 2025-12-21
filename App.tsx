import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Platform, LogBox, View } from 'react-native';
import AppNavigator from './src/AppNavigator';
import { getApiBaseUrl } from './src/api/client';
import { initGenAI } from './src/services/genai';
import Constants from 'expo-constants';
import { AuthProvider } from './src/components/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';

LogBox.ignoreLogs([
  "The action 'REPLACE' with payload",
]);

// Inner component that uses theme
function AppContent() {
  const { colors, isDark } = useTheme();
  
  return (
    <NavigationContainer>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
        <AppNavigator />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </SafeAreaView>
    </NavigationContainer>
  );
}

export default function App() {
  // Log environment info to help debug network issues
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[APP START]', 'Platform:', Platform.OS, 'API_BASE_URL:', getApiBaseUrl(), 'debuggerHost:', (Constants as any)?.manifest?.debuggerHost || (Constants as any)?.debuggerHost);
  }
  
  // Initialize GenAI if key available via runtime override, Expo extra or env
  try {
    const globalKey = (global as any)?.__GENAI_API_KEY__;
    const expoKey = (Constants as any)?.manifest?.extra?.GENAI_API_KEY
      || (Constants as any)?.expoConfig?.extra?.GENAI_API_KEY;
    // Prefer Expo public env vars so they are available on client
    const envKey =
      (process.env as any)?.EXPO_PUBLIC_GENAI_API_KEY ||
      (process.env as any)?.GENAI_API_KEY;
    const apiKey = globalKey || envKey || expoKey;
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
      <ThemeProvider>
        <LanguageProvider>
      <AuthProvider>
            <AppContent />
      </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
