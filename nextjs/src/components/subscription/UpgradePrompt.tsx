/**
 * Upgrade Prompt Component
 *
 * Displays a prompt to upgrade when users hit subscription limits
 */

import { useRouter } from 'next/router';
import { TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice, SUBSCRIPTION_TIERS, type SubscriptionTier } from '@/types/subscription';

interface UpgradePromptProps {
  currentTier: SubscriptionTier;
  limitType: 'videos' | 'search_terms' | 'performance_analysis';
  currentUsage?: number;
  limit?: number;
  onDismiss?: () => void;
  className?: string;
}

export function UpgradePrompt({
  currentTier,
  limitType,
  currentUsage,
  limit,
  onDismiss,
  className = '',
}: UpgradePromptProps) {
  const router = useRouter();

  // Determine recommended tier
  const recommendedTier: SubscriptionTier = currentTier === 'free' ? 'pro' : 'enterprise';
  const tierConfig = SUBSCRIPTION_TIERS[recommendedTier];

  // Generate message based on limit type
  const getMessage = () => {
    switch (limitType) {
      case 'videos':
        return {
          title: 'Video Analysis Limit Reached',
          description: `You've analyzed ${currentUsage} of ${limit} videos this month. Upgrade to ${tierConfig.name} for ${tierConfig.limits.videosPerMonth === null ? 'unlimited' : `${tierConfig.limits.videosPerMonth} videos per month`}.`,
        };
      case 'search_terms':
        return {
          title: 'Search Term Limit Reached',
          description: `You've used all ${limit} search term slots. Upgrade to ${tierConfig.name} for ${tierConfig.limits.searchTerms === null ? 'unlimited' : `${tierConfig.limits.searchTerms} search terms`}.`,
        };
      case 'performance_analysis':
        return {
          title: 'Unlock Performance Analysis',
          description: `Performance analysis is available on ${tierConfig.name} and higher. Compare top vs. bottom performers to identify winning patterns.`,
        };
      default:
        return {
          title: 'Upgrade Your Plan',
          description: `Unlock more features with ${tierConfig.name}.`,
        };
    }
  };

  const { title, description } = getMessage();

  return (
    <Card className={`border-blue-200 bg-blue-50 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-900">{title}</CardTitle>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription className="text-blue-700">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-2xl font-bold text-blue-900">
              {formatPrice(tierConfig.price)}
            </p>
            <p className="text-sm text-blue-600">per {tierConfig.interval}</p>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 mb-1">Includes:</p>
            <ul className="text-xs text-blue-700 space-y-0.5">
              {tierConfig.features.slice(0, 3).map((feature, i) => (
                <li key={i}>✓ {feature}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          onClick={() => router.push('/pricing')}
        >
          Upgrade to {tierConfig.name}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => router.push('/pricing')}
        >
          View All Plans
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Inline Upgrade Badge
 *
 * Small upgrade CTA that can be placed inline with content
 */
interface UpgradeBadgeProps {
  feature: string;
  requiredTier?: SubscriptionTier;
}

export function UpgradeBadge({ feature, requiredTier = 'pro' }: UpgradeBadgeProps) {
  const router = useRouter();
  const tierConfig = SUBSCRIPTION_TIERS[requiredTier];

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
      <span className="text-sm text-blue-900">{feature}</span>
      <Badge className="bg-blue-600 hover:bg-blue-700 cursor-pointer text-xs" onClick={() => router.push('/pricing')}>
        {tierConfig.name} Feature
      </Badge>
    </div>
  );
}

/**
 * Feature Lock Overlay
 *
 * Overlays locked content with upgrade prompt
 */
interface FeatureLockProps {
  feature: string;
  requiredTier?: SubscriptionTier;
  children?: React.ReactNode;
}

export function FeatureLock({ feature, requiredTier = 'pro', children }: FeatureLockProps) {
  const router = useRouter();
  const tierConfig = SUBSCRIPTION_TIERS[requiredTier];

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="pointer-events-none select-none blur-sm opacity-50">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <Card className="max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              {feature}
            </CardTitle>
            <CardDescription>
              This feature requires {tierConfig.name} or higher.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Upgrade to unlock this feature and more:
            </p>
            <ul className="text-sm space-y-1 mb-4">
              {tierConfig.features.slice(0, 4).map((feat, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{formatPrice(tierConfig.price)}</span>
              <span className="text-gray-500">per {tierConfig.interval}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => router.push('/pricing')}>
              Upgrade to {tierConfig.name}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
