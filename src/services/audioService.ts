// services/audioService.ts
import { Language } from './../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getApiUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://192.168.1.37:3000/api/audio';
    }
    return 'http://192.168.1.37:3000/api/audio';
  }
  return 'https://192.168.1.37:3000/api/audio';
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
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated. Please login.');
      }

      console.log('🔵 Uploading file:', fileName);
      console.log('🔵 Selected language:', metadata?.language || 'auto');

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

      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type, let browser/RN set it with boundary
        },
        body: formData,
      });

      console.log('🔵 Upload response status:', response.status);

      const data = await response.json();
      console.log('🔵 Upload response data:', data);

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
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/${audioId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to get audio');
      }

      return data;
    } catch (error) {
      console.error('🔴 Get audio error:', error);
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
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.fileType) queryParams.append('fileType', params.fileType);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `${API_URL}?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

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