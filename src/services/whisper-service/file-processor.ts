// services/whisper-service/file-processor.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export interface AudioMetadata {
  duration: number;
  format: string;
  codec: string;
  sampleRate: number;
  channels: number;
  bitrate: number;
}

class FileProcessor {
  private ffmpegAvailable: boolean = false;
  private ffprobeAvailable: boolean = false;

  constructor() {
    this.checkDependencies();
  }

  /**
   * Check if FFmpeg and FFprobe are available
   */
  async checkDependencies(): Promise<void> {
    try {
      await execAsync('ffmpeg -version');
      this.ffmpegAvailable = true;
      console.log('✅ FFmpeg is available');
    } catch {
      console.log('⚠️ FFmpeg not found. Video processing will be limited.');
      this.ffmpegAvailable = false;
    }

    try {
      await execAsync('ffprobe -version');
      this.ffprobeAvailable = true;
      console.log('✅ FFprobe is available');
    } catch {
      console.log('⚠️ FFprobe not found. Audio metadata extraction will be limited.');
      this.ffprobeAvailable = false;
    }
  }

  /**
   * Extract audio from video file
   */
  async extractAudioFromVideo(videoPath: string): Promise<string> {
    if (!this.ffmpegAvailable) {
      throw new Error('FFmpeg is required to extract audio from video. Please install FFmpeg.');
    }

    try {
      // Validate input file
      await fs.access(videoPath);

      // Create output path
      const outputDir = path.join(__dirname, '../../temp');
      await fs.mkdir(outputDir, { recursive: true });

      const timestamp = Date.now();
      const outputPath = path.join(outputDir, `extracted_${timestamp}.wav`);

      console.log('🎬 Extracting audio from video...');
      console.log('📂 Input:', videoPath);
      console.log('📂 Output:', outputPath);

      // FFmpeg command to extract audio
      // Convert to 16kHz mono WAV (Whisper's preferred format)
      const command = `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${outputPath}" -y`;

      const { stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024
      });

      // Check if output file was created
      try {
        await fs.access(outputPath);
      } catch {
        throw new Error('Failed to create extracted audio file');
      }

      console.log('✅ Audio extracted successfully');
      return outputPath;

    } catch (error) {
      console.error('🔴 Audio extraction error:', error);
      throw new Error(`Failed to extract audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert audio to Whisper-compatible format
   */
  async convertAudioFormat(inputPath: string): Promise<string> {
    if (!this.ffmpegAvailable) {
      // If FFmpeg not available, try to use the file as-is
      console.log('⚠️ FFmpeg not available. Using original file.');
      return inputPath;
    }

    try {
      const outputDir = path.join(__dirname, '../../temp');
      await fs.mkdir(outputDir, { recursive: true });

      const timestamp = Date.now();
      const outputPath = path.join(outputDir, `converted_${timestamp}.wav`);

      console.log('🔄 Converting audio format...');

      // Convert to 16kHz mono WAV
      const command = `ffmpeg -i "${inputPath}" -acodec pcm_s16le -ar 16000 -ac 1 "${outputPath}" -y`;

      await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024
      });

      console.log('✅ Audio converted successfully');
      return outputPath;

    } catch (error) {
      console.error('🔴 Audio conversion error:', error);
      // If conversion fails, return original path
      return inputPath;
    }
  }

  /**
   * Get audio duration in seconds
   */
  async getAudioDuration(audioPath: string): Promise<number> {
    if (!this.ffprobeAvailable) {
      console.log('⚠️ FFprobe not available. Cannot get duration.');
      return 0;
    }

    try {
      const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
      
      const { stdout } = await execAsync(command);
      const duration = parseFloat(stdout.trim());

      return isNaN(duration) ? 0 : duration;

    } catch (error) {
      console.error('⚠️ Failed to get audio duration:', error);
      return 0;
    }
  }

  /**
   * Get detailed audio metadata
   */
  async getAudioMetadata(audioPath: string): Promise<AudioMetadata | null> {
    if (!this.ffprobeAvailable) {
      return null;
    }

    try {
      const command = `ffprobe -v error -show_format -show_streams -print_format json "${audioPath}"`;
      
      const { stdout } = await execAsync(command);
      const data = JSON.parse(stdout);

      const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');
      
      if (!audioStream) {
        return null;
      }

      return {
        duration: parseFloat(data.format.duration || 0),
        format: data.format.format_name || 'unknown',
        codec: audioStream.codec_name || 'unknown',
        sampleRate: parseInt(audioStream.sample_rate || 0),
        channels: parseInt(audioStream.channels || 0),
        bitrate: parseInt(data.format.bit_rate || 0)
      };

    } catch (error) {
      console.error('⚠️ Failed to get audio metadata:', error);
      return null;
    }
  }

  /**
   * Validate audio file
   */
  async validateAudioFile(filePath: string): Promise<boolean> {
    try {
      // Check file exists
      await fs.access(filePath);

      // Check file size (not empty)
      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        throw new Error('File is empty');
      }

      // If FFprobe available, check if it's a valid audio/video file
      if (this.ffprobeAvailable) {
        const metadata = await this.getAudioMetadata(filePath);
        if (!metadata) {
          throw new Error('Not a valid audio/video file');
        }

        // Check duration
        if (metadata.duration === 0) {
          throw new Error('Audio duration is zero');
        }
      }

      return true;

    } catch (error) {
      console.error('🔴 Audio validation failed:', error);
      return false;
    }
  }

  /**
   * Get file size in MB
   */
  async getFileSizeMB(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size / (1024 * 1024);
    } catch {
      return 0;
    }
  }

  /**
   * Clean up temporary file
   */
  async cleanupFile(filePath: string): Promise<void> {
    try {
      // Only delete files in temp directory
      if (filePath.includes('/temp/') || filePath.includes('\\temp\\')) {
        await fs.unlink(filePath);
        console.log('🗑️ Cleaned up temp file:', path.basename(filePath));
      }
    } catch (error) {
      console.error('⚠️ Failed to cleanup file:', error);
    }
  }

  /**
   * Clean up all old temp files (older than 1 hour)
   */
  async cleanupOldTempFiles(): Promise<void> {
    try {
      const tempDir = path.join(__dirname, '../../temp');
      
      try {
        await fs.access(tempDir);
      } catch {
        return; // Temp dir doesn't exist
      }

      const files = await fs.readdir(tempDir);
      const oneHourAgo = Date.now() - (60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtimeMs < oneHourAgo) {
          await fs.unlink(filePath);
          console.log('🗑️ Cleaned up old temp file:', file);
        }
      }

    } catch (error) {
      console.error('⚠️ Failed to cleanup old temp files:', error);
    }
  }

  /**
   * Split audio file into chunks (for very long files)
   */
  async splitAudioIntoChunks(
    audioPath: string, 
    chunkDurationSeconds: number = 600 // 10 minutes
  ): Promise<string[]> {
    if (!this.ffmpegAvailable) {
      throw new Error('FFmpeg is required to split audio files');
    }

    try {
      const duration = await this.getAudioDuration(audioPath);
      
      if (duration <= chunkDurationSeconds) {
        // No need to split
        return [audioPath];
      }

      const outputDir = path.join(__dirname, '../../temp');
      await fs.mkdir(outputDir, { recursive: true });

      const timestamp = Date.now();
      const outputPattern = path.join(outputDir, `chunk_${timestamp}_%03d.wav`);

      console.log(`✂️ Splitting audio into ${Math.ceil(duration / chunkDurationSeconds)} chunks...`);

      // Split audio into chunks
      const command = `ffmpeg -i "${audioPath}" -f segment -segment_time ${chunkDurationSeconds} -c copy "${outputPattern}"`;

      await execAsync(command, {
        maxBuffer: 50 * 1024 * 1024
      });

      // Get all chunk files
      const files = await fs.readdir(outputDir);
      const chunkFiles = files
        .filter(f => f.startsWith(`chunk_${timestamp}_`))
        .map(f => path.join(outputDir, f))
        .sort();

      console.log(`✅ Audio split into ${chunkFiles.length} chunks`);
      return chunkFiles;

    } catch (error) {
      console.error('🔴 Audio splitting error:', error);
      throw error;
    }
  }

  /**
   * Check if file is video
   */
  isVideoFile(filePath: string): boolean {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.m4v'];
    const ext = path.extname(filePath).toLowerCase();
    return videoExtensions.includes(ext);
  }

  /**
   * Check if file is audio
   */
  isAudioFile(filePath: string): boolean {
    const audioExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.wma', '.aac', '.opus'];
    const ext = path.extname(filePath).toLowerCase();
    return audioExtensions.includes(ext);
  }
}

export const fileProcessor = new FileProcessor();