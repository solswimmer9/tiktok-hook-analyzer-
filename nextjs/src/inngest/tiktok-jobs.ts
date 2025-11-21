import { inngestClient } from "@/lib/clients/inngest";
import { supabaseServer } from "@/lib/clients/supabase";
import { tiktokApi, ProcessedTikTokVideo } from "@/lib/clients/tiktok";
import { videoProcessor } from "@/lib/video-processing";
import { r2Client } from "@/lib/clients/r2";
import { geminiClient, HookAnalysisResult } from "@/lib/clients/gemini";
import { Database } from "@shared-types/database.types";

import { logDebug } from "@/lib/debug-logger";

// Search and process TikTok videos for a search term
export const searchTikTokVideos = inngestClient.createFunction(
  {
    id: "tiktok/search-videos",
  },
  {
    event: "tiktok/search-videos",
  },
  async ({ event, step, logger }) => {
    const { searchTermId, searchTerm, userId } = event.data;

    logger.info(`Starting TikTok video search for term: ${searchTerm}`);
    logDebug(`Starting TikTok video search for term: ${searchTerm}`);

    // Step 1: Search TikTok videos
    const videos = await step.run("tiktok: search and filter videos", async () => {
      try {
        logDebug(`Inside step.run: searching videos for ${searchTerm}`);
        const allVideos = await tiktokApi.searchVideosWithPagination(searchTerm, 10, 100);
        const topVideos = tiktokApi.filterTopVideos(allVideos, 0.5); // Top 50%

        logger.info(`Found ${allVideos.length} videos, filtered to top ${topVideos.length}`);
        logDebug(`Found ${allVideos.length} videos, filtered to top ${topVideos.length}`);
        return topVideos;
      } catch (error) {
        logDebug(`ERROR in search step: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    });

    // Step 2: Save videos to database
    const savedVideos = await step.run("db: save videos", async () => {
      // Remove duplicates by video_id to avoid "ON CONFLICT DO UPDATE command cannot affect row a second time" error
      const uniqueVideos = videos.filter((video, index, self) =>
        index === self.findIndex(v => v.id === video.id)
      );

      logger.info(`Filtered ${videos.length} videos to ${uniqueVideos.length} unique videos`);

      const videosToSave = uniqueVideos.map((video: ProcessedTikTokVideo) => ({
        search_term_id: searchTermId,
        video_id: video.id,
        title: video.title,
        creator: video.author.nickname,
        creator_username: video.author.uniqueId,
        view_count: video.stats.playCount,
        like_count: video.stats.diggCount,
        share_count: video.stats.shareCount,
        comment_count: video.stats.commentCount,
        duration: video.duration,
        video_url: video.webVideoUrl,
        thumbnail_url: video.cover,
        raw_payload: video as any, // Convert to JSON-compatible type
      }));

      const { data, error } = await supabaseServer
        .from("tiktok_videos")
        .upsert(videosToSave, { onConflict: "video_id" })
        .select("id, video_id, video_url");

      if (error) throw error;
      return data;
    });

    // Step 3: Queue video downloads
    await step.run("inngest: queue video downloads", async () => {
      const downloadPromises = savedVideos.map((video) => {
        const originalVideo = videos.find(v => v.id === video.video_id);

        return inngestClient.send({
          name: "tiktok/download-video",
          data: {
            videoId: video.id,
            searchTermId,
            videoUrl: video.video_url,
            directDownloadUrl: originalVideo?.playAddr || '', // Add direct download URL from search results
            videoMetadata: {
              title: originalVideo?.title || '',
              creator: originalVideo?.author.nickname || '',
              creatorUsername: originalVideo?.author.uniqueId || '',
              viewCount: originalVideo?.stats.playCount || 0,
              likeCount: originalVideo?.stats.diggCount || 0,
              shareCount: originalVideo?.stats.shareCount || 0,
              commentCount: originalVideo?.stats.commentCount || 0,
              duration: originalVideo?.duration || 0,
              thumbnailUrl: originalVideo?.cover || '',
            },
          },
        });
      });

      await Promise.all(downloadPromises);
      logger.info(`Queued ${downloadPromises.length} video downloads`);
      logDebug(`Queued ${downloadPromises.length} video downloads`);
    });

    return {
      searchTerm,
      videosFound: videos.length,
      videosQueued: savedVideos.length,
    };
  }
);

export const downloadTikTokVideo = inngestClient.createFunction(
  {
    id: "tiktok/download-video",
    retries: 3, // Retry failed downloads up to 3 times
  },
  {
    event: "tiktok/download-video",
  },
  async ({ event, step, logger }) => {
    try {
      const { videoId, searchTermId, videoUrl, directDownloadUrl, videoMetadata } = event.data;
      logDebug(`Starting download job for video: ${videoId}`);

      logger.info(`Starting download for video: ${videoId}`);

      // Step 1: Get download URL (either from direct URL or fetch from API)
      const downloadUrl = await step.run("tiktok: get download url", async () => {
        try {
          if (directDownloadUrl) {
            logger.info(`Using direct download URL from search results`);
            logDebug(`[${videoId}] Using direct URL: ${directDownloadUrl.substring(0, 100)}...`);
            return directDownloadUrl;
          }

          // Fallback: Fetch download URL from TikTok API using video_url
          logger.info(`No direct URL available, fetching from TikTok API for: ${videoUrl}`);
          logDebug(`[${videoId}] Fetching download URL from API for: ${videoUrl}`);

          const downloadInfo = await tiktokApi.downloadVideo(videoUrl);
          const url = downloadInfo.play || downloadInfo.play_watermark;

          if (!url) {
            throw new Error('No download URL returned from TikTok API');
          }

          logger.info(`Successfully got download URL from API`);
          logDebug(`[${videoId}] Got download URL from API: ${url.substring(0, 100)}...`);
          return url;
        } catch (error) {
          logger.error(`Failed to get download URL from API: ${error}`);
          logDebug(`[${videoId}] ERROR getting download URL: ${error instanceof Error ? error.message : String(error)}`);
          throw new Error(`Failed to get download URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      // Step 2: Download, process, and upload video
      const uploadResult = await step.run("video: download, process, and upload", async () => {
        try {
          logDebug(`[${videoId}] Starting video download from: ${downloadUrl.substring(0, 100)}...`);

          // Download and process video
          const processedVideo = await videoProcessor.downloadAndProcessVideo(downloadUrl);
          logger.info(`Video processed: ${videoProcessor.formatFileSize(processedVideo.originalSize)} -> ${videoProcessor.formatFileSize(processedVideo.processedSize)}`);
          logDebug(`[${videoId}] Video processed: original=${videoProcessor.formatFileSize(processedVideo.originalSize)}, processed=${videoProcessor.formatFileSize(processedVideo.processedSize)}, trimmed=${processedVideo.trimmed}`);

          // Upload to R2
          const fileName = `${videoMetadata.creatorUsername}_${videoId}.mp4`;
          logDebug(`[${videoId}] Uploading to storage: ${fileName}`);

          const result = await r2Client.uploadFile(processedVideo.tempFilePath, fileName);
          logger.info(`Video uploaded to R2: ${result.key}`);
          logDebug(`[${videoId}] Upload completed: key=${result.key}, size=${videoProcessor.formatFileSize(result.size)}`);

          // Clean up temp file immediately after upload
          await videoProcessor.cleanup(processedVideo.tempFilePath);
          logDebug(`[${videoId}] Cleaned up temp file`);

          return {
            ...result,
            trimmed: processedVideo.trimmed,
            originalSize: processedVideo.originalSize,
            processedSize: processedVideo.processedSize
          };
        } catch (error) {
          logDebug(`[${videoId}] ERROR in download/process/upload: ${error instanceof Error ? error.message : String(error)}`);
          logger.error(`Failed to download/process/upload video: ${error}`);
          throw error;
        }
      });

      // Step 3: Update database with R2 info
      await step.run("db: update video with r2 info", async () => {
        try {
          logDebug(`[${videoId}] Updating database with R2 info`);

          const { error } = await supabaseServer
            .from("tiktok_videos")
            .update({
              r2_key: uploadResult.key,
              r2_url: uploadResult.publicUrl,
            })
            .eq("id", videoId);

          if (error) {
            logDebug(`[${videoId}] Database update error: ${error.message}`);
            throw error;
          }

          logDebug(`[${videoId}] Database updated successfully`);
        } catch (error) {
          logDebug(`[${videoId}] ERROR updating database: ${error instanceof Error ? error.message : String(error)}`);
          throw error;
        }
      });

      // Step 4: Queue hook analysis
      await step.run("inngest: queue hook analysis", async () => {
        try {
          logDebug(`[${videoId}] Queueing analysis job`);

          await inngestClient.send({
            name: "tiktok/analyze-hook",
            data: {
              videoId,
              r2Key: uploadResult.key,
              r2Url: uploadResult.publicUrl,
            },
          });

          logDebug(`[${videoId}] Analysis job queued successfully`);
        } catch (error) {
          logDebug(`[${videoId}] ERROR queueing analysis: ${error instanceof Error ? error.message : String(error)}`);
          throw error;
        }
      });

      logDebug(`COMPLETED download job for video: ${videoId}`);

      return {
        videoId,
        r2Key: uploadResult.key,
        fileSize: uploadResult.size,
        trimmed: uploadResult.trimmed,
      };
    } catch (error) {
      const videoId = event.data.videoId;
      logDebug(`FAILED download job for video ${videoId}: ${error instanceof Error ? error.message : String(error)}`);
      logger.error(`Download job failed for video ${videoId}: ${error}`);
      throw error; // Re-throw for Inngest retry logic
    }
  }
);

// Analyze video hook using Gemini
export const analyzeVideoHook = inngestClient.createFunction(
  {
    id: "tiktok/analyze-hook",
    concurrency: {
      limit: 10, // Process max 10 videos concurrently to speed up analysis
    },
    retries: 3, // Retry failed jobs up to 3 times
  },
  {
    event: "tiktok/analyze-hook",
  },
  async ({ event, step, logger }) => {
    const { videoId, r2Key, r2Url } = event.data;
    const startTime = Date.now();
    logDebug(`Starting analysis job for video: ${videoId}`);

    logger.info(`Starting hook analysis for video: ${videoId}`);

    // Step 1: Download video from Supabase Storage and analyze with Gemini
    const analysis = await step.run("storage: download and analyze video", async () => {
      // Download video from Supabase Storage using authenticated client
      logger.info(`Downloading video from Supabase Storage with key: ${r2Key}`);

      const { data: videoBlob, error: downloadError } = await supabaseServer.storage
        .from('tiktok-videos')
        .download(r2Key);

      if (downloadError) {
        logger.error(`Failed to download video from storage: ${downloadError.message}`);
        throw new Error(`Failed to download video from storage: ${downloadError.message}`);
      }

      if (!videoBlob) {
        throw new Error('No video data received from storage');
      }

      // Convert blob to buffer
      const buffer = await videoBlob.arrayBuffer();
      const videoSizeMB = (buffer.byteLength / 1024 / 1024).toFixed(2);
      logger.info(`Downloaded video for analysis: ${videoSizeMB} MB`);

      // Validate video size (Gemini has a 20MB limit)
      if (buffer.byteLength > 20 * 1024 * 1024) {
        throw new Error(`Video too large for analysis: ${videoSizeMB} MB (max 20MB)`);
      }

      const base64 = Buffer.from(buffer).toString('base64');

      // Analyze with Gemini (all in one step to avoid large data serialization)
      logger.info('Starting Gemini analysis...');
      const result = await geminiClient.analyzeVideoHook(base64);
      logger.info(`Hook analysis completed with score: ${result.overallScore}`);
      return result;
    });

    // Step 2: Save analysis to database
    await step.run("db: save hook analysis", async () => {
      logger.info('Saving hook analysis to database...');

      const { data, error } = await supabaseServer
        .from("hook_analysis")
        .insert({
          video_id: videoId,
          analysis_result: analysis,
          gemini_response: JSON.stringify(analysis),
        })
        .select();

      if (error) {
        logger.error(`Database error while saving analysis: ${error.message}`, {
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw new Error(`Failed to save analysis to database: ${error.message}`);
      }

      logger.info('Hook analysis saved successfully');
      return data;
    });

    return {
      videoId,
      overallScore: analysis.overallScore,
      hookType: analysis.engagementTactics.hook_type,
      processingTimeMs: Date.now() - startTime,
    };
  }
);

// Generate daily trend analysis
export const generateTrendAnalysis = inngestClient.createFunction(
  {
    id: "tiktok/generate-trends",
    retries: 3, // Retry failed jobs up to 3 times
  },
  [
    { event: "tiktok/generate-trends" },
    { cron: "0 6 * * *" } // Run daily at 6 AM
  ],
  async ({ event, step, logger }) => {
    const { date } = event.data;
    const analysisDate = date || new Date().toISOString().split('T')[0];

    logger.info(`Generating trend analysis for date: ${analysisDate}`);

    // Step 1: Get all hook analyses from the specified date
    const hookAnalyses = await step.run("db: fetch hook analyses", async () => {
      const startDate = new Date(analysisDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      const { data, error } = await supabaseServer
        .from("hook_analysis")
        .select(`
          *,
          tiktok_videos!inner (
            title,
            creator,
            view_count,
            like_count,
            share_count,
            comment_count,
            search_terms!inner (
              term
            )
          )
        `)
        .gte("processed_at", startDate.toISOString())
        .lt("processed_at", endDate.toISOString());

      if (error) throw error;
      return data;
    });

    if (hookAnalyses.length === 0) {
      logger.info("No hook analyses found for the specified date");
      return { message: "No data to analyze" };
    }

    // Step 2: Analyze trends with Gemini
    const trendAnalysis = await step.run("gemini: analyze trends", async () => {
      const analyses = hookAnalyses.map(h => h.analysis_result as unknown as HookAnalysisResult);
      const result = await geminiClient.analyzeTrends(analyses);
      logger.info(`Trend analysis completed with ${result.commonPhrases.length} common phrases`);
      return result;
    });

    // Step 3: Save trend analysis to database
    await step.run("db: save trend analysis", async () => {
      const { error } = await supabaseServer
        .from("trend_analysis")
        .upsert({
          date: analysisDate,
          analysis_results: trendAnalysis,
          total_videos_analyzed: hookAnalyses.length,
          common_phrases: trendAnalysis.commonPhrases,
          visual_themes: trendAnalysis.visualThemes,
          engagement_patterns: trendAnalysis.engagementPatterns,
        }, { onConflict: "date" });

      if (error) throw error;
    });

    return {
      date: analysisDate,
      videosAnalyzed: hookAnalyses.length,
      commonPhrases: trendAnalysis.commonPhrases.length,
      visualThemes: trendAnalysis.visualThemes.length,
      engagementPatterns: trendAnalysis.engagementPatterns.length,
    };
  }
);