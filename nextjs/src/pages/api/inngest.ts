import {
  searchTikTokVideos,
  downloadTikTokVideo,
  analyzeVideoHook,
  generateTrendAnalysis
} from "@/inngest/tiktok-jobs";
import { inngestClient } from "@/lib/clients/inngest";
import { serve } from "inngest/next";

export const config = {
  maxDuration: 720, // 12 minutes
};

export default serve({
  client: inngestClient,
  functions: [
    // TikTok Hook Analyzer
    searchTikTokVideos,
    downloadTikTokVideo,
    analyzeVideoHook,
    generateTrendAnalysis,
  ],
});
