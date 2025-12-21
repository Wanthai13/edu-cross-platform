// services/authService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getApiUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://192.168.1.69:3000/api/auth';
    }
    return 'http://192.168.1.69:3000/api/auth';
  }
  return 'https://your-production-api.com/api/auth';
};

const API_URL = getApiUrl();

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role?: 'student' | 'employee' | 'disabled' | 'admin';
}

interface UpdateProfileRequest {
  username: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
}

class AuthService {
  async login({ email, password }: LoginRequest) {
    try {
      console.log('🔵 Login attempt:', { email, apiUrl: `${API_URL}/login` });

      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('🔵 Response status:', response.status);

      const data = await response.json();
      console.log('🔵 Response data:', data);

      if (data.success && data.token) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      }

      return { success: false, message: data.message || 'Login failed' };
    } catch (error) {
      console.error('🔴 Login error:', error);
      return { 
        success: false, 
        message: `Network error: ${error instanceof Error ? error.message : 'Cannot connect to server'}` 
      };
    }
  }

  async register({ username, email, password, role }: RegisterRequest) {
    try {
      console.log('🔵 Register attempt:', { username, email, apiUrl: `${API_URL}/register` });

      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password, role }),
      });

      console.log('🔵 Response status:', response.status);

      const data = await response.json();
      console.log('🔵 Response data:', data);

      if (data.success && data.token) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      }

      return { success: false, message: data.message || 'Registration failed' };
    } catch (error) {
      console.error('🔴 Register error:', error);
      return { 
        success: false, 
        message: `Network error: ${error instanceof Error ? error.message : 'Cannot connect to server'}` 
      };
    }
  }

  async updateProfile(data: UpdateProfileRequest) {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        return { success: false, message: 'No authentication token' };
      }

      console.log('🔵 Update profile attempt:', { username: data.username, email: data.email });

      const response = await fetch(`${API_URL}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      console.log('🔵 Response status:', response.status);

      const responseData = await response.json();
      console.log('🔵 Response data:', responseData);

      if (responseData.success && responseData.user) {
        await AsyncStorage.setItem('user', JSON.stringify(responseData.user));
        return { success: true, user: responseData.user };
      }

      return { success: false, message: responseData.message || 'Update failed' };
    } catch (error) {
      console.error('🔴 Update profile error:', error);
      return { 
        success: false, 
        message: `Network error: ${error instanceof Error ? error.message : 'Cannot connect to server'}` 
      };
    }
  }

  async verifyToken(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('🟡 No token found');
        return false;
      }

      console.log('🔵 Verifying token...');

      const response = await fetch(`${API_URL}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('🔵 Verify response:', response.status);

      if (!response.ok) {
        console.log('🔴 Token invalid or expired');
        await this.logout();
        return false;
      }

      return true;
    } catch (error) {
      console.error('🔴 Verify token error:', error);
      return false;
    }
  }

  async getCurrentUser() {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) return null;
      
      return JSON.parse(userStr);
    } catch (error) {
      console.error('🔴 Get current user error:', error);
      return null;
    }
  }

  async logout() {
    try {
      console.log('🔵 Logging out...');
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('🔴 Logout error:', error);
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔵 Testing connection to:', API_URL);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_URL}/me`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 401) {
        return { success: true, message: `✅ Connected to server at ${API_URL}` };
      }

      return { 
        success: true, 
        message: `✅ Connected to server at ${API_URL} (Status: ${response.status})` 
      };
    } catch (error) {
      console.error('🔴 Connection test failed:', error);
      return { 
        success: false, 
        message: `❌ Cannot connect to ${API_URL}\n${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

export const authService = new AuthService();