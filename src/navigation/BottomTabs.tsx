import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DashboardScreen from '../screens/DashboardScreen';
import TranscriptListScreen from '../screens/TranscriptListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../AppNavigator';

type BottomTabParamList = {
  Dashboard: undefined;
  Upload: undefined;
  Sessions: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

function EmptyPlaceholder() {
  return <View style={{ flex: 1, backgroundColor: 'transparent' }} />;
}

function UploadTabButton() {
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
      style={styles.fab}
      activeOpacity={0.8}
    >
      <Ionicons name="cloud-upload-outline" size={28} color="#fff" />
    </TouchableOpacity>
  );
}

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#5B46FF',
        tabBarInactiveTintColor: '#9CA3AF',
      }}
    >


      <Tab.Screen
        name="Sessions"
        component={TranscriptListScreen as unknown as React.ComponentType<any>}
        options={{
          title: 'Sessions',
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
          tabBarButton: () => <UploadTabButton />,
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
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
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    backgroundColor: '#fff',
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#5B46FF',
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