import { HookAnalysisResult } from "@/lib/clients/gemini";
import { Database } from "@shared-types/database.types";

export interface HookFeatures {
  // Effectiveness metrics
  openingEffectiveness: number; // 0-1 scale
  overallScore: number; // 0-1 scale

  // Emotional impact encoding (0-1 scale for each)
  emotionCuriosity: number;
  emotionSurprise: number;
  emotionUrgency: number;
  emotionExcitement: number;
  emotionOther: number;

  // Hook type one-hot encoding
  hookTypeQuestion: number;
  hookTypeStatement: number;
  hookTypeTeaser: number;
  hookTypeShock: number;
  hookTypeAction: number;
  hookTypeOther: number;

  // Technique and element counts (normalized)
  techniqueCount: number;
  visualHookCount: number;
  curiosityGapCount: number;
  socialProofCount: number;
  urgencyIndicatorCount: number;
  textOverlayCount: number;
  transitionCount: number;

  // Engagement metrics (normalized, log-scaled)
  normalizedViews: number;
  normalizedLikes: number;
  normalizedShares: number;
  normalizedComments: number;

  // Engagement ratios
  likeToViewRatio: number;
  shareToViewRatio: number;
  commentToViewRatio: number;
}

export interface FeatureVector {
  features: number[];
  featureNames: string[];
  rawData: {
    hookAnalysis: HookAnalysisResult;
    videoMetrics: {
      viewCount: number;
      likeCount: number;
      shareCount: number;
      commentCount: number;
    };
  };
}

/**
 * Extract and normalize features from hook analysis data for clustering
 */
export class FeatureExtractor {
  private readonly emotionMap: Record<string, keyof Pick<HookFeatures,
    'emotionCuriosity' | 'emotionSurprise' | 'emotionUrgency' | 'emotionExcitement' | 'emotionOther'>> = {
    'curiosity': 'emotionCuriosity',
    'surprise': 'emotionSurprise',
    'urgency': 'emotionUrgency',
    'excitement': 'emotionExcitement',
    'intrigue': 'emotionCuriosity',
    'suspense': 'emotionCuriosity',
    'shock': 'emotionSurprise',
    'fear': 'emotionUrgency',
    'fomo': 'emotionUrgency',
    'joy': 'emotionExcitement',
    'anticipation': 'emotionExcitement',
  };

  private readonly hookTypeMap: Record<string, keyof Pick<HookFeatures,
    'hookTypeQuestion' | 'hookTypeStatement' | 'hookTypeTeaser' | 'hookTypeShock' | 'hookTypeAction' | 'hookTypeOther'>> = {
    'question': 'hookTypeQuestion',
    'statement': 'hookTypeStatement',
    'teaser': 'hookTypeTeaser',
    'shock': 'hookTypeShock',
    'action': 'hookTypeAction',
  };

  /**
   * Extract features from a single hook analysis
   */
  extractFeatures(
    analysis: HookAnalysisResult,
    videoMetrics: {
      viewCount: number;
      likeCount: number;
      shareCount: number;
      commentCount: number;
    }
  ): HookFeatures {
    // Initialize features with defaults
    const features: HookFeatures = {
      // Effectiveness metrics (normalize to 0-1)
      openingEffectiveness: (analysis.openingLines?.effectiveness || 0) / 10,
      overallScore: (analysis.overallScore || 0) / 100,

      // Emotional impact (one-hot style, but can have multiple)
      emotionCuriosity: 0,
      emotionSurprise: 0,
      emotionUrgency: 0,
      emotionExcitement: 0,
      emotionOther: 0,

      // Hook type (one-hot encoding)
      hookTypeQuestion: 0,
      hookTypeStatement: 0,
      hookTypeTeaser: 0,
      hookTypeShock: 0,
      hookTypeAction: 0,
      hookTypeOther: 0,

      // Counts (normalized by dividing by reasonable max values)
      techniqueCount: 0,
      visualHookCount: 0,
      curiosityGapCount: 0,
      socialProofCount: 0,
      urgencyIndicatorCount: 0,
      textOverlayCount: 0,
      transitionCount: 0,

      // Engagement metrics (log-normalized)
      normalizedViews: 0,
      normalizedLikes: 0,
      normalizedShares: 0,
      normalizedComments: 0,

      // Engagement ratios
      likeToViewRatio: 0,
      shareToViewRatio: 0,
      commentToViewRatio: 0,
    };

    // Encode emotional impact
    const emotionalImpact = (analysis.openingLines?.emotional_impact || '').toLowerCase();
    const mappedEmotion = this.emotionMap[emotionalImpact];
    if (mappedEmotion) {
      features[mappedEmotion] = 1;
    } else if (emotionalImpact) {
      features.emotionOther = 1;
    }

    // Encode hook type (one-hot)
    const hookType = (analysis.engagementTactics?.hook_type || '').toLowerCase();
    const mappedHookType = this.hookTypeMap[hookType];
    if (mappedHookType) {
      features[mappedHookType] = 1;
    } else if (hookType) {
      features.hookTypeOther = 1;
    }

    // Count-based features (normalize by dividing by max expected)
    features.techniqueCount = Math.min((analysis.openingLines?.techniques?.length || 0) / 10, 1);
    features.visualHookCount = Math.min((analysis.visualElements?.visual_hooks?.length || 0) / 10, 1);
    features.curiosityGapCount = Math.min((analysis.engagementTactics?.curiosity_gaps?.length || 0) / 5, 1);
    features.socialProofCount = Math.min((analysis.engagementTactics?.social_proof?.length || 0) / 5, 1);
    features.urgencyIndicatorCount = Math.min((analysis.engagementTactics?.urgency_indicators?.length || 0) / 5, 1);
    features.textOverlayCount = Math.min((analysis.visualElements?.text_overlays?.length || 0) / 10, 1);
    features.transitionCount = Math.min((analysis.visualElements?.transitions?.length || 0) / 10, 1);

    // Engagement metrics (log-scale normalization)
    const logNormalize = (value: number, maxValue = 10000000): number => {
      if (value <= 0) return 0;
      return Math.min(Math.log10(value + 1) / Math.log10(maxValue + 1), 1);
    };

    features.normalizedViews = logNormalize(videoMetrics.viewCount);
    features.normalizedLikes = logNormalize(videoMetrics.likeCount);
    features.normalizedShares = logNormalize(videoMetrics.shareCount);
    features.normalizedComments = logNormalize(videoMetrics.commentCount);

    // Engagement ratios
    if (videoMetrics.viewCount > 0) {
      features.likeToViewRatio = Math.min(videoMetrics.likeCount / videoMetrics.viewCount, 1);
      features.shareToViewRatio = Math.min(videoMetrics.shareCount / videoMetrics.viewCount, 1);
      features.commentToViewRatio = Math.min(videoMetrics.commentCount / videoMetrics.viewCount, 1);
    }

    return features;
  }

