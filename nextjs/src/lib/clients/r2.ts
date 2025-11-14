import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import crypto from 'crypto';

export interface R2UploadResult {
  key: string;
  url: string;
  publicUrl: string;
  size: number;
}

class SupabaseStorageClient {
  private supabase: ReturnType<typeof createClient>;
  private bucketName: string;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucketName = 'tiktok-videos';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables');
    }

    this.bucketName = bucketName;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  private generateKey(originalName: string, prefix: string = 'videos'): string {
    const timestamp = Date.now();
    const randomId = crypto.randomUUID();
    const extension = originalName.split('.').pop() || 'mp4';
    return `${prefix}/${timestamp}-${randomId}.${extension}`;
  }

  async uploadFile(filePath: string, originalName: string): Promise<R2UploadResult> {
    const key = this.generateKey(originalName);
    const fileBuffer = await readFile(filePath);

    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(key, fileBuffer, {
          contentType: 'video/mp4',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading to Supabase Storage:', error);
        throw error;
      }

      const publicUrl = this.getPublicUrl(key);

      return {
        key,
        url: publicUrl,
        publicUrl,
        size: fileBuffer.length,
      };
    } catch (error) {
      console.error('Error uploading to Supabase Storage:', error);
      throw new Error('Failed to upload video to Supabase Storage');
    }
  }

  async uploadBuffer(buffer: Buffer, fileName: string): Promise<R2UploadResult> {
    const key = this.generateKey(fileName);

    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(key, buffer, {
          contentType: 'video/mp4',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading buffer to Supabase Storage:', error);
        throw error;
      }

      const publicUrl = this.getPublicUrl(key);

      return {
        key,
        url: publicUrl,
        publicUrl,
        size: buffer.length,
      };
    } catch (error) {
      console.error('Error uploading buffer to Supabase Storage:', error);
      throw new Error('Failed to upload video buffer to Supabase Storage');
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(key, expiresIn);

      if (error) {
        console.error('Error generating signed URL:', error);
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([key]);

      if (error) {
        console.error('Error deleting from Supabase Storage:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting from Supabase Storage:', error);
      throw new Error('Failed to delete video from Supabase Storage');
    }
  }

  getPublicUrl(key: string): string {
    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(key);

    return data.publicUrl;
  }

  async uploadStream(stream: NodeJS.ReadableStream, fileName: string): Promise<R2UploadResult> {
    const key = this.generateKey(fileName);

    // Convert stream to buffer
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const result = await this.uploadBuffer(buffer, fileName);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      stream.on('error', reject);
    });
  }

  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  }
}

export const r2Client = new SupabaseStorageClient();
