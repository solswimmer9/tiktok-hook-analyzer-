import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import crypto from 'crypto';
import { logDebug } from './debug-logger';

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
      // Download video using curl with better error handling
      // -f: fail silently on HTTP errors
      // -L: follow redirects
      // -A: set user-agent
      // --max-time: timeout after 60 seconds
      const { stdout, stderr } = await execAsync(
        `curl -f -L -A "Mozilla/5.0" --max-time 60 -o "${tempPath}" "${videoUrl}"`
      );

      logDebug(`[VideoProcessor] curl stdout: ${stdout}`);
      if (stderr) {
        logDebug(`[VideoProcessor] curl stderr: ${stderr}`);
      }

      return tempPath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logDebug(`[VideoProcessor] curl failed: ${errorMessage}`);
      console.error('Error downloading video:', errorMessage);
      throw new Error(`Failed to download video: ${errorMessage}`);
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

    // If video is larger than 20MB, calculate exact duration needed
    if (originalInfo.size > this.MAX_SIZE_BYTES) {
      const tempId = crypto.randomUUID();

      // Calculate target duration with 10% buffer to be safe
      // target = current * (max_size / current_size) * 0.9
      const compressionRatio = this.MAX_SIZE_BYTES / originalInfo.size;
      const targetDuration = originalInfo.duration * compressionRatio * 0.9;

      console.log(`Video too large (${this.formatFileSize(originalInfo.size)}). Trimming to ~${targetDuration.toFixed(2)}s`);

      const trimmedPath = join(tmpdir(), `trimmed_${tempId}.mp4`);

      try {
        // Trim to calculated duration in one pass
        // We use the calculated ratio directly instead of a fixed 0.5
        await execAsync(
          `ffmpeg -i "${currentPath}" -t ${targetDuration} -c copy -avoid_negative_ts make_zero "${trimmedPath}"`
        );

        const trimmedInfo = await this.getVideoInfo(trimmedPath);

        // Clean up previous temp file if it's not the original
        if (currentPath !== videoPath) {
          await unlink(currentPath).catch(() => { });
        }

        currentPath = trimmedPath;
        trimmed = true;

        // Verify size (should be under limit due to buffer)
        if (trimmedInfo.size > this.MAX_SIZE_BYTES) {
          console.warn(`Trimmed video still too large (${this.formatFileSize(trimmedInfo.size)}). Forcing hard limit.`);
          // Fallback: If somehow still too large (unlikely with 10% buffer), do a hard cut to 15MB size equivalent
          // This is a safety net
          const emergencyPath = join(tmpdir(), `emergency_${tempId}.mp4`);
          const emergencyDuration = targetDuration * 0.8;

          await execAsync(
            `ffmpeg -i "${currentPath}" -t ${emergencyDuration} -c copy -avoid_negative_ts make_zero "${emergencyPath}"`
          );

          await unlink(currentPath).catch(() => { });
          currentPath = emergencyPath;
        }

      } catch (error) {
        console.error('Error in smart trim:', error);
        throw new Error('Failed to trim video to size');
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
    logDebug(`[VideoProcessor] Starting download from: ${videoUrl.substring(0, 100)}...`);

    const downloadedPath = await this.downloadVideo(videoUrl);
    logDebug(`[VideoProcessor] Downloaded to: ${downloadedPath}`);

    try {
      const result = await this.processVideoForGemini(downloadedPath);
      logDebug(`[VideoProcessor] Processed video: ${this.formatFileSize(result.processedSize)}, trimmed=${result.trimmed}`);

      // Clean up original download if it's different from processed file
      if (result.tempFilePath !== downloadedPath) {
        await this.cleanup(downloadedPath);
      }

      return result;
    } catch (error) {
      logDebug(`[VideoProcessor] ERROR: ${error instanceof Error ? error.message : String(error)}`);
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