/**
 * Subscription Middleware
 *
 * This module provides middleware functions for checking subscription status
 * and enforcing usage limits in tRPC procedures.
 */

import { TRPCError } from '@trpc/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/../../shared-types/database.types';
import { SubscriptionTier, SubscriptionStatus } from '@/types/subscription';
import {
  canCreateSearchTerm,
  canAnalyzeVideo,
  hasPerformanceAnalysisAccess,
  hasApiAccess,
} from '@/lib/subscription/usage-tracker';

/**
 * Get user's subscription profile
 */
export async function getUserSubscription(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch subscription information',
    });
  }

  // If no profile exists, create one with free tier
  if (!data) {
    const { data: newProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        subscription_tier: 'free',
        subscription_status: 'active',
      })
      .select()
      .single();

    if (insertError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create user profile',
      });
    }

    return newProfile;
  }

  return data;
}

/**
 * Check if subscription is active
 */
export function isSubscriptionActive(status: SubscriptionStatus | string): boolean {
  return status === 'active' || status === 'trialing';
}

/**
 * Middleware: Require active subscription
 */
export async function requireActiveSubscription(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const profile = await getUserSubscription(supabase, userId);

  if (!isSubscriptionActive(profile.subscription_status)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Your subscription is not active. Please update your payment information.',
    });
  }

  return profile;
}

/**
 * Middleware: Require specific tier or higher
 */
export async function requireTier(
  supabase: SupabaseClient<Database>,
  userId: string,
  requiredTier: SubscriptionTier
) {
  const profile = await requireActiveSubscription(supabase, userId);

  const tierOrder: SubscriptionTier[] = ['free', 'pro', 'premium'];
  const currentIndex = tierOrder.indexOf(profile.subscription_tier);
  const requiredIndex = tierOrder.indexOf(requiredTier);

  if (currentIndex < requiredIndex) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `This feature requires a ${requiredTier} subscription or higher. Please upgrade your plan.`,
    });
  }

  return profile;
}

/**
 * Middleware: Check if user can create a search term
 */
export async function checkSearchTermLimit(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const profile = await getUserSubscription(supabase, userId);
  const limitCheck = await canCreateSearchTerm(
    supabase,
    userId,
    profile.subscription_tier
  );

  if (!limitCheck.allowed) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `You've reached your search term limit (${limitCheck.limit}). Please upgrade to add more search terms.`,
    });
  }

  return profile;
}

/**
 * Middleware: Check if user can analyze a video
 */
export async function checkVideoAnalysisLimit(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const profile = await getUserSubscription(supabase, userId);
  const limitCheck = await canAnalyzeVideo(
    supabase,
    userId,
    profile.subscription_tier
  );

  if (!limitCheck.allowed) {
    const message = limitCheck.limit
      ? `You've reached your monthly video analysis limit (${limitCheck.limit}). Please upgrade for more analyses.`
      : 'Video analysis is not available on your current plan.';

    throw new TRPCError({
      code: 'FORBIDDEN',
      message,
    });
  }

  return profile;
}

/**
 * Middleware: Require performance analysis access
 */
export async function requirePerformanceAnalysis(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const profile = await getUserSubscription(supabase, userId);

  if (!hasPerformanceAnalysisAccess(profile.subscription_tier)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Performance analysis requires a Pro subscription or higher. Please upgrade your plan.',
    });
  }

  return profile;
}

/**
 * Middleware: Require API access
 */
export async function requireApiAccess(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const profile = await getUserSubscription(supabase, userId);

  if (!hasApiAccess(profile.subscription_tier)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'API access requires a Premium subscription. Please upgrade your plan.',
    });
  }

  return profile;
}

/**
 * Helper: Get upgrade message for a specific feature
 */
export function getUpgradeMessage(
  currentTier: SubscriptionTier,
  feature: string
): string {
  if (currentTier === 'free') {
    return `Upgrade to Pro to unlock ${feature} and other premium features.`;
  } else if (currentTier === 'pro') {
    return `Upgrade to Premium for ${feature} and unlimited access.`;
  }
  return `${feature} is not available on your current plan.`;
}

/**
 * Helper: Get remaining usage for display
 */
export async function getRemainingUsage(
  supabase: SupabaseClient<Database>,
  userId: string,
  tier: SubscriptionTier
) {
  const [searchTermLimit, videoLimit] = await Promise.all([
    canCreateSearchTerm(supabase, userId, tier),
    canAnalyzeVideo(supabase, userId, tier),
  ]);

  return {
    searchTerms: {
      remaining: searchTermLimit.limit
        ? searchTermLimit.limit - searchTermLimit.currentUsage
        : null,
      limit: searchTermLimit.limit,
      percentUsed: searchTermLimit.percentUsed,
    },
    videos: {
      remaining: videoLimit.limit
        ? videoLimit.limit - videoLimit.currentUsage
        : null,
      limit: videoLimit.limit,
      percentUsed: videoLimit.percentUsed,
    },
  };
}
