import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DashboardScreen from '../screens/DashboardScreen';
import TranscriptListScreen from '../screens/TranscriptListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import StudyScreen from '../screens/StudyScreen';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../AppNavigator';
import * as NavigationBar from 'expo-navigation-bar';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

type BottomTabParamList = {
  Dashboard: undefined;
  Upload: undefined;
  Sessions: undefined;
  Study: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

function EmptyPlaceholder() {
  return <View style={{ flex: 1, backgroundColor: 'transparent' }} />;
}

function UploadTabButton({ colors }: { colors: any }) {
  const nav = useNavigation<NavigationProp<RootStackParamList | Record<string, any>>>();
  const handlePress = () => {
    const parent = nav.getParent && nav.getParent();
    try {
      const navigator = (parent || nav) as NavigationProp<RootStackParamList>;
      navigator.navigate('Upload');
    } catch (e) {
      // ignore
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.fab, { backgroundColor: colors.primary }]}
      activeOpacity={0.8}
    >
      <Ionicons name="cloud-upload-outline" size={28} color="#fff" />
    </TouchableOpacity>
  );
}

export default function BottomTabs() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  // Hide Android navigation bar on mount
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
  }, []);

  return (
    <>
      <StatusBar hidden={Platform.OS === 'android'} />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarStyle: [
            styles.tabBar,
            {
              backgroundColor: colors.tabBar,
              borderTopColor: colors.tabBarBorder,
              shadowColor: isDark ? '#000' : '#000',
            },
          ],
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
        }}
        initialRouteName="Dashboard"
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            title: t.nav.home,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />

        <Tab.Screen
          name="Sessions"
          component={TranscriptListScreen as unknown as React.ComponentType<any>}
          options={{
            title: t.nav.sessions,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list-outline" size={size} color={color} />
            ),
          }}
        />

      <Tab.Screen
        name="Upload"
        component={EmptyPlaceholder}
        options={{
          title: '',
          tabBarButton: () => <UploadTabButton colors={colors} />,
        }}
      />

      <Tab.Screen
        name="Study"
        component={StudyScreen}
        options={{
          title: t.nav.study,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t.nav.profile,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      </Tab.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    height: Platform.OS === 'ios' ? 80 : 64,
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 16,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 4,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderTopWidth: 1,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 : 6,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
});