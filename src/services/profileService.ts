// services/profileService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getApiUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://192.168.121.227:3000/api/profile';
    }
    return 'http://192.168.121.227:3000/api/profile';
  }
  return 'https://your-production-api.com/api/profile';
};

const API_URL = getApiUrl();

export interface UserStats {
  totalSessions: number;
  totalStudyTime: number;
  totalFlashcards: number;
  flashcardsMastered: number;
  quizzesTaken: number;
  quizAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  weeklyProgress: number[];
  xp: number;
  level: number;
  xpToNextLevel: number;
}

export interface Achievement {
  id: string;
  name: string;
  nameVi: string;
  description: string;
  descriptionVi: string;
  icon: string;
  category: string;
  requirement: number;
  xpReward: number;
  earned: boolean;
  earnedAt?: Date;
}

export interface UserSettings {
  language: 'vi' | 'en';
  darkMode: boolean;
  notifications: boolean;
  audioQuality: 'low' | 'medium' | 'high';
  dailyGoal: number;
}

export interface DailyProgress {
  current: number;
  goal: number;
  percentage: number;
  completed: boolean;
}

class ProfileService {
  private async getAuthHeaders() {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async getStats(): Promise<{ success: boolean; stats?: UserStats; message?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_URL}/stats`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();
      
      if (data.success) {
        return { success: true, stats: data.stats };
      }
      
      return { success: false, message: data.message || 'Failed to get stats' };
    } catch (error) {
      console.error('Get stats error:', error);
      // Return mock data if API fails
      return {
        success: true,
        stats: {
          totalSessions: 0,
          totalStudyTime: 0,
          totalFlashcards: 0,
          flashcardsMastered: 0,
          quizzesTaken: 0,
          quizAccuracy: 0,
          currentStreak: 0,
          longestStreak: 0,
          weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
          xp: 0,
          level: 1,
          xpToNextLevel: 100
        }
      };
    }
  }

  async getAchievements(): Promise<{ success: boolean; achievements?: Achievement[]; earnedCount?: number; totalCount?: number; message?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_URL}/achievements`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();
      
      if (data.success) {
        return { 
          success: true, 
          achievements: data.achievements,
          earnedCount: data.earnedCount,
          totalCount: data.totalCount
        };
      }
      
      return { success: false, message: data.message || 'Failed to get achievements' };
    } catch (error) {
      console.error('Get achievements error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  async getSettings(): Promise<{ success: boolean; settings?: UserSettings; message?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_URL}/settings`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();
      
      if (data.success) {
        return { success: true, settings: data.settings };
      }
      
      return { success: false, message: data.message || 'Failed to get settings' };
    } catch (error) {
      console.error('Get settings error:', error);
      // Return default settings if API fails
      return {
        success: true,
        settings: {
          language: 'vi',
          darkMode: false,
          notifications: true,
          audioQuality: 'high',
          dailyGoal: 30
        }
      };
    }
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<{ success: boolean; settings?: UserSettings; message?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_URL}/settings`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      
      if (data.success) {
        return { success: true, settings: data.settings };
      }
      
      return { success: false, message: data.message || 'Failed to update settings' };
    } catch (error) {
      console.error('Update settings error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  async recordActivity(activity: {
    type: 'study' | 'flashcard' | 'quiz';
    duration?: number;
    flashcardsStudied?: number;
    quizScore?: number;
    quizTotal?: number;
  }): Promise<{ success: boolean; xpGained?: number; newLevel?: number; earnedAchievements?: any[]; message?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_URL}/activity`, {
        method: 'POST',
        headers,
        body: JSON.stringify(activity),
      });

      const data = await response.json();
      
      if (data.success) {
        return { 
          success: true, 
          xpGained: data.xpGained,
          newLevel: data.newLevel,
          earnedAchievements: data.earnedAchievements
        };
      }
      
      return { success: false, message: data.message || 'Failed to record activity' };
    } catch (error) {
      console.error('Record activity error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  async getDailyProgress(): Promise<{ success: boolean; progress?: DailyProgress; message?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_URL}/daily-progress`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();
      
      if (data.success) {
        return { success: true, progress: data.progress };
      }
      
      return { success: false, message: data.message || 'Failed to get daily progress' };
    } catch (error) {
      console.error('Get daily progress error:', error);
      return {
        success: true,
        progress: {
          current: 0,
          goal: 30,
          percentage: 0,
          completed: false
        }
      };
    }
  }
}

export const profileService = new ProfileService();

