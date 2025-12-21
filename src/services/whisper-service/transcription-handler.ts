// services/whisper-service/transcription-handler.ts
import { TranscriptionResult, TranscriptionSegment } from './whisper.service';

class TranscriptionHandler {
  /**
   * Parse whisper.cpp JSON output
   */
  parseWhisperCppOutput(whisperOutput: any): TranscriptionResult {
    try {
      // whisper.cpp format
      const segments: TranscriptionSegment[] = whisperOutput.transcription?.map((seg: any, index: number) => ({
        id: index,
        start: seg.offsets?.from || seg.start || 0,
        end: seg.offsets?.to || seg.end || 0,
        text: seg.text?.trim() || '',
        confidence: seg.confidence
      })) || [];

      const fullText = segments.map(s => s.text).join(' ').trim();
      const language = whisperOutput.language || 'unknown';

      return {
        text: fullText,
        language,
        duration: 0, // Will be filled by caller
        segments,
        confidence: this.calculateAverageConfidence(segments)
      };

    } catch (error) {
      console.error('🔴 Error parsing whisper.cpp output:', error);
      throw new Error('Failed to parse transcription output');
    }
  }

  /**
   * Parse faster-whisper output
   */
  parseFasterWhisperOutput(segments: any[], info: any): TranscriptionResult {
    try {
      const processedSegments: TranscriptionSegment[] = segments.map((seg, index) => ({
        id: index,
        start: seg.start,
        end: seg.end,
        text: seg.text?.trim() || '',
        confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : undefined
      }));

      const fullText = processedSegments.map(s => s.text).join(' ').trim();

      return {
        text: fullText,
        language: info.language || 'unknown',
        duration: info.duration || 0,
        segments: processedSegments,
        confidence: this.calculateAverageConfidence(processedSegments)
      };

    } catch (error) {
      console.error('🔴 Error parsing faster-whisper output:', error);
      throw new Error('Failed to parse transcription output');
    }
  }

  /**
   * Calculate average confidence from segments
   */
  private calculateAverageConfidence(segments: TranscriptionSegment[]): number | undefined {
    const confidences = segments
      .map(s => s.confidence)
      .filter((c): c is number => c !== undefined);

    if (confidences.length === 0) {
      return undefined;
    }

    const sum = confidences.reduce((a, b) => a + b, 0);
    return sum / confidences.length;
  }

  /**
   * Clean and normalize transcript text
   */
  cleanTranscriptText(text: string): string {
    return text
      .trim()
      // Remove multiple spaces
      .replace(/\s+/g, ' ')
      // Fix spacing around punctuation
      .replace(/\s+([.,!?;:])/g, '$1')
      .replace(/([.,!?;:])\s*/g, '$1 ')
      // Trim again
      .trim();
  }

  /**
   * Merge short segments (less than minDuration seconds)
   */
  mergeShortSegments(
    segments: TranscriptionSegment[], 
    minDuration: number = 2
  ): TranscriptionSegment[] {
    if (segments.length === 0) return [];

    const merged: TranscriptionSegment[] = [];
    let currentSegment: TranscriptionSegment = { ...segments[0] };

    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      const duration = currentSegment.end - currentSegment.start;

      // If current segment is too short, merge with next
      if (duration < minDuration) {
        currentSegment.end = segment.end;
        currentSegment.text = `${currentSegment.text} ${segment.text}`.trim();
        
        // Average confidence
        if (currentSegment.confidence && segment.confidence) {
          currentSegment.confidence = (currentSegment.confidence + segment.confidence) / 2;
        }
      } else {
        merged.push(currentSegment);
        currentSegment = { ...segment };
      }
    }

    // Add the last segment
    merged.push(currentSegment);

