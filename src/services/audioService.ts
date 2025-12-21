// services/audioService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import Constants from 'expo-constants';

const getApiUrl = () => {
  const extras = Constants.expoConfig?.extra as { API_BASE_URL?: string } | undefined;
  let base = extras?.API_BASE_URL || 'http://192.168.1.69:3000/api';
  // Ensure base doesn't end with /api/audio (remove trailing /audio if present)
  base = base.replace(/\/audio\/?$/, '');
  // Ensure base ends with /api
  if (!base.endsWith('/api')) {
    base = base.endsWith('/') ? `${base}api` : `${base}/api`;
  }
  const apiUrl = `${base}/audio`;
  if (__DEV__) {
    console.log('[AudioService] API_BASE_URL resolved:', base);
    console.log('[AudioService] API_URL:', apiUrl);
  }
  return apiUrl;
};

const API_URL = getApiUrl();

interface UploadResponse {
  success: boolean;
  message?: string;
  audio?: {
    _id: string;
    filename: string;
    originalName: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: string;
  };
}

interface AudioDetail {
  success: boolean;
  audio?: {
    _id: string;
    filename: string;
    originalName: string;
    fileType: 'audio' | 'video' | 'recording';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    transcription?: string;
    language?: string;
    segments?: Array<{
      start: number;
      end: number;
      text: string;
    }>;
    duration?: number;
    title?: string;
    description?: string;
    tags?: string[];
    createdAt: string;
    processingError?: string;
  };
}

interface AudioListResponse {
  success: boolean;
  audios?: any[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

class AudioService {
  /**
   * Upload audio/video file
   */
  async uploadFile(
    fileUri: string,
    fileName: string,
    fileType: 'audio' | 'video' | 'recording',
    metadata?: {
      title?: string;
      description?: string;
      tags?: string[];
      language?: string; // ← Thêm language vào đây
    }
  ): Promise<UploadResponse> {
    try {
      // Get auth token for authenticated uploads
      const token = await AsyncStorage.getItem('token');

      console.log('🔵 Uploading file:', fileName);
      console.log('🔵 Selected language:', metadata?.language || 'auto');
      console.log('🔵 Auth token:', token ? 'Present' : 'Missing');

      // Create FormData
      const formData = new FormData();
      
      // Add file
      formData.append('file', {
        uri: fileUri,
        type: this.getMimeType(fileName),
        name: fileName,
      } as any);

      // Add metadata
      formData.append('fileType', fileType);
      if (metadata?.title) formData.append('title', metadata.title);
      if (metadata?.description) formData.append('description', metadata.description);
      if (metadata?.tags) formData.append('tags', JSON.stringify(metadata.tags));
      if (metadata?.language) formData.append('language', metadata.language); // ← Thêm language vào FormData

      // Build headers with optional auth
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      console.log('🔵 Upload response status:', response.status);

      const contentType = response.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        data = await response.json();
        console.log('🔵 Upload response data:', data);
      } else {
        const text = await response.text();
        console.log('🟡 Non-JSON upload response:', text?.slice(0, 200));
        if (!response.ok) {
          throw new Error(`Server error (${response.status}). Check API_BASE_URL and /api/audio/upload.`);
        }
        data = { success: true };
      }

      if (!data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      return data;
    } catch (error) {
      console.error('🔴 Upload error:', error);
      throw error;
    }
  }

  /**
   * Get audio details and transcription status
   */
  async getAudio(audioId: string): Promise<AudioDetail> {
    try {
      // Public fetch: no authentication required
      if (!audioId || audioId.trim() === '') {
        throw new Error('Audio ID is required');
      }

      const url = `${API_URL}/${audioId}`;
      if (__DEV__) {
        console.log('[AudioService.getAudio] Requesting:', url);
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {},
      });

      if (__DEV__) {
        console.log('[AudioService.getAudio] Response status:', response.status, response.statusText);
      }

      const contentType = response.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.log('🟡 Non-JSON getAudio response:', text?.slice(0, 200));
        if (response.status === 404) {
          throw new Error(`Audio not found (ID: ${audioId}). URL: ${url}`);
        }
        throw new Error(`Server returned non-JSON (${response.status}). URL: ${url}`);
      }

      if (!data.success) {
        if (data.message === 'Endpoint not found') {
          throw new Error(`Endpoint not found. Check if server is running and URL is correct: ${url}`);
        }
        throw new Error(data.message || 'Failed to get audio');
      }

      return data;
    } catch (error) {
      console.error('[AudioService.getAudio] Error:', error);
      throw error;
    }
  }

