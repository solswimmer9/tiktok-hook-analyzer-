/**
 * Polar API Client
 *
 * This module provides a client for interacting with the Polar API using direct HTTP requests.
 * Since we're using direct checkout links, we don't need the full SDK.
 */

import crypto from 'crypto';

// Environment variables
const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN!;
const POLAR_ORGANIZATION_ID = process.env.POLAR_ORGANIZATION_ID!;
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const POLAR_API_URL = process.env.POLAR_API_URL || 'https://sandbox-api.polar.sh';

if (!POLAR_ACCESS_TOKEN) {
  console.warn('⚠️ POLAR_ACCESS_TOKEN is not set. Polar integration will not work.');
}

if (!POLAR_ORGANIZATION_ID) {
  console.warn('⚠️ POLAR_ORGANIZATION_ID is not set. Polar integration will not work.');
}

/**
 * Helper function to make authenticated requests to Polar API
 */
async function polarFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${POLAR_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${POLAR_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Polar API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Create or get a Polar customer
 */
export async function getOrCreatePolarCustomer(params: {
  email: string;
  userId: string;
  metadata?: Record<string, string>;
}) {
  const { email, userId, metadata = {} } = params;

  try {
    // Try to find existing customer by external_id
    const customers = await polarFetch(`/v1/customers?organization_id=${POLAR_ORGANIZATION_ID}&query=${userId}`);

    if (customers.items && customers.items.length > 0) {
      return customers.items[0];
    }

    // Create new customer
    const customer = await polarFetch('/v1/customers', {
      method: 'POST',
      body: JSON.stringify({
        organization_id: POLAR_ORGANIZATION_ID,
        email,
        external_id: userId,
        metadata: {
          ...metadata,
          source: 'tiktok-hook-analyzer',
        },
      }),
    });

    return customer;
  } catch (error) {
    console.error('Error creating/getting Polar customer:', error);
    throw error;
  }
}

/**
 * Create a checkout session for a product
 */
export async function createCheckoutSession(params: {
  productId: string;
  customerId: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}) {
  const {
    productId,
    customerId,
    successUrl = `${NEXT_PUBLIC_BASE_URL}/dashboard/subscription?success=true`,
    cancelUrl = `${NEXT_PUBLIC_BASE_URL}/pricing?canceled=true`,
    metadata = {},
  } = params;

  try {
    const session = await polarFetch('/v1/checkouts/custom', {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId,
        customer_id: customerId,
        success_url: successUrl,
        allow_discount_codes: true,
        metadata: {
          ...metadata,
          source: 'tiktok-hook-analyzer',
        },
      }),
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Get checkout session by ID
 */
export async function getCheckoutSession(sessionId: string) {
  try {
    const session = await polarFetch(`/v1/checkouts/custom/${sessionId}`);
    return session;
  } catch (error) {
    console.error('Error getting checkout session:', error);
    throw error;
  }
}

/**
 * Get a customer by ID
 */
export async function getPolarCustomer(customerId: string) {
  try {
    const customer = await polarFetch(`/v1/customers/${customerId}`);
    return customer;
  } catch (error) {
    console.error('Error getting Polar customer:', error);
    throw error;
  }
}

/**
 * Get a subscription by ID
 */
export async function getPolarSubscription(subscriptionId: string) {
  try {
    const subscription = await polarFetch(`/v1/subscriptions/${subscriptionId}`);
    return subscription;
  } catch (error) {
    console.error('Error getting subscription:', error);
    throw error;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelPolarSubscription(subscriptionId: string) {
  try {
    const subscription = await polarFetch(`/v1/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        cancel_at_period_end: true,
      }),
    });
    return subscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Get customer portal session URL
 * Allows customers to manage their subscription
 */
export async function getCustomerPortalUrl(customerId: string) {
  try {
    const session = await polarFetch('/v1/customer-sessions', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: customerId,
      }),
    });

    // Construct the portal URL with the session token
    const portalUrl = `https://polar.sh/customer-portal?token=${session.token}`;

    return portalUrl;
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw error;
  }
}

/**
 * List products for the organization
 */
export async function listPolarProducts() {
  try {
    const response = await polarFetch(`/v1/products?organization_id=${POLAR_ORGANIZATION_ID}`);
    return response.items || [];
  } catch (error) {
    console.error('Error listing products:', error);
    throw error;
  }
}

/**
 * Get product by ID
 */
export async function getPolarProduct(productId: string) {
  try {
    const product = await polarFetch(`/v1/products/${productId}`);
    return product;
  } catch (error) {
    console.error('Error getting product:', error);
    throw error;
  }
}

/**
 * List active subscriptions for a customer
 */
export async function listCustomerSubscriptions(customerId: string) {
  try {
    const response = await polarFetch(`/v1/subscriptions?customer_id=${customerId}&active=true`);
    return response.items || [];
  } catch (error) {
    console.error('Error listing customer subscriptions:', error);
    throw error;
  }
}

/**
 * Verify webhook signature
 * This should be called in your webhook handler to ensure the webhook is from Polar
 */
export function verifyPolarWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Polar uses HMAC SHA-256 for webhook signatures
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const digest = hmac.digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * Helper to determine subscription tier from Polar product
 */
export function getSubscriptionTierFromProduct(productId: string): 'free' | 'pro' | 'enterprise' {
  // Map Polar product IDs to subscription tiers
  // You'll need to update these with your actual Polar product IDs
  const tierMap: Record<string, 'free' | 'pro' | 'enterprise'> = {
    // Add your Polar product IDs here after creating them in Polar dashboard
    // Example:
    // 'prod_abc123': 'pro',
    // 'prod_xyz789': 'enterprise',
  };

  return tierMap[productId] || 'free';
}

// Export a placeholder for backward compatibility
export const polarClient = {
  api: polarFetch,
};
