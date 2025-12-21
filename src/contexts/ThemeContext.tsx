// contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  surfaceVariant: string;
  card: string;
  
  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Accent colors
  accent: string;
  accentLight: string;
  
  // Semantic colors
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  info: string;
  infoLight: string;
  
  // Borders
  border: string;
  borderLight: string;
  
  // Tab bar
  tabBar: string;
  tabBarBorder: string;
  
  // Input
  inputBackground: string;
  inputBorder: string;
  placeholder: string;
  
  // Overlay
  overlay: string;
}

const lightColors: ThemeColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceVariant: '#f1f5f9',
  card: '#ffffff',
  
  text: '#1e293b',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  
  primary: '#8b5cf6',
  primaryLight: '#ede9fe',
  primaryDark: '#7c3aed',
  
  accent: '#10b981',
  accentLight: '#d1fae5',
  
  success: '#10b981',
  successLight: '#d1fae5',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  error: '#ef4444',
  errorLight: '#fee2e2',
  info: '#3b82f6',
  infoLight: '#dbeafe',
  
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  
  tabBar: '#ffffff',
  tabBarBorder: '#e5e7eb',
  
  inputBackground: '#f8fafc',
  inputBorder: '#e5e7eb',
  placeholder: '#9ca3af',
  
  overlay: 'rgba(0, 0, 0, 0.5)',
};

const darkColors: ThemeColors = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceVariant: '#334155',
  card: '#1e293b',
  
  text: '#f1f5f9',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',
  
  primary: '#a78bfa',
  primaryLight: '#5b21b630',
  primaryDark: '#8b5cf6',
  
  accent: '#34d399',
  accentLight: '#06553530',
  
  success: '#34d399',
  successLight: '#06553530',
  warning: '#fbbf24',
  warningLight: '#78350f30',
  error: '#f87171',
  errorLight: '#7f1d1d30',
  info: '#60a5fa',
  infoLight: '#1e3a8a30',
  
  border: '#334155',
  borderLight: '#475569',
  
  tabBar: '#1e293b',
  tabBarBorder: '#334155',
  
  inputBackground: '#334155',
  inputBorder: '#475569',
  placeholder: '#64748b',
  
  overlay: 'rgba(0, 0, 0, 0.7)',
};

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@app_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setMode(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const saveTheme = async (newMode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    saveTheme(newMode);
  };

  const setTheme = (newMode: ThemeMode) => {
    console.log('[ThemeContext] setTheme called with:', newMode);
    setMode(newMode);
    saveTheme(newMode);
  };

  const value: ThemeContextType = {
    mode,
    colors: mode === 'dark' ? darkColors : lightColors,
    isDark: mode === 'dark',
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Export colors for use outside components
export { lightColors, darkColors };