  /**
   * Convert HookFeatures object to a numerical array
   */
  featuresToVector(features: HookFeatures): number[] {
    return [
      features.openingEffectiveness,
      features.overallScore,
      features.emotionCuriosity,
      features.emotionSurprise,
      features.emotionUrgency,
      features.emotionExcitement,
      features.emotionOther,
      features.hookTypeQuestion,
      features.hookTypeStatement,
      features.hookTypeTeaser,
      features.hookTypeShock,
      features.hookTypeAction,
      features.hookTypeOther,
      features.techniqueCount,
      features.visualHookCount,
      features.curiosityGapCount,
      features.socialProofCount,
      features.urgencyIndicatorCount,
      features.textOverlayCount,
      features.transitionCount,
      features.normalizedViews,
      features.normalizedLikes,
      features.normalizedShares,
      features.normalizedComments,
      features.likeToViewRatio,
      features.shareToViewRatio,
      features.commentToViewRatio,
    ];
  }

  /**
   * Get feature names in the same order as featuresToVector
   */
  getFeatureNames(): string[] {
    return [
      'openingEffectiveness',
      'overallScore',
      'emotionCuriosity',
      'emotionSurprise',
      'emotionUrgency',
      'emotionExcitement',
      'emotionOther',
      'hookTypeQuestion',
      'hookTypeStatement',
      'hookTypeTeaser',
      'hookTypeShock',
      'hookTypeAction',
      'hookTypeOther',
      'techniqueCount',
      'visualHookCount',
      'curiosityGapCount',
      'socialProofCount',
      'urgencyIndicatorCount',
      'textOverlayCount',
      'transitionCount',
      'normalizedViews',
      'normalizedLikes',
      'normalizedShares',
      'normalizedComments',
      'likeToViewRatio',
      'shareToViewRatio',
      'commentToViewRatio',
    ];
  }

  /**
   * Extract feature vector with metadata
   */
  extractFeatureVector(
    analysis: HookAnalysisResult,
    videoMetrics: {
      viewCount: number;
      likeCount: number;
      shareCount: number;
      commentCount: number;
    }
  ): FeatureVector {
    const features = this.extractFeatures(analysis, videoMetrics);
    return {
      features: this.featuresToVector(features),
      featureNames: this.getFeatureNames(),
      rawData: {
        hookAnalysis: analysis,
        videoMetrics,
      },
    };
  }

  /**
   * Standardize features using z-score normalization
   * @param vectors - Array of feature vectors
   * @returns Standardized vectors with mean=0, std=1
   */
  standardizeFeatures(vectors: number[][]): {
    standardized: number[][];
    means: number[];
    stdDevs: number[];
  } {
    if (vectors.length === 0) {
      return { standardized: [], means: [], stdDevs: [] };
    }

    const numFeatures = vectors[0].length;
    const means: number[] = new Array(numFeatures).fill(0);
    const stdDevs: number[] = new Array(numFeatures).fill(0);

    // Calculate means
    for (const vector of vectors) {
      for (let i = 0; i < numFeatures; i++) {
        means[i] += vector[i];
      }
    }
    for (let i = 0; i < numFeatures; i++) {
      means[i] /= vectors.length;
    }

    // Calculate standard deviations
    for (const vector of vectors) {
      for (let i = 0; i < numFeatures; i++) {
        stdDevs[i] += Math.pow(vector[i] - means[i], 2);
      }
    }
    for (let i = 0; i < numFeatures; i++) {
      stdDevs[i] = Math.sqrt(stdDevs[i] / vectors.length);
      // Avoid division by zero
      if (stdDevs[i] === 0) stdDevs[i] = 1;
    }

    // Standardize vectors
    const standardized = vectors.map(vector =>
      vector.map((value, i) => (value - means[i]) / stdDevs[i])
    );

    return { standardized, means, stdDevs };
  }

  /**
   * Apply existing standardization to new vectors
   */
  applyStandardization(
    vectors: number[][],
    means: number[],
    stdDevs: number[]
  ): number[][] {
    return vectors.map(vector =>
      vector.map((value, i) => (value - means[i]) / stdDevs[i])
    );
  }
}

export const featureExtractor = new FeatureExtractor();
