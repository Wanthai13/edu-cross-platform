// navigation/AppNavigator.tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import {
  HomeScreen,
  DashboardScreen,
  TranscriptListScreen,
  TranscriptDetailScreen,
  FlashcardScreen,
  QuizScreen,
  ChatbotScreen,
} from './screens';

import BottomTabs from './navigation/BottomTabs';
import UploadScreen from './screens/UploadScreen';
import DebugScreen from './screens/DebugScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import { useAuth } from './components/AuthContext';

export type RootStackParamList = {
  // Auth
  Login: undefined;
  Register: undefined;

  // App
  Main: undefined;
  Dashboard: undefined;
  Home: undefined;
  Upload: undefined;
  Debug: undefined;
  Transcripts: undefined;
  TranscriptDetail: { id: string };
  Flashcards: { id: string; title?: string };
  Quiz: { id: string; title?: string };
  Chatbot: { id: string; title?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ---------------- AUTH STACK ----------------
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ---------------- APP STACK ----------------
function AppStack() {
  return (
    <Stack.Navigator
      initialRouteName="Main"
      screenOptions={{ headerShown: true }}
    >
      {/* Bottom Tabs */}
      <Stack.Screen
        name="Main"
        component={BottomTabs}
        options={{ headerShown: false }}
      />

      {/* Screens outside Tabs */}
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'AI Learning Review' }}
      />
      <Stack.Screen
        name="Upload"
        component={UploadScreen}
        options={{ title: 'Upload' }}
      />
      <Stack.Screen
        name="Debug"
        component={DebugScreen}
        options={{ title: 'Debug' }}
      />
      <Stack.Screen
        name="Transcripts"
        component={TranscriptListScreen}
        options={{ title: 'Sessions' }}
      />
      <Stack.Screen
        name="TranscriptDetail"
        component={TranscriptDetailScreen}
        options={{ title: 'Session' }}
      />
      <Stack.Screen
        name="Flashcards"
        component={FlashcardScreen}
        options={{ title: 'Flashcards' }}
      />
      <Stack.Screen
        name="Quiz"
        component={QuizScreen}
        options={{ title: 'Quiz' }}
      />
      <Stack.Screen
        name="Chatbot"
        component={ChatbotScreen}
        options={{ title: 'Chat with AI' }}
      />
    </Stack.Navigator>
  );
}

// ---------------- ROOT NAVIGATOR ----------------
export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return isAuthenticated ? <AppStack /> : <AuthStack />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
