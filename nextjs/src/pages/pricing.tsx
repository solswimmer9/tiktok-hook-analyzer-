/**
 * Pricing Page
 *
 * Displays subscription tiers and allows users to upgrade their plan
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { SUBSCRIPTION_TIERS, formatPrice, type SubscriptionTier } from '@/types/subscription';
import { useUser } from '@/hooks/useUser';

export default function PricingPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);

  // Get user's current subscription
  const { data: subscription } = trpc.subscription.getSubscription.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Direct checkout URLs from Polar
  const checkoutUrls: Record<SubscriptionTier, string> = {
    free: '', // Not needed for free tier
    pro: 'https://sandbox-api.polar.sh/v1/checkout-links/polar_cl_QV52HMscYn0MU4uiA0A50j3y64JOfqGNy3rDp1PQWF4/redirect',
    premium: 'https://sandbox-api.polar.sh/v1/checkout-links/polar_cl_zlUgB6owbkjOZqnAF3mNPW0NPEOT7qvpQHGKm2hBMBh/redirect',
  };

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (!user) {
      router.push('/login?redirect=/pricing');
      return;
    }

    const checkoutUrl = checkoutUrls[tier];
    if (!checkoutUrl) {
      alert('Product not configured. Please contact support.');
      return;
    }

    setSelectedTier(tier);

    // Redirect to Polar checkout
    window.location.href = checkoutUrl;
  };

  const currentTier = subscription?.profile.subscription_tier as SubscriptionTier || 'free';
  const isLoading = userLoading || !!selectedTier;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Choose Your Plan
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Unlock powerful TikTok hook analysis features to grow your content
          </p>
          {router.query.canceled && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
              Checkout was canceled. Feel free to try again when you're ready.
            </div>
          )}
          {router.query.success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
              Welcome to your new plan! Your subscription is now active.
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {Object.values(SUBSCRIPTION_TIERS).map((tier) => {
            const isCurrent = currentTier === tier.tier;
            const isDowngrade = currentTier === 'premium' && tier.tier !== 'premium';
            const canUpgrade = tier.tier !== 'free' && !isCurrent;

            return (
              <Card
                key={tier.tier}
                className={`relative flex flex-col ${
                  tier.highlighted
                    ? 'border-2 border-blue-500 shadow-xl'
                    : 'border border-gray-200'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Current Plan
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">
                      {tier.price === 0 ? 'Free' : formatPrice(tier.price)}
                    </span>
                    {tier.price > 0 && (
                      <span className="text-gray-500">/{tier.interval}</span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  {tier.tier === 'free' ? (
                    <Button variant="outline" className="w-full" disabled>
                      Free Forever
                    </Button>
                  ) : isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : isDowngrade ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push('/dashboard/subscription')}
                    >
                      Manage Subscription
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${tier.highlighted ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                      onClick={() => handleUpgrade(tier.tier)}
                      disabled={isLoading}
                    >
                      {isLoading && selectedTier === tier.tier ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Upgrade to ${tier.name}`
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ / Additional Info */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg">Can I upgrade or downgrade at any time?</h3>
              <p className="text-gray-600 mt-2">
                Yes! You can upgrade your plan at any time. Downgrades will take effect at the end of your current billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg">What happens if I hit my limits?</h3>
              <p className="text-gray-600 mt-2">
                You'll be notified when you're approaching your limits. To continue using the service, you can upgrade to a higher tier at any time.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Do you offer refunds?</h3>
              <p className="text-gray-600 mt-2">
                We offer a 14-day money-back guarantee for all paid plans. If you're not satisfied, contact our support team for a full refund.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Is my payment information secure?</h3>
              <p className="text-gray-600 mt-2">
                Yes! All payments are processed securely through Polar, our payment processor. We never store your payment information.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600">
            Have questions? <a href="mailto:support@example.com" className="text-blue-600 hover:underline">Contact our team</a>
          </p>
        </div>
      </div>
    </div>
  );
}