    // Re-assign IDs
    return merged.map((seg, index) => ({ ...seg, id: index }));
  }

  /**
   * Split long segments (longer than maxDuration seconds)
   */
  splitLongSegments(
    segments: TranscriptionSegment[], 
    maxDuration: number = 30
  ): TranscriptionSegment[] {
    const result: TranscriptionSegment[] = [];

    for (const segment of segments) {
      const duration = segment.end - segment.start;

      if (duration <= maxDuration) {
        result.push(segment);
        continue;
      }

      // Split by sentences or words
      const words = segment.text.split(/\s+/);
      const wordsPerChunk = Math.ceil(words.length / Math.ceil(duration / maxDuration));
      
      const chunks: string[] = [];
      for (let i = 0; i < words.length; i += wordsPerChunk) {
        chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
      }

      const chunkDuration = duration / chunks.length;
      
      chunks.forEach((chunk, index) => {
        result.push({
          id: -1, // Will be re-assigned later
          start: segment.start + (index * chunkDuration),
          end: segment.start + ((index + 1) * chunkDuration),
          text: chunk,
          confidence: segment.confidence
        });
      });
    }

    // Re-assign IDs
    return result.map((seg, index) => ({ ...seg, id: index }));
  }

  /**
   * Remove empty or invalid segments
   */
  removeEmptySegments(segments: TranscriptionSegment[]): TranscriptionSegment[] {
    return segments
      .filter(seg => {
        // Remove if text is empty or just whitespace
        if (!seg.text || seg.text.trim().length === 0) {
          return false;
        }

        // Remove if timestamps are invalid
        if (seg.start < 0 || seg.end < 0 || seg.end <= seg.start) {
          return false;
        }

        return true;
      })
      .map((seg, index) => ({ ...seg, id: index }));
  }

  /**
   * Add punctuation to segments (basic)
   */
  addPunctuation(segments: TranscriptionSegment[]): TranscriptionSegment[] {
    return segments.map(seg => {
      let text = seg.text.trim();

      // Add period if no punctuation at end
      if (!/[.!?]$/.test(text)) {
        text += '.';
      }

      // Capitalize first letter
      if (text.length > 0) {
        text = text.charAt(0).toUpperCase() + text.slice(1);
      }

      return {
        ...seg,
        text
      };
    });
  }

  /**
   * Extract keywords from transcript (simple frequency-based)
   */
  extractKeywords(text: string, topN: number = 20): Array<{ word: string; frequency: number }> {
    // Common stop words to filter out
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might',
      'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
      'we', 'they', 'them', 'their', 'what', 'which', 'who', 'when', 'where',
      'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
      'some', 'such', 'no', 'nor', 'not', 'only', 'same', 'so', 'than', 'too',
      'very', 'just', 'now', 'then', 'there', 'here'
    ]);

    // Tokenize and count
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    const frequency = new Map<string, number>();
    words.forEach(word => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    // Sort by frequency and return top N
    return Array.from(frequency.entries())
      .map(([word, freq]) => ({ word, frequency: freq }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, topN);
  }

  /**
   * Generate summary from transcript (simple - first N sentences)
   */
  generateSummary(text: string, maxSentences: number = 3): string {
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    return sentences
      .slice(0, maxSentences)
      .join('. ') + (sentences.length > maxSentences ? '...' : '.');
  }

  /**
   * Format transcript for display (with timestamps)
   */
  formatForDisplay(segments: TranscriptionSegment[]): string {
    return segments
      .map(seg => {
        const start = this.formatTimestamp(seg.start);
        const end = this.formatTimestamp(seg.end);
        return `[${start} - ${end}] ${seg.text}`;
      })
      .join('\n\n');
  }

  /**
   * Format timestamp (seconds to HH:MM:SS or MM:SS)
   */
  private formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Post-process transcription result
   */
  postProcess(result: TranscriptionResult, options?: {
    cleanText?: boolean;
    removeEmpty?: boolean;
    mergeShort?: boolean;
    splitLong?: boolean;
    addPunctuation?: boolean;
  }): TranscriptionResult {
    let segments = [...result.segments];

    // Remove empty segments
    if (options?.removeEmpty !== false) {
      segments = this.removeEmptySegments(segments);
    }

    // Merge short segments
    if (options?.mergeShort) {
      segments = this.mergeShortSegments(segments);
    }

    // Split long segments
    if (options?.splitLong) {
      segments = this.splitLongSegments(segments);
    }

    // Add punctuation
    if (options?.addPunctuation) {
      segments = this.addPunctuation(segments);
    }

    // Clean text
    let fullText = result.text;
    if (options?.cleanText !== false) {
      fullText = this.cleanTranscriptText(fullText);
    }

    return {
      ...result,
      text: fullText,
      segments
    };
  }
}

export const transcriptionHandler = new TranscriptionHandler();