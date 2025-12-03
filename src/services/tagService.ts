// services/tagService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getApiUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://192.168.1.180:3000/api/tag';
    }
    return 'http://192.168.1.180:3000/api/tag';
  }
  return 'https://192.168.1.180:3000/api/tag';
};

const API_URL = getApiUrl();

export interface Tag {
  _id: string;
  name: string;
  color: string;
  description?: string;
  transcriptCount: number;
  createdAt: string;
  updatedAt: string;
}

class TagServiceClient {
  /**
   * Get authentication headers (synced with transcriptService)
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
   * Get all tags for current user
   * Endpoint: GET /api/tag (not /api/tag/tags)
   */
  async getTags(): Promise<Tag[]> {
    try {
      const headers = await this.getAuthHeaders();
      console.log('🔵 Fetching tags from:', API_URL);
      
      // Backend: router.get('/', ...) mounted at /api/tag
      // So URL is: /api/tag (NOT /api/tag/tags)
      const response = await fetch(API_URL, {
        method: 'GET',
        headers
      });

      console.log('🔵 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔴 Response error:', errorText);
        throw new Error(`Failed to fetch tags: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Loaded', data.tags?.length || 0, 'tags');
      return data.tags || [];
    } catch (error: any) {
      console.error('🔴 Get tags error:', error.message);
      throw error;
    }
  }

  /**
   * Create a new tag
   * Endpoint: POST /api/tag
   */
  async createTag(name: string, color: string, description?: string): Promise<Tag> {
    try {
      const headers = await this.getAuthHeaders();
      console.log('🔵 Creating tag:', name);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, color, description })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create tag');
      }

      const data = await response.json();
      console.log('✅ Tag created:', data.tag.name);
      return data.tag;
    } catch (error) {
      console.error('🔴 Create tag error:', error);
      throw error;
    }
  }

  /**
   * Update a tag
   * Endpoint: PATCH /api/tag/:tagId
   */
  async updateTag(
    tagId: string, 
    updates: { name?: string; color?: string; description?: string }
  ): Promise<Tag> {
    try {
      const headers = await this.getAuthHeaders();
      console.log('🔵 Updating tag:', tagId);
      
      const response = await fetch(`${API_URL}/${tagId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update tag');
      }

      const data = await response.json();
      console.log('✅ Tag updated:', data.tag.name);
      return data.tag;
    } catch (error) {
      console.error('🔴 Update tag error:', error);
      throw error;
    }
  }

  /**
   * Delete a tag
   * Endpoint: DELETE /api/tag/:tagId
   */
  async deleteTag(tagId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      console.log('🔵 Deleting tag:', tagId);
      
      const response = await fetch(`${API_URL}/${tagId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to delete tag');
      }

      console.log('✅ Tag deleted');
    } catch (error) {
      console.error('🔴 Delete tag error:', error);
      throw error;
    }
  }

  /**
   * Get transcripts by tag
   * Endpoint: GET /api/tag/:tagId/transcripts
   */
  async getTranscriptsByTag(tagId: string, page: number = 1, limit: number = 20) {
    try {
      const headers = await this.getAuthHeaders();
      console.log('🔵 Fetching transcripts for tag:', tagId, 'page:', page);
      
      const response = await fetch(
        `${API_URL}/${tagId}/transcripts?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch transcripts');
      }

      const data = await response.json();
      console.log('✅ Loaded', data.transcripts?.length || 0, 'transcripts');
      return data;
    } catch (error) {
      console.error('🔴 Get transcripts by tag error:', error);
      throw error;
    }
  }

  /**
   * Add tags to a transcript (bulk)
   * Endpoint: POST /api/tag/bulk/add
   */
  async addTagsToTranscript(transcriptId: string, tagIds: string[]): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      console.log('🔵 Adding tags to transcript:', transcriptId, tagIds);
      
      const response = await fetch(`${API_URL}/bulk/add`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ transcriptId, tagIds })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add tags');
      }

      console.log('✅ Tags added successfully');
    } catch (error) {
      console.error('🔴 Add tags error:', error);
      throw error;
    }
  }

  /**
   * Remove tags from a transcript (bulk)
   * Endpoint: POST /api/tag/bulk/remove
   */
  async removeTagsFromTranscript(transcriptId: string, tagIds: string[]): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      console.log('🔵 Removing tags from transcript:', transcriptId, tagIds);
      
      const response = await fetch(`${API_URL}/bulk/remove`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ transcriptId, tagIds })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove tags');
      }

      console.log('✅ Tags removed successfully');
    } catch (error) {
      console.error('🔴 Remove tags error:', error);
      throw error;
    }
  }

  /**
   * Add a single tag to a transcript
   * Endpoint: POST /api/tag/:tagId/transcripts/:transcriptId
   */
  async addTagToTranscript(tagId: string, transcriptId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      console.log('🔵 Adding tag to transcript:', tagId, transcriptId);
      
      const response = await fetch(`${API_URL}/${tagId}/transcripts/${transcriptId}`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add tag');
      }

      console.log('✅ Tag added successfully');
    } catch (error) {
      console.error('🔴 Add tag error:', error);
      throw error;
    }
  }

  /**
   * Remove a single tag from a transcript
   * Endpoint: DELETE /api/tag/:tagId/transcripts/:transcriptId
   */
  async removeTagFromTranscript(tagId: string, transcriptId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      console.log('🔵 Removing tag from transcript:', tagId, transcriptId);
      
      const response = await fetch(`${API_URL}/${tagId}/transcripts/${transcriptId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove tag');
      }

      console.log('✅ Tag removed successfully');
    } catch (error) {
      console.error('🔴 Remove tag error:', error);
      throw error;
    }
  }

  /**
   * Get popular tags
   */
  async getPopularTags(limit: number = 10): Promise<Tag[]> {
    try {
      console.log('🔵 Fetching popular tags, limit:', limit);
      
      const tags = await this.getTags();
      const popular = tags
        .sort((a, b) => b.transcriptCount - a.transcriptCount)
        .slice(0, limit);
      
      console.log('✅ Popular tags:', popular.length);
      return popular;
    } catch (error) {
      console.error('🔴 Get popular tags error:', error);
      throw error;
    }
  }
}

export const tagServiceClient = new TagServiceClient();