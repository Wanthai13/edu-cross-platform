// services/youtube-transcript.service.ts
// Using youtube-transcript npm package for reliable transcript fetching

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { YoutubeTranscript } = require('youtube-transcript');

interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
}

interface YouTubeTranscriptResult {
  text: string;
  language: string;
  duration: number;
  segments: SubtitleSegment[];
  source: 'subtitles' | 'auto-captions';
}

const RE_YOUTUBE = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;

class YouTubeTranscriptService {
  /**
   * Extract video ID from various YouTube URL formats
   */
  extractVideoId(url: string): string | null {
    const match = url.match(RE_YOUTUBE);
    if (match && match[1]) {
      return match[1];
    }
    // Also try direct video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }
    return null;
  }

  /**
   * Decode HTML entities
   */
  private decodeHTML(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get transcript for a YouTube video using youtube-transcript package
   */
  async getTranscript(
    videoId: string,
    preferredLanguage?: string
  ): Promise<YouTubeTranscriptResult | null> {
    console.log(`📺 Fetching transcript for video: ${videoId}`);
    
    try {
      // Try to fetch transcript with preferred language
      const config: { lang?: string } = {};
      if (preferredLanguage && preferredLanguage !== 'auto') {
        config.lang = preferredLanguage;
      }

      console.log(`🔍 Fetching with config:`, config);
      
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, config);
      
      if (!transcriptItems || transcriptItems.length === 0) {
        console.log('❌ No transcript items returned');
        return null;
      }

      console.log(`✅ Got ${transcriptItems.length} transcript items`);

      // Convert to our format
      const segments: SubtitleSegment[] = transcriptItems.map((item: any) => ({
        start: item.offset / 1000, // Convert ms to seconds
        end: (item.offset + item.duration) / 1000,
        text: this.decodeHTML(item.text)
      }));

      // Calculate total duration
      const duration = segments.length > 0 
        ? Math.max(...segments.map(s => s.end))
        : 0;
      
      // Combine all text
      const text = segments.map(s => s.text).join(' ');

      console.log(`✅ Transcript ready: ${segments.length} segments, ${Math.round(duration)}s duration`);

      return {
        text,
        language: preferredLanguage || 'auto',
        duration,
        segments,
        source: 'subtitles'
      };
    } catch (error: any) {
      console.error('❌ Failed to fetch transcript:', error.message || error);
      
      // If language-specific request failed, try without language
      if (preferredLanguage && preferredLanguage !== 'auto') {
        console.log('🔄 Retrying without language preference...');
        try {
          const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
          
          if (transcriptItems && transcriptItems.length > 0) {
            console.log(`✅ Got ${transcriptItems.length} transcript items (fallback)`);

            const segments: SubtitleSegment[] = transcriptItems.map((item: any) => ({
              start: item.offset / 1000,
              end: (item.offset + item.duration) / 1000,
              text: this.decodeHTML(item.text)
            }));

            const duration = segments.length > 0 
              ? Math.max(...segments.map(s => s.end))
              : 0;
            
            const text = segments.map(s => s.text).join(' ');

            return {
              text,
              language: 'auto',
              duration,
              segments,
              source: 'auto-captions'
            };
          }
        } catch (fallbackError: any) {
          console.error('❌ Fallback also failed:', fallbackError.message || fallbackError);
        }
      }
      
      return null;
    }
  }

  /**
   * Try to get transcript, returns null if not available
   */
  async tryGetTranscript(
    url: string,
    language?: string
  ): Promise<YouTubeTranscriptResult | null> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    console.log(`📺 Processing video ID: ${videoId}, language: ${language || 'auto'}`);

    try {
      // Add timeout of 30 seconds
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout fetching YouTube transcript')), 30000);
      });

      const transcriptPromise = this.getTranscript(videoId, language);
      
      const result = await Promise.race([transcriptPromise, timeoutPromise]);
      return result;
    } catch (error) {
      console.error('❌ Failed to get YouTube transcript:', error);
      return null;
    }
  }
}

export const youtubeTranscriptService = new YouTubeTranscriptService();
