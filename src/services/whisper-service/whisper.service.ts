// services/whisper-service/whisper.service.ts
import axios from 'axios';
import { exec } from 'child_process';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TranscriptionOptions {
  language?: string; // 'vi', 'en', or undefined (auto-detect)
}

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  segments: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
    confidence?: number;
  }>;
  confidence?: number;
}

class WhisperService {
  // ==========================================
  // CONFIGURATION
  // ==========================================
  
  private colabUrl?: string;
  private ytDlpAvailable: boolean = false;
  
  constructor() {
    this.colabUrl = process.env.COLAB_WHISPER_URL;
    
    console.log('🎙️ Whisper Service Configuration:');
    console.log(`   Provider: ${this.colabUrl ? 'Colab/Remote Whisper' : 'Local Whisper CLI'}`);

    if (!this.colabUrl) {
      console.warn('⚠️  No Colab URL configured. Using local Whisper (may be slow).');
    }
    
    // Check if yt-dlp is available
    this.checkYtDlpAvailability();
  }
  
  private async checkYtDlpAvailability(): Promise<void> {
    try {
      await execAsync('yt-dlp --version');
      this.ytDlpAvailable = true;
      console.log('✅ yt-dlp is available');
    } catch {
      this.ytDlpAvailable = false;
      console.warn('⚠️  yt-dlp not found. YouTube audio download will not be available.');
      console.warn('   Install with: pip install yt-dlp OR npm install -g yt-dlp');
    }
  }
  
  // ==========================================
  // MAIN TRANSCRIPTION METHOD
  // ==========================================
  
