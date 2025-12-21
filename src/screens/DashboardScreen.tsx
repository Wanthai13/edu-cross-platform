import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Dashboard from '../components/Dashboard';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../components/AuthContext';
import { transcriptService } from '../services/transcriptService';
import { transcriptEvents } from '../utils/transcriptEvents';
import { useTheme } from '../contexts/ThemeContext';

type Session = {
  id: string;
  title: string;
  duration?: string;
  date?: string;
  score?: number;
};

type Stats = {
  totalSessions: number;
  totalFlashcards: number;
  quizAccuracy: number;
  studyStreak: number;
  weeklyProgress: number[];
};

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { logout, user } = useAuth();
  const { colors } = useTheme();
  
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSessions: 0,
    totalFlashcards: 0,
    quizAccuracy: 0,
    studyStreak: 0,
    weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch transcripts
      const transcripts = await transcriptService.fetchTranscripts();
      
      // Transform to sessions
      const sessions: Session[] = (transcripts || []).slice(0, 5).map((t: any) => {
        const duration = t.duration 
          ? `${Math.floor(t.duration / 60)}:${String(Math.floor(t.duration % 60)).padStart(2, '0')}`
          : undefined;
        
        const date = t.createdAt 
          ? new Date(t.createdAt).toLocaleDateString('vi-VN')
          : undefined;
        
        return {
          id: t._id,
          title: t.title || 'Không có tiêu đề',
          duration,
          date,
          score: t.confidence ? Math.round(t.confidence * 100) : undefined,
        };
      });
      
      setRecentSessions(sessions);
      
      // Calculate stats
      const totalSessions = transcripts?.length || 0;
      
      // Estimate flashcards (10 per session average)
      const totalFlashcards = totalSessions * 10;
      
      // Calculate quiz accuracy (mock - would come from backend)
      const quizAccuracy = totalSessions > 0 ? Math.min(85, 60 + totalSessions * 2) : 0;
      
      // Calculate study streak based on recent activity
      const today = new Date();
      let streak = 0;
      const dates = (transcripts || [])
        .map((t: any) => new Date(t.createdAt).toDateString())
        .filter((d: string, i: number, arr: string[]) => arr.indexOf(d) === i);
      
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        if (dates.includes(checkDate.toDateString())) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }
      
      // Weekly progress (sessions per day in last 7 days)
      const weeklyProgress = [0, 0, 0, 0, 0, 0, 0];
      (transcripts || []).forEach((t: any) => {
        const sessionDate = new Date(t.createdAt);
        const diffDays = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          const dayIndex = 6 - diffDays; // Reverse so today is last
          weeklyProgress[dayIndex] = Math.min(100, (weeklyProgress[dayIndex] || 0) + 30);
        }
      });
      
      setStats({
        totalSessions,
        totalFlashcards,
        quizAccuracy,
        studyStreak: streak,
        weeklyProgress,
      });
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  // Fetch data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  // Subscribe to transcript events to refresh when new transcript is created
  useEffect(() => {
    console.log('📢 Dashboard: Subscribing to transcript events');
    const unsubscribe = transcriptEvents.subscribe(() => {
      console.log('📢 Dashboard: Received transcript update event, refreshing...');
      // Refresh immediately and also with delay
      fetchData();
      setTimeout(() => {
        console.log('📢 Dashboard: Delayed refresh');
        fetchData();
      }, 1000);
    });
    console.log('📢 Dashboard: Subscribed, total listeners:', transcriptEvents.listenerCount);
    return () => {
      console.log('📢 Dashboard: Unsubscribing');
      unsubscribe();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const handleQuickAction = (action: 'record' | 'upload' | 'study') => {
    const parent = navigation.getParent?.() || navigation;
    
    switch (action) {
      case 'record':
      case 'upload':
        // Navigate to Upload tab (which has record functionality)
        try {
          parent.navigate('Upload');
        } catch {
          navigation.navigate('Upload');
        }
        break;
      case 'study':
        // Navigate to Study tab
        navigation.navigate('Study');
        break;
    }
  };

  const handleSelectSession = (id: string) => {
    navigation.navigate('TranscriptDetail', { id });
  };

  const handleViewAllSessions = () => {
    navigation.navigate('Sessions');
  };

  // Get user name from auth context
  const userName = user?.username || user?.email?.split('@')[0] || 'bạn';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Dashboard
        userName={userName}
        recentSessions={recentSessions}
        stats={stats}
        onSelectSession={handleSelectSession}
        onQuickAction={handleQuickAction}
        onLogout={handleLogout}
        onViewAllSessions={handleViewAllSessions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
});
