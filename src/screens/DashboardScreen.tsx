import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Dashboard from '../components/Dashboard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';
import { useAuth } from '../components/AuthContext'; // 🔥 Quan trọng

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen({ navigation }: Props) {
  const { logout } = useAuth(); // 🔥 lấy từ AuthProvider

  const handleLogout = async () => {
    await logout();
    navigation.replace("Login"); // quay về Login sau khi logout
  };

  return (
    <View style={styles.container}>
      <Dashboard 
        recentUploads={[]} 
        onSelectTranscript={() => {}} 
        onLogout={handleLogout}   // 🔥 truyền xuống Dashboard!
      />

      <TouchableOpacity 
        style={styles.debugBtn} 
        onPress={() => navigation.navigate('Debug')}
      >
        <Text style={styles.debugBtnText}>Debug</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  debugBtn: { 
    position: 'absolute', 
    right: 16, 
    bottom: 20,
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  debugBtnText: { color: 'white', fontWeight: '700' }
});
