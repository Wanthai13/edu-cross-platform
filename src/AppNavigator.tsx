// navigation/AppNavigator.tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import screens
import HomeScreen from './screens/HomeScreen';
import DashboardScreen from './screens/DashboardScreen';
import TranscriptListScreen from './screens/TranscriptListScreen';
import TranscriptDetailScreen from './screens/TranscriptDetailScreen';
import ChatbotScreen from './screens/ChatbotScreen';
import UploadScreen from './screens/UploadScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import TaggedTranscriptsScreen from './screens/TaggedTranscriptsScreen';
import UntaggedTranscriptsScreen from './screens/UntaggedTranscriptsScreen';

import BottomTabs from './navigation/BottomTabs';
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
  
  // Tag screens
  TaggedTranscripts: { tagId: string; tagName: string; tagColor: string };
  UntaggedTranscripts: undefined;
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
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#3b82f6',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      {/* Bottom Tabs */}
      <Stack.Screen
        name="Main"
        component={BottomTabs}
        options={{ headerShown: false }}
      />

      {/* Dashboard */}
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />

      {/* Home */}
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'AI Learning Review' }}
      />

      {/* Upload */}
      <Stack.Screen
        name="Upload"
        component={UploadScreen}
        options={{ title: 'Upload Audio' }}
      />

      {/* Transcripts List */}
      <Stack.Screen
        name="Transcripts"
        component={TranscriptListScreen}
        options={{ title: 'Transcripts' }}
      />

      {/* Transcript Detail */}
      <Stack.Screen
        name="TranscriptDetail"
        component={TranscriptDetailScreen}
        options={{ title: 'Chi tiết Transcript' }}
      />

      {/* Chatbot */}
      <Stack.Screen
        name="Chatbot"
        component={ChatbotScreen}
        options={({ route }) => ({
          title: route.params?.title || 'Chat with AI',
        })}
      />

      {/* Tagged Transcripts */}
      <Stack.Screen
        name="TaggedTranscripts"
        component={TaggedTranscriptsScreen}
        options={{ title: 'Transcripts' }}
      />

      {/* Untagged Transcripts */}
      <Stack.Screen
        name="UntaggedTranscripts"
        component={UntaggedTranscriptsScreen}
        options={{ title: 'Chưa phân loại' }}
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
        <ActivityIndicator size="large" color="#3b82f6" />
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