import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@shared-types/database.types";
import { featureExtractor, FeatureVector } from "@/lib/clustering/feature-extractor";
import { KMeans, ClusterResult, ElbowPoint } from "@/lib/clustering/kmeans";
import { HookAnalysisResult } from "@/lib/clients/gemini";

// Define types for our service
export interface ClusterStats {
    clusterId: number;
    size: number;
    centroid: number[];
    avgViewCount: number;
    avgLikeCount: number;
    avgEngagementRate: number;
    avgHookScore: number;
    topHookTypes: { type: string; count: number }[];
    commonTechniques: { technique: string; count: number }[];
    representativeHooks: {
        id: string;
        text: string;
        score: number;
        views: number;
    }[];
}

export interface ClusteringResult {
    clusters: ClusterStats[];
    k: number;
    wcss: number;
    silhouetteScore: number;
    totalAnalyzed: number;
}

export class ClusteringService {
    private supabase: SupabaseClient<Database>;

    constructor(supabaseClient: SupabaseClient<Database>) {
        this.supabase = supabaseClient;
    }

    /**
     * Fetch all hook analyses and perform K-Means clustering
     */
    async performClustering(userId: string, k?: number, searchTermId?: string): Promise<ClusteringResult> {
        // 1. Fetch all hook analyses for the user
        let query = this.supabase
            .from("hook_analysis")
            .select(`
        *,
        tiktok_videos!inner (
          id,
          view_count,
          like_count,
          share_count,
          comment_count,
          search_term_id,
          search_terms!inner (
            user_id
          )
        )
      `)
            .eq("tiktok_videos.search_terms.user_id", userId)
            .not("analysis_result", "is", null);

        // Filter by search term if provided
        if (searchTermId) {
            query = query.eq("tiktok_videos.search_term_id", searchTermId);
        }

        const { data: analyses, error } = await query;

        if (error) throw error;
        const termMsg = searchTermId ? " for this search term" : "";
        if (!analyses || analyses.length < 5) {
            throw new Error(`Not enough data to perform clustering${termMsg} (minimum 5 analyses required)`);
        }

        // 2. Extract features
        const vectors: FeatureVector[] = [];
        const validAnalyses: typeof analyses = [];

        for (const analysis of analyses) {
            const result = analysis.analysis_result as unknown as HookAnalysisResult;
            const video = analysis.tiktok_videos;

            // Skip if critical data is missing
            if (!result.openingLines || !result.engagementTactics) continue;

            const vector = featureExtractor.extractFeatureVector(result, {
                viewCount: video.view_count || 0,
                likeCount: video.like_count || 0,
                shareCount: video.share_count || 0,
                commentCount: video.comment_count || 0,
            });

            vectors.push(vector);
            validAnalyses.push(analysis);
        }

        if (vectors.length < 5) {
            throw new Error("Not enough valid analyses to perform clustering");
        }

        // 3. Standardize features
        const rawFeatures = vectors.map(v => v.features);
        const { standardized, means, stdDevs } = featureExtractor.standardizeFeatures(rawFeatures);

        // 4. Determine optimal K if not provided
        let optimalK = k;
        if (!optimalK) {
            // Use elbow method to find optimal k (between 2 and min(10, count/2))
            const maxK = Math.min(10, Math.floor(vectors.length / 2));
            const elbowPoints = KMeans.elbowMethod(standardized, 2, maxK);
            optimalK = KMeans.findOptimalK(elbowPoints);
        }

        // 5. Run K-Means
        const kmeans = new KMeans({ k: optimalK, randomSeed: 42 });
        const clusterResult = kmeans.fit(standardized);
        const silhouetteScore = kmeans.calculateSilhouetteScore(standardized, clusterResult.clusterAssignments);

        // 6. Aggregate stats for each cluster
        const clusters: ClusterStats[] = [];

        for (let i = 0; i < optimalK; i++) {
            const clusterIndices = clusterResult.clusterAssignments
                .map((cluster, index) => (cluster === i ? index : -1))
                .filter(index => index !== -1);

            if (clusterIndices.length === 0) continue;

            const clusterAnalyses = clusterIndices.map(index => validAnalyses[index]);
            const clusterVectors = clusterIndices.map(index => vectors[index]);

            // Calculate averages
            const totalViews = clusterAnalyses.reduce((sum, a) => sum + (a.tiktok_videos.view_count || 0), 0);
            const totalLikes = clusterAnalyses.reduce((sum, a) => sum + (a.tiktok_videos.like_count || 0), 0);
            const avgViewCount = totalViews / clusterIndices.length;
            const avgLikeCount = totalLikes / clusterIndices.length;
            const avgEngagementRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0; // Simplified ER

            const avgHookScore = clusterVectors.reduce((sum, v) => sum + v.rawData.hookAnalysis.overallScore, 0) / clusterIndices.length;

            // Top hook types
            const hookTypeCounts: Record<string, number> = {};
            clusterVectors.forEach(v => {
                const type = v.rawData.hookAnalysis.engagementTactics?.hook_type || "Unknown";
                hookTypeCounts[type] = (hookTypeCounts[type] || 0) + 1;
            });
            const topHookTypes = Object.entries(hookTypeCounts)
                .map(([type, count]) => ({ type, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3);

            // Common techniques
            const techniqueCounts: Record<string, number> = {};
            clusterVectors.forEach(v => {
                v.rawData.hookAnalysis.openingLines?.techniques?.forEach(t => {
                    techniqueCounts[t] = (techniqueCounts[t] || 0) + 1;
                });
            });
            const commonTechniques = Object.entries(techniqueCounts)
                .map(([technique, count]) => ({ technique, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            // Representative hooks (closest to centroid would be better, but top scored is good for display)
            // Let's pick top 3 by score
            const representativeHooks = clusterAnalyses
                .map(a => ({
                    id: a.id,
                    text: (a.analysis_result as unknown as HookAnalysisResult).openingLines?.transcript || "",
                    score: (a.analysis_result as unknown as HookAnalysisResult).overallScore || 0,
                    views: a.tiktok_videos.view_count || 0,
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);

            clusters.push({
                clusterId: i,
                size: clusterIndices.length,
                centroid: clusterResult.centroids[i], // Note: these are standardized coordinates
                avgViewCount,
                avgLikeCount,
                avgEngagementRate,
                avgHookScore,
                topHookTypes,
                commonTechniques,
                representativeHooks,
            });
        }

        // Sort clusters by performance (e.g., avg hook score)
        clusters.sort((a, b) => b.avgHookScore - a.avgHookScore);

        return {
            clusters,
            k: optimalK,
            wcss: clusterResult.wcss,
            silhouetteScore,
            totalAnalyzed: vectors.length,
        };
    }
}
