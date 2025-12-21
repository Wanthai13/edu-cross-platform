// services/whisper-service/whisper.service.ts
import axios from 'axios';
import { exec } from 'child_process';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TranscriptionOptions {
  language?: string; // 'vi', 'en', hoặc undefined (auto-detect)
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
  
  // OpenAI support removed – only Colab or local Whisper are used now
  private colabUrl?: string;
  
  constructor() {
    // By default prefer Colab URL; otherwise fall back to local Whisper
    // Use COLAB_WHISPER_URL from server .env (ngrok to Kaggle/Colab)
    this.colabUrl = process.env.COLAB_WHISPER_URL;
    
    console.log('🎙️ Whisper Service Configuration:');
    console.log(`   Provider: ${this.colabUrl ? 'Colab/Remote Whisper' : 'Local Whisper CLI'}`);

    if (!this.colabUrl) {
      console.warn('⚠️  No Colab URL configured. Using local Whisper (may be slow).');
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
      
      // Chọn provider dựa trên config (Colab preferred, otherwise local)
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
  // COLAB WHISPER (Khuyến nghị cho MVP/testing)
  // ==========================================
  
  private async transcribeWithColab(
    audioPath: string,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    if (!this.colabUrl) {
      throw new Error('Colab URL not configured');
    }
    
    console.log(`🌐 Using Colab Whisper: ${this.colabUrl}`);
    
    // Health check trước
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
        timeout: 600000, // 10 minutes (Colab có thể chậm hơn)
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
  // LOCAL WHISPER (Fallback, rất chậm)
  // ==========================================
  
  private async transcribeWithLocal(
    audioPath: string,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    console.log('💻 Using local Whisper (this will be slow)...');
    
    // Kiểm tra xem whisper CLI có được cài không
    try {
      await execAsync('whisper --help');
    } catch {
      throw new Error('Whisper CLI not installed. Please run: pip install openai-whisper');
    }
    
    // Tạo output path
    const outputDir = path.dirname(audioPath);
    const outputName = path.basename(audioPath, path.extname(audioPath));
    
    // Build command
    let command = `whisper "${audioPath}" --model base --output_dir "${outputDir}" --output_format json`;
    
    if (options.language) {
      command += ` --language ${options.language}`;
    }
    
    // Run whisper
    console.log('⏳ Running Whisper CLI (this may take several minutes)...');
    await execAsync(command);
    
    // Read result JSON
    const jsonPath = path.join(outputDir, `${outputName}.json`);
    const result = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    
    // Cleanup JSON file
    fs.unlinkSync(jsonPath);
    
    // Format segments
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
    
    // Sử dụng ffmpeg để extract audio
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
  async downloadYouTubeAudio(url: string): Promise<string> {
    if (!url || !/^https?:\/\//.test(url)) {
      throw new Error('Invalid YouTube URL');
    }
    const uploadsDir = path.resolve(__dirname, '../../uploads/audio');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const outFileBase = `yt-${Date.now()}-${Math.round(Math.random()*1e6)}`;
    const outFilePath = path.join(uploadsDir, `${outFileBase}.wav`);
    // Use yt-dlp to extract audio and ffmpeg to convert to 16k mono wav
    // Command downloads best audio and writes to temp; then convert to required format
    const tempFile = path.join(uploadsDir, `${outFileBase}.m4a`);
    try {
      // Download best audio
      await execAsync(`yt-dlp -f bestaudio -o "${tempFile}" "${url}"`);
    } catch (e) {
      throw new Error('yt-dlp download failed. Please install yt-dlp');
    }
    try {
      // Convert to wav 16k mono for Whisper
      await execAsync(`ffmpeg -i "${tempFile}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${outFilePath}" -y`);
      // Cleanup temp
      fs.existsSync(tempFile) && fs.unlinkSync(tempFile);
    } catch (e) {
      throw new Error('ffmpeg convert failed. Please install ffmpeg');
    }
    return outFilePath;
  }
  
  // ==========================================
  // HEALTH CHECK
  // ==========================================
  
  async healthCheck(): Promise<{ status: string; provider: string; available: boolean }> {
    if (this.colabUrl) {
      try {
        await axios.get(`${this.colabUrl}/health`, { timeout: 5000 });
        return {
          status: 'ok',
          provider: 'Colab',
          available: true
        };
      } catch {
        return {
          status: 'error',
          provider: 'Colab',
          available: false
        };
      }
    }
    
    return {
      status: 'warning',
      provider: 'Local',
      available: true
    };
  }
  
  // Alias for backward compatibility
  async checkAvailability(): Promise<boolean> {
    const health = await this.healthCheck();
    return health.available;
  }
  
  // Property for quick access
  get isAvailable(): boolean {
    if (this.colabUrl) {
      return true; // Will check on actual request
    }
    return true; // Local always "available" but slow
  }
}

export const whisperService = new WhisperService();