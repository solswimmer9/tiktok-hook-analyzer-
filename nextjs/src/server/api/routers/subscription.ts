/**
 * Subscription tRPC Router
 *
 * This router handles all subscription-related API operations including:
 * - Getting subscription status
 * - Creating checkout sessions
 * - Managing subscriptions
 * - Tracking usage
 */

import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import {
  getOrCreatePolarCustomer,
  createCheckoutSession,
  getPolarSubscription,
  cancelPolarSubscription,
  getCustomerPortalUrl,
  listCustomerSubscriptions,
} from '@/lib/clients/polar';
import { getUserSubscription, getRemainingUsage } from '@/server/middleware/subscription';
import { getUserUsageStats } from '@/lib/subscription/usage-tracker';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/types/subscription';

export const subscriptionRouter = createTRPCRouter({
  /**
   * Get current user's subscription information
   */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getUserSubscription(ctx.supabase, ctx.user.id);

    // Get usage statistics
    const usage = await getUserUsageStats(
      ctx.supabase,
      ctx.user.id,
      profile.subscription_tier as SubscriptionTier
    );

    // Get remaining usage
    const remaining = await getRemainingUsage(
      ctx.supabase,
      ctx.user.id,
      profile.subscription_tier as SubscriptionTier
    );

    return {
      profile,
      usage,
      remaining,
      tierConfig: SUBSCRIPTION_TIERS[profile.subscription_tier as SubscriptionTier],
    };
  }),

  /**
   * Get all available subscription tiers
   */
  getTiers: protectedProcedure.query(async () => {
    return Object.values(SUBSCRIPTION_TIERS);
  }),

  /**
   * Create a checkout session for upgrading to a specific tier
   */
  createCheckout: protectedProcedure
    .input(
      z.object({
        tier: z.enum(['pro', 'premium']),
        productId: z.string(), // Polar product ID
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tier, productId } = input;

      // Get or create Polar customer
      const customer = await getOrCreatePolarCustomer({
        email: ctx.user.email!,
        userId: ctx.user.id,
        metadata: {
          tier,
        },
      });

      // Create checkout session
      const session = await createCheckoutSession({
        productId,
        customerId: customer.id,
        metadata: {
          userId: ctx.user.id,
          tier,
        },
      });

      return {
        checkoutUrl: session.url,
        sessionId: session.id,
      };
    }),

  /**
   * Cancel current subscription
   */
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await getUserSubscription(ctx.supabase, ctx.user.id);

    if (!profile.polar_subscription_id) {
      throw new Error('No active subscription to cancel');
    }

    // Cancel subscription in Polar
    await cancelPolarSubscription(profile.polar_subscription_id);

    // Update local database (webhook will handle the actual status update)
    await ctx.supabase
      .from('user_profiles')
      .update({
        subscription_canceled_at: new Date().toISOString(),
      })
      .eq('id', ctx.user.id);

    return { success: true };
  }),

  /**
   * Get customer portal URL for managing subscription
   */
  getPortalUrl: protectedProcedure.query(async ({ ctx }) => {
    try {
      const profile = await getUserSubscription(ctx.supabase, ctx.user.id);

      if (!profile.polar_customer_id) {
        // Create customer first
        const customer = await getOrCreatePolarCustomer({
          email: ctx.user.email!,
          userId: ctx.user.id,
        });

        // Update profile with customer ID
        await ctx.supabase
          .from('user_profiles')
          .update({
            polar_customer_id: customer.id,
          })
          .eq('id', ctx.user.id);

        return { url: await getCustomerPortalUrl(customer.id) };
      }

      return { url: await getCustomerPortalUrl(profile.polar_customer_id) };
    } catch (error) {
      console.error('Error creating/getting Polar customer:', error);
      // Return null if Polar API fails (e.g., invalid credentials in dev)
      return { url: null };
    }
  }),

  /**
   * Get usage history for the current billing period
   */
  getUsageHistory: protectedProcedure.query(async ({ ctx }) => {
    // Get current billing period
    const { data: period } = await ctx.supabase.rpc('get_current_billing_period');

    if (!period || period.length === 0) {
      return [];
    }

    const { period_start, period_end } = period[0];

    // Get usage tracking records
    const { data, error } = await ctx.supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', ctx.user.id)
      .eq('billing_period_start', period_start)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data;
  }),

  /**
   * Get subscription events/audit log
   */
  getSubscriptionEvents: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('subscription_events')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (error) throw error;

      return data;
    }),

  /**
   * Check if user has access to a specific feature
   */
  checkFeatureAccess: protectedProcedure
    .input(
      z.object({
        feature: z.enum([
          'performance_analysis',
          'api_access',
          'priority_processing',
          'unlimited_search_terms',
          'unlimited_videos',
        ]),
      })
    )
    .query(async ({ ctx, input }) => {
      const profile = await getUserSubscription(ctx.supabase, ctx.user.id);
      const tier = profile.subscription_tier as SubscriptionTier;
      const tierConfig = SUBSCRIPTION_TIERS[tier];

      let hasAccess = false;

      switch (input.feature) {
        case 'performance_analysis':
          hasAccess = tierConfig.limits.hasPerformanceAnalysis;
          break;
        case 'api_access':
          hasAccess = tierConfig.limits.hasApiAccess;
          break;
        case 'priority_processing':
          hasAccess = tierConfig.limits.hasPriorityProcessing;
          break;
        case 'unlimited_search_terms':
          hasAccess = tierConfig.limits.searchTerms === null;
          break;
        case 'unlimited_videos':
          hasAccess = tierConfig.limits.videosPerMonth === null;
          break;
      }

      return {
        hasAccess,
        currentTier: tier,
        requiredTier: hasAccess ? tier : tier === 'free' ? 'pro' : 'premium',
      };
    }),

  /**
   * Get upgrade recommendations based on usage
   */
  getUpgradeRecommendation: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getUserSubscription(ctx.supabase, ctx.user.id);
    const usage = await getUserUsageStats(
      ctx.supabase,
      ctx.user.id,
      profile.subscription_tier as SubscriptionTier
    );

    const tier = profile.subscription_tier as SubscriptionTier;

    // Check if user is hitting limits
    const isHittingLimits =
      usage.videosAnalyzed.percentUsed >= 80 ||
      usage.searchTerms.percentUsed >= 80;

    if (tier === 'premium' || !isHittingLimits) {
      return {
        shouldUpgrade: false,
        currentTier: tier,
        recommendedTier: null,
        reason: null,
      };
    }

    const recommendedTier = tier === 'free' ? 'pro' : 'premium';
    const reasons = [];

    if (usage.videosAnalyzed.percentUsed >= 80) {
      reasons.push(
        `You've used ${Math.round(usage.videosAnalyzed.percentUsed)}% of your video analysis limit`
      );
    }

    if (usage.searchTerms.percentUsed >= 80) {
      reasons.push(
        `You've used ${Math.round(usage.searchTerms.percentUsed)}% of your search term limit`
      );
    }

    return {
      shouldUpgrade: true,
      currentTier: tier,
      recommendedTier,
      reasons,
      benefits: SUBSCRIPTION_TIERS[recommendedTier].features,
    };
  }),

  /**
   * Sync subscription with Polar
   * Useful for manually refreshing subscription status
   */
  syncSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await getUserSubscription(ctx.supabase, ctx.user.id);

    if (!profile.polar_customer_id) {
      return { synced: false, message: 'No Polar customer found' };
    }

    // Get active subscriptions from Polar
    const subscriptions = await listCustomerSubscriptions(profile.polar_customer_id);

    if (subscriptions.length === 0) {
      // No active subscriptions, downgrade to free
      await ctx.supabase
        .from('user_profiles')
        .update({
          subscription_tier: 'free',
          subscription_status: 'active',
        })
        .eq('id', ctx.user.id);

      return { synced: true, message: 'Downgraded to free tier' };
    }

    // Get the most recent active subscription
    const latestSubscription = subscriptions[0];

    // Update local database
    // Note: You'll need to implement getTierFromProductId in polar.ts
    await ctx.supabase
      .from('user_profiles')
      .update({
        polar_subscription_id: latestSubscription.id,
        subscription_status: latestSubscription.status as any,
      })
      .eq('id', ctx.user.id);

    return { synced: true, message: 'Subscription synced successfully' };
  }),
});
