/**
 * Subscription Type Definitions for Polar Integration
 *
 * This file contains all TypeScript types and interfaces for the subscription system.
 */

// Subscription Tiers
export type SubscriptionTier = 'free' | 'pro' | 'premium';

// Subscription Status
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused';

// Subscription tier configuration
export interface TierConfig {
  tier: SubscriptionTier;
  name: string;
  description: string;
  price: number; // in cents (e.g., 2900 = $29.00)
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: TierLimits;
  highlighted?: boolean;
  polarProductId?: string; // Polar product ID
}

// Usage limits per tier
export interface TierLimits {
  searchTerms: number | null; // null = unlimited
  videosPerMonth: number | null; // null = unlimited
  hasPerformanceAnalysis: boolean;
  hasPriorityProcessing: boolean;
  hasApiAccess: boolean;
}

// User profile with subscription info
export interface UserProfile {
  id: string;
  polarCustomerId: string | null;
  polarSubscriptionId: string | null;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  subscriptionStartedAt: string | null;
  subscriptionEndsAt: string | null;
  subscriptionCanceledAt: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Usage tracking
export interface UsageTracking {
  id: string;
  userId: string;
  metricName: string;
  metricValue: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  metadata: Record<string, any>;
  createdAt: string;
}

// Subscription event log
export interface SubscriptionEvent {
  id: string;
  userId: string;
  eventType: string;
  polarEventId: string | null;
  payload: Record<string, any>;
  createdAt: string;
}

// Usage metrics enum
export enum UsageMetric {
  VIDEOS_ANALYZED = 'videos_analyzed',
  SEARCH_TERMS_CREATED = 'search_terms_created',
  API_CALLS = 'api_calls',
}

// Current usage summary
export interface UsageSummary {
  videosAnalyzed: number;
  searchTermsCount: number;
  apiCalls: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}

// Subscription tier limits check result
export interface LimitCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number | null;
  percentUsed: number;
  message?: string;
}

// Polar checkout session data
export interface CheckoutSessionData {
  checkoutUrl: string;
  sessionId: string;
  expiresAt: string;
}

// Polar webhook event types
export enum PolarWebhookEvent {
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_ACTIVE = 'subscription.active',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELED = 'subscription.canceled',
  SUBSCRIPTION_REVOKED = 'subscription.revoked',
  SUBSCRIPTION_UNCANCELED = 'subscription.uncanceled',
  ORDER_CREATED = 'order.created',
  ORDER_PAID = 'order.paid',
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  BENEFIT_GRANT_CREATED = 'benefit_grant.created',
  BENEFIT_GRANT_REVOKED = 'benefit_grant.revoked',
}

// Polar webhook payload (simplified)
export interface PolarWebhookPayload {
  type: PolarWebhookEvent;
  data: {
    id: string;
    type: string;
    attributes: Record<string, any>;
  };
}

// Subscription tier definitions
export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierConfig> = {
  free: {
    tier: 'free',
    name: 'Free',
    description: 'Perfect for trying out TikTok Hook Analyzer',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: [
      '2 search terms',
      '2 videos analyzed per month',
      'Basic clustering analysis',
      'Hook pattern identification',
      'Community support',
    ],
    limits: {
      searchTerms: 2,
      videosPerMonth: 2,
      hasPerformanceAnalysis: false,
      hasPriorityProcessing: false,
      hasApiAccess: false,
    },
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    description: 'For serious content creators and marketers',
    price: 2900, // $29.00
    currency: 'USD',
    interval: 'month',
    features: [
      '10 search terms',
      '100 videos analyzed per month',
      'Advanced clustering analysis',
      'Performance comparison (top vs. bottom)',
      'Anti-pattern detection',
      'Statistical insights',
      'Priority processing',
      'Email support',
    ],
    limits: {
      searchTerms: 10,
      videosPerMonth: 100,
      hasPerformanceAnalysis: true,
      hasPriorityProcessing: true,
      hasApiAccess: false,
    },
    highlighted: true,
  },
  premium: {
    tier: 'premium',
    name: 'Premium',
    description: 'For agencies and teams with high-volume needs',
    price: 9900, // $99.00
    currency: 'USD',
    interval: 'month',
    features: [
      'Unlimited search terms',
      'Unlimited video analysis',
      'All Pro features',
      'API access',
      'Custom integrations',
      'Dedicated account manager',
      'Priority support',
      'Custom reports',
    ],
    limits: {
      searchTerms: null, // unlimited
      videosPerMonth: null, // unlimited
      hasPerformanceAnalysis: true,
      hasPriorityProcessing: true,
      hasApiAccess: true,
    },
  },
};

// Helper function to get tier config
export function getTierConfig(tier: SubscriptionTier): TierConfig {
  return SUBSCRIPTION_TIERS[tier];
}

// Helper function to check if a tier has a specific feature
export function tierHasFeature(
  tier: SubscriptionTier,
  feature: keyof TierLimits
): boolean {
  return SUBSCRIPTION_TIERS[tier].limits[feature] === true;
}

// Helper function to get limit value
export function getTierLimit(
  tier: SubscriptionTier,
  limitType: keyof TierLimits
): number | boolean | null {
  return SUBSCRIPTION_TIERS[tier].limits[limitType];
}

// Helper function to format price
export function formatPrice(priceInCents: number, currency: string = 'USD'): string {
  const price = priceInCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price);
}

// Helper function to check if usage is within limits
export function checkUsageLimit(
  current: number,
  limit: number | null
): LimitCheckResult {
  if (limit === null) {
    return {
      allowed: true,
      currentUsage: current,
      limit: null,
      percentUsed: 0,
      message: 'Unlimited',
    };
  }

  const allowed = current < limit;
  const percentUsed = (current / limit) * 100;

  return {
    allowed,
    currentUsage: current,
    limit,
    percentUsed: Math.round(percentUsed),
    message: allowed
      ? `${current} of ${limit} used`
      : `Limit reached (${limit}/${limit})`,
  };
}

// Helper to determine if user needs upgrade
export function needsUpgrade(
  currentTier: SubscriptionTier,
  requiredTier: SubscriptionTier
): boolean {
  const tierOrder: SubscriptionTier[] = ['free', 'pro', 'premium'];
  const currentIndex = tierOrder.indexOf(currentTier);
  const requiredIndex = tierOrder.indexOf(requiredTier);
  return currentIndex < requiredIndex;
}
