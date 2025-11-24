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

    // Performance metrics with statistical measures
    avgViewCount: number;
    stdDevViewCount: number;
    avgLikeCount: number;
    stdDevLikeCount: number;
    avgEngagementRate: number;
    stdDevEngagementRate: number;
    avgHookScore: number;
    stdDevHookScore: number;

    // Confidence intervals (95%)
    viewCountCI: { lower: number; upper: number };
    engagementRateCI: { lower: number; upper: number };
    hookScoreCI: { lower: number; upper: number };

    // Cluster quality metrics
    intraClusterDistance: number; // Average distance from centroid
    cohesionScore: number; // 0-1, how tightly grouped the cluster is

    // Top features that define this cluster (standardized)
    dominantFeatures: {
        feature: string;
        value: number;
        importance: number; // How much this feature distinguishes this cluster
    }[];

    // Hook characteristics
    topHookTypes: { type: string; count: number; percentage: number }[];
    commonTechniques: { technique: string; count: number; percentage: number }[];

    // Emotional profile
    emotionalProfile: {
        curiosity: number;
        surprise: number;
        urgency: number;
        excitement: number;
    };

    // Representative hooks with more context
    representativeHooks: {
        id: string;
        text: string;
        score: number;
        views: number;
        engagementRate: number;
        distanceFromCentroid: number; // How typical this hook is
    }[];

    // Statistical significance
    sampleSize: number;
    marginOfError: number; // At 95% confidence
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

        // 6. Aggregate stats for each cluster with comprehensive scientific metrics
        const clusters: ClusterStats[] = [];

        // Helper function to calculate standard deviation
        const calculateStdDev = (values: number[], mean: number): number => {
            if (values.length <= 1) return 0;
            const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
            return Math.sqrt(variance);
        };

        // Helper function to calculate 95% confidence interval
        const calculate95CI = (mean: number, stdDev: number, sampleSize: number): { lower: number; upper: number } => {
            const z = 1.96; // 95% confidence level
            const marginOfError = z * (stdDev / Math.sqrt(sampleSize));
            return {
                lower: Math.max(0, mean - marginOfError),
                upper: mean + marginOfError
            };
        };

        // Helper function to calculate Euclidean distance
        const euclideanDistance = (a: number[], b: number[]): number => {
            return Math.sqrt(a.reduce((sum, val, idx) => sum + Math.pow(val - (b[idx] || 0), 2), 0));
        };

        // Calculate global feature means for importance scoring
        const globalFeatureMeans = new Array(standardized[0]?.length || 0).fill(0);
        standardized.forEach(vec => {
            vec?.forEach((val, idx) => {
                globalFeatureMeans[idx]! += val / standardized.length;
            });
        });

        for (let i = 0; i < optimalK; i++) {
            const clusterIndices = clusterResult.clusterAssignments
                .map((cluster, index) => (cluster === i ? index : -1))
                .filter(index => index !== -1);

            if (clusterIndices.length === 0) continue;

            const clusterAnalyses = clusterIndices.map(index => validAnalyses[index]!);
            const clusterVectors = clusterIndices.map(index => vectors[index]!);
            const clusterStandardized = clusterIndices.map(index => standardized[index]!);
            const centroid = clusterResult.centroids[i];
            if (!centroid) continue;

            // === PERFORMANCE METRICS ===
            // Views
            const viewCounts = clusterAnalyses.map(a => a?.tiktok_videos?.view_count || 0);
            const avgViewCount = viewCounts.reduce((sum, v) => sum + v, 0) / viewCounts.length;
            const stdDevViewCount = calculateStdDev(viewCounts, avgViewCount);
            const viewCountCI = calculate95CI(avgViewCount, stdDevViewCount, viewCounts.length);

            // Likes
            const likeCounts = clusterAnalyses.map(a => a?.tiktok_videos?.like_count || 0);
            const avgLikeCount = likeCounts.reduce((sum, v) => sum + v, 0) / likeCounts.length;
            const stdDevLikeCount = calculateStdDev(likeCounts, avgLikeCount);

            // Engagement Rate
            const engagementRates = clusterAnalyses.map(a => {
                const views = a?.tiktok_videos?.view_count || 0;
                const likes = a?.tiktok_videos?.like_count || 0;
                return views > 0 ? (likes / views) * 100 : 0;
            });
            const avgEngagementRate = engagementRates.reduce((sum, v) => sum + v, 0) / engagementRates.length;
            const stdDevEngagementRate = calculateStdDev(engagementRates, avgEngagementRate);
            const engagementRateCI = calculate95CI(avgEngagementRate, stdDevEngagementRate, engagementRates.length);

            // Hook Scores
            const hookScores = clusterVectors.map(v => v.rawData.hookAnalysis.overallScore);
            const avgHookScore = hookScores.reduce((sum, v) => sum + v, 0) / hookScores.length;
            const stdDevHookScore = calculateStdDev(hookScores, avgHookScore);
            const hookScoreCI = calculate95CI(avgHookScore, stdDevHookScore, hookScores.length);

            // === CLUSTER QUALITY METRICS ===
            // Intra-cluster distance (average distance from centroid)
            const distances = clusterStandardized.map(vec => euclideanDistance(vec || [], centroid));
            const intraClusterDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;

            // Cohesion score (inverse of normalized intra-cluster distance)
            // Lower intra-cluster distance = higher cohesion
            const maxPossibleDistance = Math.sqrt(centroid.length); // Approximate max distance in standardized space
            const cohesionScore = Math.max(0, Math.min(1, 1 - (intraClusterDistance / maxPossibleDistance)));

            // === DOMINANT FEATURES ===
            // Calculate feature importance as the absolute difference from global mean
            const featureNames = vectors[0]?.featureNames || [];
            const clusterFeatureMeans = new Array(centroid.length).fill(0);
            clusterStandardized.forEach(vec => {
                vec?.forEach((val, idx) => {
                    clusterFeatureMeans[idx]! += val / clusterStandardized.length;
                });
            });

            const dominantFeatures = centroid
                .map((value, idx) => ({
                    feature: featureNames[idx] || 'unknown',
                    value: value,
                    importance: Math.abs(value - (globalFeatureMeans[idx] || 0))
                }))
                .sort((a, b) => b.importance - a.importance)
                .slice(0, 5); // Top 5 most distinguishing features

            // === HOOK CHARACTERISTICS ===
            const hookTypeCounts: Record<string, number> = {};
            clusterVectors.forEach(v => {
                const type = v.rawData.hookAnalysis.engagementTactics?.hook_type || "Unknown";
                hookTypeCounts[type] = (hookTypeCounts[type] || 0) + 1;
            });
            const topHookTypes = Object.entries(hookTypeCounts)
                .map(([type, count]) => ({
                    type,
                    count,
                    percentage: (count / clusterIndices.length) * 100
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3);

            const techniqueCounts: Record<string, number> = {};
            clusterVectors.forEach(v => {
                v.rawData.hookAnalysis.openingLines?.techniques?.forEach(t => {
                    techniqueCounts[t] = (techniqueCounts[t] || 0) + 1;
                });
            });
            const commonTechniques = Object.entries(techniqueCounts)
                .map(([technique, count]) => ({
                    technique,
                    count,
                    percentage: (count / clusterIndices.length) * 100
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            // === EMOTIONAL PROFILE ===
            const emotionalProfile = {
                curiosity: 0,
                surprise: 0,
                urgency: 0,
                excitement: 0
            };

            clusterVectors.forEach(v => {
                const emotion = (v?.rawData?.hookAnalysis?.openingLines?.emotional_impact || '').toLowerCase();
                if (emotion.includes('curios') || emotion.includes('intrigue') || emotion.includes('suspense')) {
                    emotionalProfile.curiosity++;
                } else if (emotion.includes('surprise') || emotion.includes('shock')) {
                    emotionalProfile.surprise++;
                } else if (emotion.includes('urgency') || emotion.includes('fear') || emotion.includes('fomo')) {
                    emotionalProfile.urgency++;
                } else if (emotion.includes('excite') || emotion.includes('joy') || emotion.includes('anticipation')) {
                    emotionalProfile.excitement++;
                }
            });

            // Normalize to percentages
            const totalEmotions = clusterIndices.length;
            emotionalProfile.curiosity = (emotionalProfile.curiosity / totalEmotions) * 100;
            emotionalProfile.surprise = (emotionalProfile.surprise / totalEmotions) * 100;
            emotionalProfile.urgency = (emotionalProfile.urgency / totalEmotions) * 100;
            emotionalProfile.excitement = (emotionalProfile.excitement / totalEmotions) * 100;

            // === REPRESENTATIVE HOOKS ===
            // Find hooks closest to centroid (most typical) and combine with performance
            const representativeHooks = clusterAnalyses
                .map((a, idx) => {
                    const analysis = a.analysis_result as unknown as HookAnalysisResult;
                    const views = a?.tiktok_videos?.view_count || 0;
                    const likes = a?.tiktok_videos?.like_count || 0;
                    const distance = distances[idx] || 0;
                    return {
                        id: a.id,
                        text: analysis?.openingLines?.transcript || "",
                        score: analysis?.overallScore || 0,
                        views: views,
                        engagementRate: views > 0 ? (likes / views) * 100 : 0,
                        distanceFromCentroid: distance
                    };
                })
                .sort((a, b) => {
                    // Sort by a combination of score and typicality (lower distance = more typical)
                    const scoreA = (a?.score || 0) * 0.7 - ((a?.distanceFromCentroid || 0) * 10);
                    const scoreB = (b?.score || 0) * 0.7 - ((b?.distanceFromCentroid || 0) * 10);
                    return scoreB - scoreA;
                })
                .slice(0, 3);

            // === STATISTICAL SIGNIFICANCE ===
            const sampleSize = clusterIndices.length;
            const z = 1.96; // 95% confidence
            const marginOfError = z * (stdDevHookScore / Math.sqrt(sampleSize));

            clusters.push({
                clusterId: i,
                size: clusterIndices.length,
                centroid: centroid,

                avgViewCount,
                stdDevViewCount,
                avgLikeCount,
                stdDevLikeCount,
                avgEngagementRate,
                stdDevEngagementRate,
                avgHookScore,
                stdDevHookScore,

                viewCountCI,
                engagementRateCI,
                hookScoreCI,

                intraClusterDistance,
                cohesionScore,

                dominantFeatures,
                topHookTypes,
                commonTechniques,
                emotionalProfile,
                representativeHooks,

                sampleSize,
                marginOfError
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
