import { VideoProcessor } from './src/lib/video-processing';
import { join } from 'path';
import { tmpdir } from 'os';
import { unlink, stat } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function createDummyVideo(path: string, duration: number, sizeMB: number) {
    console.log(`Generating dummy video at ${path}...`);
    // size = bitrate * duration / 8
    // bitrate = size * 8 / duration
    const bitrate = Math.floor((sizeMB * 1024 * 1024 * 8) / duration);

    try {
        await execAsync(
            `ffmpeg -f lavfi -i testsrc=duration=${duration}:size=1280x720:rate=30 -b:v ${bitrate} -y "${path}"`
        );
        console.log('Dummy video generated.');
    } catch (error) {
        console.error('Error generating dummy video:', error);
        throw error;
    }
}

async function testSmartTrim() {
    const processor = new VideoProcessor();
    const tempPath = join(tmpdir(), 'test_large_video.mp4');

    try {
        console.log('Starting test...');
        // Create a 30MB video (limit is 20MB)
        await createDummyVideo(tempPath, 30, 30);

        const initialStats = await stat(tempPath);
        console.log(`Initial size: ${(initialStats.size / 1024 / 1024).toFixed(2)} MB`);

        console.log('Processing video (calling processVideoForGemini)...');
        const result = await processor.processVideoForGemini(tempPath);

        console.log('Processing complete!');
        console.log(`Original Size: ${(result.originalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Processed Size: ${(result.processedSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Trimmed: ${result.trimmed}`);

        if (result.processedSize > 20 * 1024 * 1024) {
            throw new Error('Processed video is still larger than 20MB');
        }

        if (!result.trimmed) {
            throw new Error('Video was not trimmed');
        }

        console.log('Test PASSED');

    } catch (error) {
        console.error('Test FAILED:', error);
    } finally {
        // Cleanup
        console.log('Cleaning up...');
        await unlink(tempPath).catch(() => { });
    }
}

testSmartTrim();