  /**
   * Poll for transcription completion
   */
  async pollTranscriptionStatus(
    audioId: string,
    onStatusChange?: (status: string, audio?: any) => void,
    maxAttempts: number = 60
  ): Promise<AudioDetail> {
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          attempts++;

          const result = await this.getAudio(audioId);

          if (onStatusChange && result.audio) {
            onStatusChange(result.audio.status, result.audio);
          }

          if (result.audio?.status === 'completed') {
            clearInterval(interval);
            resolve(result);
          } else if (result.audio?.status === 'failed') {
            clearInterval(interval);
            reject(new Error(result.audio.processingError || 'Transcription failed'));
          }

          if (attempts >= maxAttempts) {
            clearInterval(interval);
            reject(new Error('Transcription timeout'));
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, 5000);
    });
  }

  /**
   * Get user's audio list
   */
  async getAudioList(params?: {
    status?: string;
    fileType?: string;
    page?: number;
    limit?: number;
  }): Promise<AudioListResponse> {
    try {
      // Public list: no authentication required

      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.fileType) queryParams.append('fileType', params.fileType);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `${API_URL}?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {},
      });
      const contentType = response.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.log('🟡 Non-JSON audio list response:', text?.slice(0, 200));
        throw new Error(`Server returned non-JSON (${response.status}).`);
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to get audio list');
      }

      return data;
    } catch (error) {
      console.error('🔴 Get audio list error:', error);
      throw error;
    }
  }

  /**
   * Delete audio
   */
  async deleteAudio(audioId: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Public delete still requires auth on server; keep as is or disable
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/${audioId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to delete audio');
      }

      return data;
    } catch (error) {
      console.error('🔴 Delete audio error:', error);
      throw error;
    }
  }

  /**
   * Import transcript from YouTube URL
   */
  async importFromYouTube(
    url: string,
    language?: string
  ): Promise<{
    success: boolean;
    message?: string;
    audio?: {
      _id: string;
      status: string;
    };
    transcript?: {
      _id: string;
    };
  }> {
    try {
      // Get auth token for authenticated imports
      const token = await AsyncStorage.getItem('token');

      console.log('📺 Importing from YouTube:', url);
      console.log('📺 Language:', language || 'auto');
      console.log('📺 Auth token:', token ? 'Present' : 'Missing');

      // Build headers with optional auth
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/youtube`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url,
          language: language || 'auto',
        }),
      });

      console.log('📺 YouTube import response status:', response.status);

      const contentType = response.headers.get('content-type') || '';
      
      if (!response.ok) {
        if (contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData?.message || `Server error: ${response.status}`);
        }
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText.substring(0, 200)}`);
      }

      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Unexpected response format: ${text.substring(0, 100)}`);
      }

      const data = await response.json();
      console.log('📺 YouTube import response:', data);

      if (!data.success) {
        throw new Error(data.message || 'Failed to import from YouTube');
      }

      return data;
    } catch (error) {
      console.error('🔴 YouTube import error:', error);
      throw error;
    }
  }

  /**
   * Get MIME type from filename
   */
  private getMimeType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    
    const mimeTypes: Record<string, string> = {
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'm4a': 'audio/mp4',
      'ogg': 'audio/ogg',
      'webm': 'audio/webm',
      'aac': 'audio/aac',
      'flac': 'audio/flac',
      
      // Video
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mkv': 'video/x-matroska',
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}

export const audioService = new AudioService();