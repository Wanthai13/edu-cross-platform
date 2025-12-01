// services/whisper-service/whisper.service.ts
import FormData from 'form-data';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TranscriptionOptions {
  language?: string; // 'vi', 'en', hoặc undefined (auto-detect)
}

interface TranscriptionResult {
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
  
  private useOpenAI: boolean;
  private openAIKey?: string;
  private colabUrl?: string;
  
  constructor() {
    // Kiểm tra môi trường để chọn provider
    this.useOpenAI = process.env.USE_OPENAI_WHISPER === 'true';
    this.openAIKey = process.env.OPENAI_API_KEY;
    this.colabUrl = process.env.COLAB_WHISPER_URL;
    
    console.log('🎙️ Whisper Service Configuration:');
    console.log(`   Provider: ${this.useOpenAI ? 'OpenAI API' : 'Colab/Local'}`);
    
    if (this.useOpenAI && !this.openAIKey) {
      console.warn('⚠️  OpenAI enabled but no API key found!');
    }
    
    if (!this.useOpenAI && !this.colabUrl) {
      console.warn('⚠️  No Colab URL configured. Using local Whisper (slow).');
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
      
      // Chọn provider dựa trên config
      if (this.useOpenAI) {
        return await this.transcribeWithOpenAI(audioPath, options);
      } else if (this.colabUrl) {
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
  // OPENAI WHISPER API (Khuyến nghị production)
  // ==========================================
  
  private async transcribeWithOpenAI(
    audioPath: string,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    if (!this.openAIKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    console.log('☁️  Using OpenAI Whisper API...');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioPath));
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    
    if (options.language) {
      formData.append('language', options.language);
    }
    
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${this.openAIKey}`,
          ...formData.getHeaders()
        },
        timeout: 300000 // 5 minutes
      }
    );
    
    const data = response.data;
    
    // Format segments
    const segments = (data.segments || []).map((seg: any, idx: number) => ({
      id: idx,
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
      confidence: seg.no_speech_prob ? 1 - seg.no_speech_prob : undefined
    }));
    
    return {
      text: data.text || '',
      language: data.language || 'unknown',
      duration: data.duration || 0,
      segments,
      confidence: undefined // OpenAI không trả về overall confidence
    };
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
  // HEALTH CHECK
  // ==========================================
  
  async healthCheck(): Promise<{ status: string; provider: string; available: boolean }> {
    if (this.useOpenAI) {
      return {
        status: 'ok',
        provider: 'OpenAI',
        available: !!this.openAIKey
      };
    }
    
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
    if (this.useOpenAI) {
      return !!this.openAIKey;
    }
    if (this.colabUrl) {
      return true; // Will check on actual request
    }
    return true; // Local always "available" but slow
  }
}

export const whisperService = new WhisperService();