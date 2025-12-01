/**
 * Subscription Dashboard Page
 *
 * Allows users to view and manage their subscription
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import { ExternalLink, Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { formatPrice } from '@/types/subscription';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function SubscriptionDashboard() {
  const router = useRouter();
  const [canceling, setCanceling] = useState(false);

  // Get subscription data
  const { data: subscription, isLoading, refetch } = trpc.subscription.getSubscription.useQuery();
  const { data: recommendation } = trpc.subscription.getUpgradeRecommendation.useQuery();

  // Get customer portal URL
  const { data: portalData, isLoading: portalLoading } = trpc.subscription.getPortalUrl.useQuery();

  // Cancel subscription mutation
  const cancelSubscription = trpc.subscription.cancelSubscription.useMutation({
    onSuccess: () => {
      refetch();
      setCanceling(false);
      alert('Your subscription has been canceled. You will retain access until the end of your billing period.');
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
      setCanceling(false);
    },
  });

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    setCanceling(true);
    try {
      await cancelSubscription.mutateAsync();
    } catch (error) {
      console.error('Cancel error:', error);
    }
  };

  const handleManageSubscription = () => {
    if (portalData?.url) {
      window.open(portalData.url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (!subscription) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Unable to load subscription information.</p>
        </div>
      </DashboardLayout>
    );
  }

  const { profile, usage, remaining, tierConfig } = subscription;
  const isFreeTier = (profile as any).subscription_tier === 'free';
  const isCanceled = (profile as any).subscription_status === 'canceled';

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Subscription</h1>
            <p className="text-gray-500 mt-1">Manage your plan and billing</p>
          </div>
          {!isFreeTier && portalData?.url && (
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={portalLoading}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage Billing
            </Button>
          )}
        </div>

        {/* Upgrade Recommendation */}
        {recommendation?.shouldUpgrade && (
          <Alert className="border-blue-200 bg-blue-50">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">Upgrade Recommended</AlertTitle>
            <AlertDescription className="text-blue-700">
              <p className="mb-2">Based on your usage, we recommend upgrading to {recommendation.recommendedTier}:</p>
              <ul className="list-disc pl-5 space-y-1">
                {recommendation.reasons?.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => router.push('/pricing')}
              >
                View Plans
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Cancellation Notice */}
        {isCanceled && (profile as any).subscription_ends_at && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-900">Subscription Canceled</AlertTitle>
            <AlertDescription className="text-orange-700">
              Your subscription has been canceled. You will retain access to {tierConfig.name} features until{' '}
              {new Date((profile as any).subscription_ends_at).toLocaleDateString()}.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your active subscription tier</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{tierConfig.name}</h3>
                  <p className="text-sm text-gray-500">{tierConfig.description}</p>
                </div>
                <Badge variant={isFreeTier ? 'secondary' : 'default'} className="ml-2">
                  {(profile as any).subscription_status}
                </Badge>
              </div>

              <Separator />

              {!isFreeTier && (
                <div>
                  <p className="text-sm text-gray-500">Billing</p>
                  <p className="text-xl font-semibold">
                    {formatPrice(tierConfig.price)} / {tierConfig.interval}
                  </p>
                </div>
              )}

              {(profile as any).subscription_started_at && (
                <div>
                  <p className="text-sm text-gray-500">Active since</p>
                  <p className="text-sm">
                    {new Date((profile as any).subscription_started_at).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Features</p>
                <ul className="space-y-1">
                  {tierConfig.features.slice(0, 3).map((feature, i) => (
                    <li key={i} className="text-sm text-gray-600">✓ {feature}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              {isFreeTier ? (
                <Button className="w-full" onClick={() => router.push('/pricing')}>
                  Upgrade Plan
                </Button>
              ) : isCanceled ? (
                <Button className="w-full" variant="outline" onClick={() => router.push('/pricing')}>
                  Reactivate Subscription
                </Button>
              ) : (
                <>
                  <Button variant="outline" className="flex-1" onClick={() => router.push('/pricing')}>
                    Change Plan
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleCancelSubscription}
                    disabled={canceling}
                  >
                    {canceling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Canceling...
                      </>
                    ) : (
                      'Cancel Plan'
                    )}
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>

          {/* Usage Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Usage This Month</CardTitle>
              <CardDescription>Track your current billing period usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Videos Analyzed */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Videos Analyzed</span>
                  <span className="text-sm text-gray-500">
                    {usage.videosAnalyzed.current} / {usage.videosAnalyzed.limit || '∞'}
                  </span>
                </div>
                <Progress
                  value={usage.videosAnalyzed.percentUsed}
                  className={usage.videosAnalyzed.percentUsed >= 90 ? 'bg-red-100' : ''}
                />
                {usage.videosAnalyzed.remaining !== null && (
                  <p className="text-xs text-gray-500 mt-1">
                    {usage.videosAnalyzed.remaining} remaining
                  </p>
                )}
              </div>

              {/* Search Terms */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Active Search Terms</span>
                  <span className="text-sm text-gray-500">
                    {usage.searchTerms.current} / {usage.searchTerms.limit || '∞'}
                  </span>
                </div>
                <Progress
                  value={usage.searchTerms.percentUsed}
                  className={usage.searchTerms.percentUsed >= 90 ? 'bg-red-100' : ''}
                />
                {usage.searchTerms.remaining !== null && (
                  <p className="text-xs text-gray-500 mt-1">
                    {usage.searchTerms.remaining} available
                  </p>
                )}
              </div>

              <Separator />

              {/* Features */}
              <div>
                <p className="text-sm font-medium mb-3">Available Features</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Performance Analysis</span>
                    <Badge variant={usage.features.performanceAnalysis ? 'default' : 'secondary'}>
                      {usage.features.performanceAnalysis ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Priority Processing</span>
                    <Badge variant={usage.features.priorityProcessing ? 'default' : 'secondary'}>
                      {usage.features.priorityProcessing ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">API Access</span>
                    <Badge variant={usage.features.apiAccess ? 'default' : 'secondary'}>
                      {usage.features.apiAccess ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Need Help */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              If you have questions about your subscription, billing, or need assistance, we're here to help.
            </p>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => window.open('mailto:support@example.com')}>
                Contact Support
              </Button>
              <Button variant="outline" onClick={() => router.push('/pricing')}>
                View All Plans
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
