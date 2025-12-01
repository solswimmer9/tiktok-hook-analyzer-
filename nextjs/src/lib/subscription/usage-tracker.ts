/**
 * Usage Tracking Utility
 *
 * This module provides utilities for tracking and checking user usage
 * against their subscription tier limits.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  SubscriptionTier,
  UsageMetric,
  LimitCheckResult,
  checkUsageLimit,
  getTierLimit,
  SUBSCRIPTION_TIERS,
} from '@/types/subscription';
import { Database } from '@/../../shared-types/database.types';

/**
 * Track usage for a metric
 */
export async function trackUsage(
  supabase: SupabaseClient<Database>,
  userId: string,
  metric: UsageMetric,
  increment: number = 1
): Promise<void> {
  try {
    // Use the database function to increment usage
    const { error } = await (supabase as any).rpc('increment_usage', {
      p_user_id: userId,
      p_metric_name: metric,
      p_increment: increment,
    });

    if (error) {
      console.error('Error tracking usage:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to track usage:', error);
    throw error;
  }
}

/**
 * Get current usage for a metric
 */
export async function getCurrentUsage(
  supabase: SupabaseClient<Database>,
  userId: string,
  metric: UsageMetric
): Promise<number> {
  try {
    const { data, error } = await (supabase as any).rpc('get_current_usage', {
      p_user_id: userId,
      p_metric_name: metric,
    });

    if (error) {
      console.error('Error getting current usage:', error);
      throw error;
    }

    return data || 0;
  } catch (error) {
    console.error('Failed to get current usage:', error);
    return 0;
  }
}

/**
 * Check if user can perform an action based on their subscription tier
 */
export async function checkLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
  metric: UsageMetric,
  tier: SubscriptionTier
): Promise<LimitCheckResult> {
  // Get current usage
  const currentUsage = await getCurrentUsage(supabase, userId, metric);

  // Get limit for this tier and metric
  let limit: number | null = null;

  switch (metric) {
    case UsageMetric.VIDEOS_ANALYZED:
      limit = SUBSCRIPTION_TIERS[tier].limits.videosPerMonth;
      break;
    case UsageMetric.SEARCH_TERMS_CREATED:
      limit = SUBSCRIPTION_TIERS[tier].limits.searchTerms;
      break;
    case UsageMetric.API_CALLS:
      // API calls are only available for premium tier
      limit = (tier as string) === 'premium' ? null : 0;
      break;
    default:
      limit = null;
  }

  return checkUsageLimit(currentUsage, limit);
}

/**
 * Check if user can create a search term
 */
export async function canCreateSearchTerm(
  supabase: SupabaseClient<Database>,
  userId: string,
  tier: SubscriptionTier
): Promise<LimitCheckResult> {
  // Get current count of active search terms
  const { count, error } = await supabase
    .from('search_terms')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    console.error('Error checking search term count:', error);
    throw error;
  }

  const currentCount = count || 0;
  const limit = SUBSCRIPTION_TIERS[tier].limits.searchTerms;

  return checkUsageLimit(currentCount, limit);
}

/**
 * Check if user can analyze a video
 */
export async function canAnalyzeVideo(
  supabase: SupabaseClient<Database>,
  userId: string,
  tier: SubscriptionTier
): Promise<LimitCheckResult> {
  return checkLimit(supabase, userId, UsageMetric.VIDEOS_ANALYZED, tier);
}

/**
 * Check if user has access to performance analysis feature
 */
export function hasPerformanceAnalysisAccess(tier: SubscriptionTier): boolean {
  return SUBSCRIPTION_TIERS[tier].limits.hasPerformanceAnalysis;
}

/**
 * Check if user has API access
 */
export function hasApiAccess(tier: SubscriptionTier): boolean {
  return SUBSCRIPTION_TIERS[tier].limits.hasApiAccess;
}

/**
 * Check if user has priority processing
 */
export function hasPriorityProcessing(tier: SubscriptionTier): boolean {
  return SUBSCRIPTION_TIERS[tier].limits.hasPriorityProcessing;
}

/**
 * Get all usage statistics for a user
 */
export async function getUserUsageStats(
  supabase: SupabaseClient<Database>,
  userId: string,
  tier: SubscriptionTier
) {
  const [videosAnalyzed, searchTermsCount] = await Promise.all([
    getCurrentUsage(supabase, userId, UsageMetric.VIDEOS_ANALYZED),
    supabase
      .from('search_terms')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active')
      .then(({ count }) => count || 0),
  ]);

  const videoLimit = SUBSCRIPTION_TIERS[tier].limits.videosPerMonth;
  const searchTermLimit = SUBSCRIPTION_TIERS[tier].limits.searchTerms;

  return {
    videosAnalyzed: {
      current: videosAnalyzed,
      limit: videoLimit,
      percentUsed: videoLimit ? (videosAnalyzed / videoLimit) * 100 : 0,
      remaining: videoLimit ? Math.max(0, videoLimit - videosAnalyzed) : null,
    },
    searchTerms: {
      current: searchTermsCount,
      limit: searchTermLimit,
      percentUsed: searchTermLimit ? (searchTermsCount / searchTermLimit) * 100 : 0,
      remaining: searchTermLimit ? Math.max(0, searchTermLimit - searchTermsCount) : null,
    },
    features: {
      performanceAnalysis: hasPerformanceAnalysisAccess(tier),
      priorityProcessing: hasPriorityProcessing(tier),
      apiAccess: hasApiAccess(tier),
    },
  };
}

/**
 * Reset usage for a user (called at billing cycle renewal)
 * Note: This should be called via a scheduled job or webhook
 */
export async function resetUsage(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  // The database function handles billing periods automatically
  // Usage tracking entries are created per billing period
  // Old periods remain for historical tracking
  // No manual reset needed - the increment_usage function handles it

  console.log(`Usage will be reset automatically for user ${userId} in the next billing period`);
}

/**
 * Get usage warning message based on percent used
 */
export function getUsageWarningMessage(percentUsed: number, metricName: string): string | null {
  if (percentUsed >= 100) {
    return `You've reached your ${metricName} limit. Upgrade to continue.`;
  } else if (percentUsed >= 90) {
    return `You've used ${percentUsed}% of your ${metricName} limit.`;
  } else if (percentUsed >= 75) {
    return `You've used ${percentUsed}% of your ${metricName} limit. Consider upgrading soon.`;
  }
  return null;
}

/**
 * Determine recommended upgrade tier based on usage
 */
export function getRecommendedUpgrade(
  currentTier: SubscriptionTier,
  usage: {
    videosAnalyzedPercent: number;
    searchTermsPercent: number;
  }
): SubscriptionTier | null {
  if ((currentTier as string) === 'premium') {
    return null; // Already on highest tier
  }

  // If user is consistently hitting limits, recommend upgrade
  const isHeavyUser =
    usage.videosAnalyzedPercent >= 80 || usage.searchTermsPercent >= 80;

  if ((currentTier as string) === 'free' && isHeavyUser) {
    return 'pro' as SubscriptionTier;
  }

  if ((currentTier as string) === 'pro' && isHeavyUser) {
    return 'premium' as SubscriptionTier;
  }

  return null;
}
