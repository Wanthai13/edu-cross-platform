// service/transcriptExportService.ts
import { ITranscript, ISegment } from '../server/models/Transcript';

class TranscriptExportService {
  /**
   * Generate SRT format (SubRip)
   */
  generateSRT(transcript: ITranscript): string {
    let srt = '';
    
    transcript.segments.forEach((segment, index) => {
      srt += `${index + 1}\n`;
      srt += `${this.formatSRTTime(segment.start)} --> ${this.formatSRTTime(segment.end)}\n`;
      srt += `${segment.text}\n\n`;
    });

    return srt;
  }

  /**
   * Generate VTT format (WebVTT)
   */
  generateVTT(transcript: ITranscript): string {
    let vtt = 'WEBVTT\n\n';
    
    transcript.segments.forEach((segment, index) => {
      vtt += `${index + 1}\n`;
      vtt += `${this.formatVTTTime(segment.start)} --> ${this.formatVTTTime(segment.end)}\n`;
      vtt += `${segment.text}\n\n`;
    });

    return vtt;
  }

  /**
   * Generate plain text format
   */
  generateTXT(transcript: ITranscript): string {
    let txt = '';
    
    // Add header
    txt += `Transcript\n`;
    txt += `Language: ${transcript.language}\n`;
    txt += `Generated: ${new Date().toISOString()}\n`;
    txt += `Version: ${transcript.version}\n`;
    txt += `${'='.repeat(50)}\n\n`;

    // Full text
    txt += `Full Text:\n`;
    txt += `${transcript.fullText}\n\n`;
    txt += `${'='.repeat(50)}\n\n`;

    // Segments with timestamps
    txt += `Timestamped Segments:\n\n`;
    transcript.segments.forEach((segment) => {
      txt += `[${this.formatSimpleTime(segment.start)} - ${this.formatSimpleTime(segment.end)}]\n`;
      txt += `${segment.text}\n`;
      
      if (segment.isHighlighted) {
        txt += `⭐ HIGHLIGHTED`;
        if (segment.highlightNote) {
          txt += ` - ${segment.highlightNote}`;
        }
        txt += `\n`;
      }
      
      if (segment.isEdited) {
        txt += `✏️ EDITED\n`;
      }
      
      txt += `\n`;
    });

    return txt;
  }

  /**
   * Generate TSV format (Tab-Separated Values)
   */
  generateTSV(transcript: ITranscript): string {
    let tsv = '';
    
    // Header
    tsv += 'Start\tEnd\tText\tHighlighted\tEdited\tNote\n';
    
    // Data rows
    transcript.segments.forEach((segment) => {
      tsv += `${segment.start.toFixed(3)}\t`;
      tsv += `${segment.end.toFixed(3)}\t`;
      tsv += `${segment.text.replace(/\t/g, ' ')}\t`;
      tsv += `${segment.isHighlighted ? 'Yes' : 'No'}\t`;
      tsv += `${segment.isEdited ? 'Yes' : 'No'}\t`;
      tsv += `${segment.highlightNote || ''}\n`;
    });

    return tsv;
  }

  /**
   * Format time for SRT (00:00:00,000)
   */
  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    return `${this.pad(hours, 2)}:${this.pad(minutes, 2)}:${this.pad(secs, 2)},${this.pad(millis, 3)}`;
  }

  /**
   * Format time for VTT (00:00:00.000)
   */
  private formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    return `${this.pad(hours, 2)}:${this.pad(minutes, 2)}:${this.pad(secs, 2)}.${this.pad(millis, 3)}`;
  }

  /**
   * Format time for simple display (00:00:00)
   */
  private formatSimpleTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${this.pad(hours, 2)}:${this.pad(minutes, 2)}:${this.pad(secs, 2)}`;
    }
    return `${this.pad(minutes, 2)}:${this.pad(secs, 2)}`;
  }

  /**
   * Pad number with zeros
   */
  private pad(num: number, size: number): string {
    return num.toString().padStart(size, '0');
  }

  /**
   * Generate highlights-only export
   */
  generateHighlightsOnly(transcript: ITranscript, format: 'txt' | 'srt' | 'vtt'): string {
    const highlightedSegments = transcript.segments.filter(s => s.isHighlighted);
    
    if (format === 'txt') {
      let txt = 'Highlighted Segments\n';
      txt += `${'='.repeat(50)}\n\n`;
      
      highlightedSegments.forEach(segment => {
        txt += `[${this.formatSimpleTime(segment.start)} - ${this.formatSimpleTime(segment.end)}]\n`;
        txt += `${segment.text}\n`;
        if (segment.highlightNote) {
          txt += `Note: ${segment.highlightNote}\n`;
        }
        txt += `\n`;
      });
      
      return txt;
    }
    
    // For SRT/VTT, create temporary transcript with only highlights
    const tempTranscript = {
      ...transcript,
      segments: highlightedSegments
    } as ITranscript;
    
    return format === 'srt' 
      ? this.generateSRT(tempTranscript)
      : this.generateVTT(tempTranscript);
  }
}

export const transcriptExportService = new TranscriptExportService();