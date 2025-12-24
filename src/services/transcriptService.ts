// services/transcriptService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getApiUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.14.179:3000/api/transcript';
    }
    return 'http://10.0.14.179:3000/api/transcript';
  }
  return 'https://10.0.14.179:3000/api/transcript';
};

const API_URL = getApiUrl();

export interface TranscriptItem {
  _id: string;
  title: string;
  fullText: string;
  createdAt: string;
  updatedAt: string;
  segmentCount: number;
  highlightCount: number;
  language: string;
  isEdited: boolean;
  
  // ✅ NEW: Tags field
  tags?: Array<{
    _id: string;
    name: string;
    color: string;
  }> | string[];
}

export interface Segment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence?: number;
  isEdited: boolean;
  originalText?: string;
  editedText?: string;
  editedAt?: string;
  isHighlighted: boolean;
  highlightColor?: string;
  highlightNote?: string;
}

export interface TranscriptDetail {
  _id: string;
  audioId: {
    _id: string;
    title?: string;
    originalName: string;
    description?: string;
    tags?: string[];
    duration?: number;
  };
  fullText: string;
  language: string;
  segments: Segment[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface TranscriptListResponse {
  success: boolean;
  transcripts?: TranscriptItem[];
  message?: string;
}

interface TranscriptDetailResponse {
  success: boolean;
  transcript?: TranscriptDetail;
  message?: string;
}

interface HighlightsResponse {
  success: boolean;
  highlights?: Segment[];
  count?: number;
  message?: string;
}

interface MetadataUpdateResponse {
  success: boolean;
  message?: string;
  audio?: any;
}

class TranscriptService {
  /**
   * Get authentication headers
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('Not authenticated. Please login.');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * Fetch all transcripts for current user
   */
  async fetchTranscripts(): Promise<TranscriptItem[]> {
    try {
      const headers = await this.getAuthHeaders();
      console.log('🔵 Fetching transcripts...');

      const response = await fetch(API_URL, {
        method: 'GET',
        headers,
      });

      const data: TranscriptListResponse = await response.json();
      console.log('🔵 Transcripts response:', data);

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch transcripts');
      }

      return data.transcripts || [];
    } catch (error) {
      console.error('🔴 Fetch transcripts error:', error);
      throw error;
    }
  }

  /**
   * Fetch transcript by ID
   */
  async fetchTranscriptById(id: string): Promise<TranscriptDetail> {
    try {
      const headers = await this.getAuthHeaders();
      console.log('🔵 Fetching transcript:', id);

      const response = await fetch(`${API_URL}/${id}`, {
        method: 'GET',
        headers,
      });

      const data: TranscriptDetailResponse = await response.json();
      console.log('🔵 Transcript detail response:', data);

      if (!data.success || !data.transcript) {
        throw new Error(data.message || 'Transcript not found');
      }

      return data.transcript;
    } catch (error) {
      console.error('🔴 Fetch transcript error:', error);
      throw error;
    }
  }

  /**
   * Update transcript metadata (title, description, tags)
   */
  async updateTranscriptMetadata(
    id: string,
    metadata: {
      title?: string;
      description?: string;
      tags?: string[];
    }
  ): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      console.log('🔵 Updating metadata for:', id, metadata);

      const response = await fetch(`${API_URL}/${id}/metadata`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(metadata),
      });

      const data: MetadataUpdateResponse = await response.json();
      console.log('🔵 Update metadata response:', data);

      if (!data.success) {
        throw new Error(data.message || 'Failed to update metadata');
      }
    } catch (error) {
      console.error('🔴 Update metadata error:', error);
      throw error;
    }
  }

  // Thêm method này vào class TranscriptService (sau getEditHistory)

/**
 * Delete transcript
 */
