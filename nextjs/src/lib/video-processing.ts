import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import crypto from 'crypto';

const execAsync = promisify(exec);

export interface VideoProcessingResult {
  originalSize: number;
  processedSize: number;
  trimmed: boolean;
  base64: string;
  tempFilePath: string;
}

export class VideoProcessor {
  private readonly MAX_SIZE_MB = 20;
  private readonly MAX_SIZE_BYTES = this.MAX_SIZE_MB * 1024 * 1024;

  async downloadVideo(videoUrl: string): Promise<string> {
    const tempId = crypto.randomUUID();
    const tempPath = join(tmpdir(), `tiktok_${tempId}.mp4`);

    try {
      // Download video using curl
      await execAsync(`curl -o "${tempPath}" "${videoUrl}"`);
      return tempPath;
    } catch (error) {
      console.error('Error downloading video:', error);
      throw new Error('Failed to download video');
    }
  }

  async getVideoInfo(videoPath: string): Promise<{
    duration: number;
    size: number;
    bitrate: number;
  }> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`
      );
      
      const info = JSON.parse(stdout);
      const videoStream = info.streams.find((s: any) => s.codec_type === 'video');
      
      return {
        duration: parseFloat(info.format.duration),
        size: parseInt(info.format.size),
        bitrate: parseInt(info.format.bit_rate || '0'),
      };
    } catch (error) {
      console.error('Error getting video info:', error);
      throw new Error('Failed to get video information');
    }
  }

  async trimVideo(inputPath: string, outputPath: string, durationRatio: number = 0.5): Promise<void> {
    try {
      const videoInfo = await this.getVideoInfo(inputPath);
      const trimDuration = videoInfo.duration * durationRatio;
      
      // Trim from the beginning (first half) since we focus on hooks
      await execAsync(
        `ffmpeg -i "${inputPath}" -t ${trimDuration} -c copy -avoid_negative_ts make_zero "${outputPath}"`
      );
    } catch (error) {
      console.error('Error trimming video:', error);
      throw new Error('Failed to trim video');
    }
  }

  async processVideoForGemini(videoPath: string): Promise<VideoProcessingResult> {
    const originalInfo = await this.getVideoInfo(videoPath);
    let currentPath = videoPath;
    let trimmed = false;
    
    // If video is larger than 20MB, keep trimming until it's under the limit
    if (originalInfo.size > this.MAX_SIZE_BYTES) {
      const tempId = crypto.randomUUID();
      let trimRatio = 0.5;
      
      while (true) {
        const trimmedPath = join(tmpdir(), `trimmed_${tempId}_${trimRatio}.mp4`);
        
        try {
          await this.trimVideo(currentPath, trimmedPath, trimRatio);
          const trimmedInfo = await this.getVideoInfo(trimmedPath);
          
          // Clean up previous temp file if it's not the original
          if (currentPath !== videoPath) {
            await unlink(currentPath).catch(() => {});
          }
          
          currentPath = trimmedPath;
          trimmed = true;
          
          // If under size limit, we're done
          if (trimmedInfo.size <= this.MAX_SIZE_BYTES) {
            break;
          }
          
          // If still too large, trim further (half of current length)
          trimRatio = 0.5;
        } catch (error) {
          console.error('Error in trim iteration:', error);
          break;
        }
      }
    }

    // Convert to base64
    const videoBuffer = await readFile(currentPath);
    const base64 = videoBuffer.toString('base64');
    
    // Get final size
    const finalInfo = await this.getVideoInfo(currentPath);
    
    return {
      originalSize: originalInfo.size,
      processedSize: finalInfo.size,
      trimmed,
      base64,
      tempFilePath: currentPath,
    };
  }

  async cleanup(tempFilePath: string): Promise<void> {
    try {
      await unlink(tempFilePath);
    } catch (error) {
      console.error('Error cleaning up temp file:', error);
    }
  }

  async downloadAndProcessVideo(videoUrl: string): Promise<VideoProcessingResult> {
    const downloadedPath = await this.downloadVideo(videoUrl);
    
    try {
      const result = await this.processVideoForGemini(downloadedPath);
      
      // Clean up original download if it's different from processed file
      if (result.tempFilePath !== downloadedPath) {
        await this.cleanup(downloadedPath);
      }
      
      return result;
    } catch (error) {
      // Clean up on error
      await this.cleanup(downloadedPath);
      throw error;
    }
  }

  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  }
}

export const videoProcessor = new VideoProcessor();