  async transcribe(
    audioPath: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    try {
      console.log(`🎙️ Transcribing: ${path.basename(audioPath)}`);
      console.log(`   Language: ${options.language || 'auto-detect'}`);
      
      if (this.colabUrl) {
        return await this.transcribeWithColab(audioPath, options);
      } else {
        return await this.transcribeWithLocal(audioPath, options);
      }
    } catch (error) {
      console.error('🔴 Transcription failed:', error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // ==========================================
  // COLAB WHISPER
  // ==========================================
  
  private async transcribeWithColab(
    audioPath: string,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    if (!this.colabUrl) {
      throw new Error('Colab URL not configured');
    }
    
    console.log(`🌐 Using Colab Whisper: ${this.colabUrl}`);
    
    try {
      console.log(`🔎 Health check: ${this.colabUrl}/health`);
      await axios.get(`${this.colabUrl}/health`, { timeout: 5000 });
    } catch (error) {
      throw new Error('Colab server not responding. Please restart your Colab notebook.');
    }
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioPath));
    
    if (options.language && options.language !== 'auto') {
      formData.append('language', options.language);
    }
    
    const response = await axios.post(
      `${this.colabUrl}/transcribe`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 600000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Colab transcription failed');
    }
    
    return {
      text: response.data.text || '',
      language: response.data.language || 'unknown',
      duration: response.data.duration || 0,
      segments: response.data.segments || [],
      confidence: response.data.confidence
    };
  }
  
  // ==========================================
  // LOCAL WHISPER
  // ==========================================
  
  private async transcribeWithLocal(
    audioPath: string,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    console.log('💻 Using local Whisper (this will be slow)...');
    
    try {
      await execAsync('whisper --help');
    } catch {
      throw new Error('Whisper CLI not installed. Please run: pip install openai-whisper');
    }
    
    const outputDir = path.dirname(audioPath);
    const outputName = path.basename(audioPath, path.extname(audioPath));
    
    let command = `whisper "${audioPath}" --model base --output_dir "${outputDir}" --output_format json`;
    
    if (options.language) {
      command += ` --language ${options.language}`;
    }
    
    console.log('⏳ Running Whisper CLI (this may take several minutes)...');
    await execAsync(command);
    
    const jsonPath = path.join(outputDir, `${outputName}.json`);
    const result = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    
    fs.unlinkSync(jsonPath);
    
    const segments = (result.segments || []).map((seg: any) => ({
      id: seg.id,
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
      confidence: seg.no_speech_prob ? 1 - seg.no_speech_prob : undefined
    }));
    
    return {
      text: result.text || '',
      language: result.language || 'unknown',
      duration: result.duration || 0,
      segments,
      confidence: undefined
    };
  }
  
  // ==========================================
  // VIDEO TO AUDIO EXTRACTION
  // ==========================================
  
  async extractAudio(videoPath: string): Promise<string> {
    const outputPath = videoPath.replace(path.extname(videoPath), '.wav');
    
    console.log('🎬 Extracting audio from video...');
    
    const command = `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${outputPath}" -y`;
    
    try {
      await execAsync(command);
      console.log('✅ Audio extracted successfully');
      return outputPath;
    } catch (error) {
      throw new Error(`Failed to extract audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==========================================
  // YOUTUBE AUDIO DOWNLOAD (requires yt-dlp)
  // ==========================================
  
  /**
   * Check if YouTube audio download is available
   */
  isYouTubeDownloadAvailable(): boolean {
    return this.ytDlpAvailable;
  }
  
  /**
   * Download audio from YouTube URL
   * Throws error if yt-dlp is not available
   */
  async downloadYouTubeAudio(url: string): Promise<string> {
    // Validate URL
    if (!url || !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(url)) {
      throw new Error('Invalid YouTube URL');
    }
    
    // Check if yt-dlp is available
    if (!this.ytDlpAvailable) {
      throw new Error(
        'yt-dlp is not installed. YouTube audio download is not available.\n' +
        'Install with: pip install yt-dlp OR npm install -g yt-dlp\n' +
        'Or use videos with existing subtitles instead.'
      );
    }
    
    const uploadsDir = path.resolve(__dirname, '../../uploads/audio');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const outFileBase = `yt-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const outFilePath = path.join(uploadsDir, `${outFileBase}.wav`);
    const tempFile = path.join(uploadsDir, `${outFileBase}.temp`);
    
    try {
      console.log('📥 Downloading audio from YouTube...');
      
      // Download best audio using yt-dlp
      // -f bestaudio: select best audio quality
      // --extract-audio: extract audio from video
      // -o: output file path
      const downloadCmd = `yt-dlp -f bestaudio --extract-audio -o "${tempFile}.%(ext)s" "${url}"`;
      await execAsync(downloadCmd);
      
      // Find the downloaded file (yt-dlp adds extension automatically)
      const files = fs.readdirSync(uploadsDir);
      const downloadedFile = files.find(f => f.startsWith(path.basename(tempFile)));
      
      if (!downloadedFile) {
        throw new Error('Downloaded file not found');
      }
      
      const downloadedPath = path.join(uploadsDir, downloadedFile);
      
      console.log('🔄 Converting to WAV format...');
      
      // Convert to 16kHz mono WAV for Whisper
      const convertCmd = `ffmpeg -i "${downloadedPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${outFilePath}" -y`;
      await execAsync(convertCmd);
      
      // Cleanup temp file
      if (fs.existsSync(downloadedPath)) {
        fs.unlinkSync(downloadedPath);
      }
      
      console.log('✅ Audio downloaded and converted successfully');
      return outFilePath;
      
    } catch (error) {
      // Cleanup on error
      const files = fs.readdirSync(uploadsDir);
      files.forEach(f => {
        if (f.startsWith(outFileBase)) {
          try {
            fs.unlinkSync(path.join(uploadsDir, f));
          } catch {}
        }
      });
      
      if (error instanceof Error) {
        if (error.message.includes('yt-dlp')) {
          throw new Error('yt-dlp command failed. Please ensure yt-dlp is properly installed.');
        }
        if (error.message.includes('ffmpeg')) {
          throw new Error('ffmpeg command failed. Please ensure ffmpeg is properly installed.');
        }
        throw error;
      }
      
      throw new Error('Failed to download YouTube audio');
    }
  }
  
  // ==========================================
  // HEALTH CHECK
  // ==========================================
  
  async healthCheck(): Promise<{ 
    status: string; 
    provider: string; 
    available: boolean;
    ytDlpAvailable?: boolean;
  }> {
    if (this.colabUrl) {
      try {
        await axios.get(`${this.colabUrl}/health`, { timeout: 5000 });
        return {
          status: 'ok',
          provider: 'Colab',
          available: true,
          ytDlpAvailable: this.ytDlpAvailable
        };
      } catch {
        return {
          status: 'error',
          provider: 'Colab',
          available: false,
          ytDlpAvailable: this.ytDlpAvailable
        };
      }
    }
    
    return {
      status: 'warning',
      provider: 'Local',
      available: true,
      ytDlpAvailable: this.ytDlpAvailable
    };
  }
  
  async checkAvailability(): Promise<boolean> {
    const health = await this.healthCheck();
    return health.available;
  }
  
  get isAvailable(): boolean {
    if (this.colabUrl) {
      return true;
    }
    return true;
  }
}

export const whisperService = new WhisperService();