async deleteTranscript(transcriptId: string): Promise<void> {
  try {
    const headers = await this.getAuthHeaders();
    console.log('🔵 Deleting transcript:', transcriptId);

    const response = await fetch(`${API_URL}/${transcriptId}`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json();
    console.log('🔵 Delete response:', data);

    if (!data.success) {
      throw new Error(data.message || 'Failed to delete transcript');
    }
  } catch (error) {
    console.error('🔴 Delete transcript error:', error);
    throw error;
  }
}

  /**
   * Update segment text
   */
  async updateSegmentText(
    transcriptId: string,
    segmentId: number,
    text: string
  ): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      console.log('🔵 Updating segment:', transcriptId, segmentId);

      const response = await fetch(`${API_URL}/${transcriptId}/segment/${segmentId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      console.log('🔵 Update segment response:', data);

      if (!data.success) {
        throw new Error(data.message || 'Failed to update segment');
      }
    } catch (error) {
      console.error('🔴 Update segment error:', error);
      throw error;
    }
  }

  /**
   * Update segment highlight
   */
  async updateSegmentHighlight(
    transcriptId: string,
    segmentId: number,
    isHighlighted: boolean,
    color?: string,
    note?: string
  ): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      console.log('🔵 Updating highlight:', transcriptId, segmentId, { isHighlighted, color });

      const response = await fetch(
        `${API_URL}/${transcriptId}/segment/${segmentId}/highlight`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ isHighlighted, color, note }),
        }
      );

      const data = await response.json();
      console.log('🔵 Update highlight response:', data);

      if (!data.success) {
        throw new Error(data.message || 'Failed to update highlight');
      }
    } catch (error) {
      console.error('🔴 Update highlight error:', error);
      throw error;
    }
  }

  /**
   * Fetch all highlighted segments
   */
  async fetchHighlights(transcriptId: string): Promise<Segment[]> {
    try {
      const headers = await this.getAuthHeaders();
      console.log('🔵 Fetching highlights for:', transcriptId);

      const response = await fetch(`${API_URL}/${transcriptId}/highlights`, {
        method: 'GET',
        headers,
      });

      const data: HighlightsResponse = await response.json();
      console.log('🔵 Highlights response:', data);

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch highlights');
      }

      return data.highlights || [];
    } catch (error) {
      console.error('🔴 Fetch highlights error:', error);
      throw error;
    }
  }

  /**
   * Export transcript in specified format
   */
  async exportTranscript(
    transcriptId: string,
    format: 'srt' | 'vtt' | 'txt' | 'tsv'
  ): Promise<string> {
    try {
      const headers = await this.getAuthHeaders();
      console.log('🔵 Exporting transcript:', transcriptId, format);

      const response = await fetch(
        `${API_URL}/${transcriptId}/export/${format}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }

      const content = await response.text();
      console.log('🔵 Export successful, content length:', content.length);

      return content;
    } catch (error) {
      console.error('🔴 Export error:', error);
      throw error;
    }
  }

  /**
   * Search within transcript
   */
  async searchTranscript(
    transcriptId: string,
    query: string
  ): Promise<Segment[]> {
    try {
      const headers = await this.getAuthHeaders();
      console.log('🔵 Searching transcript:', transcriptId, query);

      const response = await fetch(
        `${API_URL}/${transcriptId}/search?query=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers,
        }
      );

      const data = await response.json();
      console.log('🔵 Search response:', data);

      if (!data.success) {
        throw new Error(data.message || 'Search failed');
      }

      return data.results || [];
    } catch (error) {
      console.error('🔴 Search error:', error);
      throw error;
    }
  }

  /**
   * Get edit history
   */
  async getEditHistory(transcriptId: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      console.log('🔵 Fetching edit history for:', transcriptId);

      const response = await fetch(`${API_URL}/${transcriptId}/history`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();
      console.log('🔵 Edit history response:', data);

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch history');
      }

      return {
        editHistory: data.editHistory || [],
        recentEdits: data.recentEdits || [],
      };
    } catch (error) {
      console.error('🔴 Fetch history error:', error);
      throw error;
    }
  }
}

export const transcriptService = new TranscriptService();