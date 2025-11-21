import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { inngestClient } from "@/lib/clients/inngest";
import { ClusteringService } from "@/server/services/clustering";
import { z } from "zod";

export const tiktokRouter = createTRPCRouter({
  // Search Terms Management
  getSearchTerms: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("search_terms")
      .select("*")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }),

  createSearchTerm: protectedProcedure
    .input(z.object({ term: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("search_terms")
        .insert({
          user_id: ctx.user.id,
          term: input.term,
          status: "active",
        })
        .select("*")
        .single();

      if (error) throw error;

      // Queue video search job
      await inngestClient.send({
        name: "tiktok/search-videos",
        data: {
          searchTermId: data.id,
          searchTerm: data.term,
          userId: ctx.user.id,
        },
      });

      return data;
    }),

  deleteSearchTerm: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("search_terms")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) throw error;
      return { success: true };
    }),

  archiveSearchTerm: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("search_terms")
        .update({ status: "archived" })
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) throw error;
      return { success: true };
    }),

  restoreSearchTerm: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("search_terms")
        .update({ status: "active" })
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) throw error;
      return { success: true };
    }),

  // Videos Management
  getVideos: protectedProcedure
    .input(z.object({
      searchTermId: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from("tiktok_videos")
        .select(`
          *,
          search_terms!inner (
            id,
            term,
            user_id
          ),
          hook_analysis (
            id,
            analysis_result,
            processed_at
          )
        `)
        .eq("search_terms.user_id", ctx.user.id)
        .order("created_at", { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (input.searchTermId) {
        query = query.eq("search_term_id", input.searchTermId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    }),

  getVideoById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("tiktok_videos")
        .select(`
          *,
          search_terms!inner (
            id,
            term,
            user_id
          ),
          hook_analysis (
            id,
            analysis_result,
            processed_at
          )
        `)
        .eq("id", input.id)
        .eq("search_terms.user_id", ctx.user.id)
        .single();

      if (error) throw error;
      return data;
    }),

  // Hook Analysis
  getHookAnalysis: protectedProcedure
    .input(z.object({
      searchTermId: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      // First, get the video IDs that match the search term filter (if provided)
      let videoIds: string[] | undefined;
      if (input.searchTermId) {
        const { data: videos, error: videosError } = await ctx.supabase
          .from("tiktok_videos")
          .select("id")
          .eq("search_term_id", input.searchTermId);

        if (videosError) throw videosError;
        videoIds = videos.map(v => v.id);

        // If no videos match the search term, return empty array
        if (videoIds.length === 0) {
          return [];
        }
      }

      let query = ctx.supabase
        .from("hook_analysis")
        .select(`
          *,
          tiktok_videos!inner (
            id,
            search_term_id,
            title,
            creator,
            creator_username,
            view_count,
            like_count,
            share_count,
            comment_count,
            duration,
            video_url,
            r2_url,
            thumbnail_url,
            search_terms!inner (
              id,
              term,
              user_id
            )
          )
        `)
        .eq("tiktok_videos.search_terms.user_id", ctx.user.id)
        .order("processed_at", { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      // Filter by video IDs if search term was specified
      if (videoIds) {
        query = query.in("video_id", videoIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    }),

  getHookAnalysisById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("hook_analysis")
        .select(`
          *,
          tiktok_videos!inner (
            id,
            title,
            creator,
            creator_username,
            view_count,
            like_count,
            share_count,
            comment_count,
            duration,
            video_url,
            r2_url,
            thumbnail_url,
            search_terms!inner (
              id,
              term,
              user_id
            )
          )
        `)
        .eq("id", input.id)
        .eq("tiktok_videos.search_terms.user_id", ctx.user.id)
        .single();

      if (error) throw error;
      return data;
    }),

  // Trend Analysis
  getTrendAnalysis: protectedProcedure
    .input(z.object({
      date: z.string().optional(),
      limit: z.number().min(1).max(100).default(10),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from("trend_analysis")
        .select("*")
        .order("date", { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (input.date) {
        query = query.eq("date", input.date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    }),

  getTrendAnalysisById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("trend_analysis")
        .select("*")
        .eq("id", input.id)
        .single();

      if (error) throw error;
      return data;
    }),

  // Trigger manual trend analysis
  triggerTrendAnalysis: protectedProcedure
    .input(z.object({ date: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const date = input.date || new Date().toISOString().split('T')[0];

      await inngestClient.send({
        name: "tiktok/generate-trends",
        data: {
          date,
        },
      });

      return { success: true, date };
    }),

  // Statistics
  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    const [searchTermsResult, videosResult, analysisResult] = await Promise.all([
      ctx.supabase
        .from("search_terms")
        .select("id, status")
        .eq("user_id", ctx.user.id),
      ctx.supabase
        .from("tiktok_videos")
        .select(`
          id,
          search_terms!inner (
            user_id
          )
        `)
        .eq("search_terms.user_id", ctx.user.id),
      ctx.supabase
        .from("hook_analysis")
        .select(`
          id,
          analysis_result,
          tiktok_videos!inner (
            search_terms!inner (
              user_id
            )
          )
        `)
        .eq("tiktok_videos.search_terms.user_id", ctx.user.id),
    ]);

    if (searchTermsResult.error) throw searchTermsResult.error;
    if (videosResult.error) throw videosResult.error;
    if (analysisResult.error) throw analysisResult.error;

    const searchTerms = searchTermsResult.data || [];
    const videos = videosResult.data || [];
    const analyses = analysisResult.data || [];

    // Calculate statistics
    const stats = {
      totalSearchTerms: searchTerms.length,
      activeSearchTerms: searchTerms.filter(st => st.status === 'active').length,
      archivedSearchTerms: searchTerms.filter(st => st.status === 'archived').length,
      totalVideos: videos.length,
      totalAnalyses: analyses.length,
      averageHookScore: analyses.length > 0
        ? analyses.reduce((sum, analysis) => {
          const score = analysis.analysis_result?.overallScore || 0;
          return sum + score;
        }, 0) / analyses.length
        : 0,
      topHookTypes: analyses.reduce((acc, analysis) => {
        const hookType = analysis.analysis_result?.engagementTactics?.hook_type || 'unknown';
        acc[hookType] = (acc[hookType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return stats;
  }),

  // Retry failed jobs
  retryVideoSearch: protectedProcedure
    .input(z.object({ searchTermId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get search term
      const { data: searchTerm, error } = await ctx.supabase
        .from("search_terms")
        .select("*")
        .eq("id", input.searchTermId)
        .eq("user_id", ctx.user.id)
        .single();

      if (error) throw error;

      // Queue video search job
      await inngestClient.send({
        name: "tiktok/search-videos",
        data: {
          searchTermId: searchTerm.id,
          searchTerm: searchTerm.term,
          userId: ctx.user.id,
        },
      });

      return { success: true };
    }),

  retryVideoAnalysis: protectedProcedure
    .input(z.object({ videoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get video
      const { data: video, error } = await ctx.supabase
        .from("tiktok_videos")
        .select(`
          *,
          search_terms!inner (
            user_id
          )
        `)
        .eq("id", input.videoId)
        .eq("search_terms.user_id", ctx.user.id)
        .single();

      if (error) throw error;

      if (!video.r2_key || !video.r2_url) {
        throw new Error("Video not yet downloaded to R2");
      }

      // Queue analysis job
      await inngestClient.send({
        name: "tiktok/analyze-hook",
        data: {
          videoId: video.id,
          r2Key: video.r2_key,
          r2Url: video.r2_url,
        },
      });

      return { success: true };
    }),


  // Clustering
  getHookClusters: protectedProcedure
    .input(z.object({
      k: z.number().optional(),
      searchTermId: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      const clusteringService = new ClusteringService(ctx.supabase as any);
      return await clusteringService.performClustering(ctx.user.id, input.k, input.searchTermId);
    }),
});