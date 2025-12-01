# Polar Integration Guide

This document provides a complete guide to setting up and using the Polar subscription integration for the TikTok Hook Analyzer.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Polar Dashboard Setup](#polar-dashboard-setup)
5. [Testing the Integration](#testing-the-integration)
6. [Going Live](#going-live)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:

- A Polar account (sign up at https://polar.sh)
- Supabase project set up
- Node.js and npm installed
- Access to your deployment environment

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Polar Configuration
POLAR_ACCESS_TOKEN=polar_at_your_access_token_here
POLAR_ORGANIZATION_ID=your_organization_id_here
POLAR_WEBHOOK_SECRET=your_webhook_secret_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Update for production

# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Getting Your Polar Credentials

1. **Access Token**:
   - Go to https://polar.sh/settings/tokens
   - Click "Create Token"
   - Name it "TikTok Hook Analyzer"
   - Select all scopes needed:
     - `products:read`
     - `products:write`
     - `customers:read`
     - `customers:write`
     - `checkouts:read`
     - `checkouts:write`
     - `subscriptions:read`
     - `subscriptions:write`
     - `webhooks:read`
     - `webhooks:write`
   - Copy the token (starts with `polar_at_`)

2. **Organization ID**:
   - Go to your organization settings at https://polar.sh/settings
   - Find your Organization ID in the URL or settings page
   - Copy the ID (starts with `org_`)

3. **Webhook Secret**:
   - Will be generated when you create the webhook endpoint (see Polar Dashboard Setup)

## Database Setup

### 1. Run the Migration

The subscription tables migration has been created. Run it with:

```bash
cd supabase
supabase migration up
```

Or if using remote Supabase:

```bash
supabase db push
```

### 2. Verify Tables Created

Check that the following tables were created:
- `user_profiles`
- `usage_tracking`
- `subscription_events`

### 3. Update Type Definitions

Regenerate TypeScript types:

```bash
cd nextjs
npm run db:types  # or your type generation command
```

## Polar Dashboard Setup

### 1. Create Products

Go to https://polar.sh/dashboard/products and create 3 products:

#### Free Tier
- **Name**: Free
- **Price**: $0
- **Interval**: Monthly (doesn't matter for free)
- **Description**: Perfect for trying out TikTok Hook Analyzer
- **Benefits**: Create custom benefits for:
  - 2 search terms
  - 10 videos per month
  - Basic clustering

#### Pro Tier
- **Name**: Pro
- **Price**: $29.00
- **Interval**: Monthly
- **Description**: For serious content creators and marketers
- **Benefits**: Create custom benefits for:
  - 10 search terms
  - 100 videos per month
  - Performance analysis access

#### Enterprise Tier
- **Name**: Enterprise
- **Price**: $99.00
- **Interval**: Monthly
- **Description**: For agencies and teams with high-volume needs
- **Benefits**: Create custom benefits for:
  - Unlimited search terms
  - Unlimited videos
  - API access

### 2. Create Custom Benefits

For each product, create custom benefits:

1. Go to https://polar.sh/dashboard/benefits
2. Click "Create Benefit"
3. Select "Custom" benefit type
4. Name it (e.g., "Video Analysis Quota")
5. Set properties that match your tier limits

### 3. Get Product IDs

After creating products:

1. Go to each product page
2. Copy the Product ID (starts with `prod_`)
3. Update these IDs in two places:

**File: `nextjs/src/pages/pricing.tsx`** (line ~40):
```typescript
const productIdMap: Record<SubscriptionTier, string> = {
  free: '',
  pro: 'prod_YOUR_PRO_PRODUCT_ID',
  enterprise: 'prod_YOUR_ENTERPRISE_PRODUCT_ID',
};
```

**File: `nextjs/src/lib/clients/polar.ts`** (line ~160):
```typescript
const tierMap: Record<string, 'free' | 'pro' | 'enterprise'> = {
  'prod_YOUR_PRO_PRODUCT_ID': 'pro',
  'prod_YOUR_ENTERPRISE_PRODUCT_ID': 'enterprise',
};
```

**File: `nextjs/src/pages/api/polar/webhook.ts`** (line ~75):
```typescript
const tierMap: Record<string, SubscriptionTier> = {
  'prod_YOUR_PRO_PRODUCT_ID': 'pro',
  'prod_YOUR_ENTERPRISE_PRODUCT_ID': 'enterprise',
};
```

### 4. Set Up Webhooks

1. Go to https://polar.sh/dashboard/webhooks
2. Click "Create Endpoint"
3. **URL**: `https://your-domain.com/api/polar/webhook`
   - For local testing: Use ngrok or similar tunnel service
4. **Events to Subscribe**:
   - `subscription.created`
   - `subscription.active`
   - `subscription.updated`
   - `subscription.canceled`
   - `subscription.revoked`
   - `customer.created`
   - `order.paid`
5. Copy the **Signing Secret** and add to `.env.local` as `POLAR_WEBHOOK_SECRET`

## Install Dependencies

The Polar SDK needs to be installed. Due to the network issue you encountered, try:

```bash
cd nextjs

# Try with different registry if needed
npm install @polar-sh/sdk

# Or use yarn
yarn add @polar-sh/sdk

# Or try with --legacy-peer-deps if there are conflicts
npm install @polar-sh/sdk --legacy-peer-deps
```

If you continue to have network issues, you can:
1. Try on a different network
2. Use a VPN
3. Install from GitHub directly: `npm install polar-sh/sdk#main`

## Testing the Integration

### 1. Local Testing Setup

For local webhook testing, use ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Start your Next.js app
npm run dev

# In another terminal, tunnel to your local server
ngrok http 3000

# Copy the https URL (e.g., https://abc123.ngrok.io)
# Update NEXT_PUBLIC_BASE_URL in .env.local
# Update webhook URL in Polar dashboard to https://abc123.ngrok.io/api/polar/webhook
```

### 2. Test Checkout Flow

1. Visit http://localhost:3000/pricing
2. Click "Upgrade to Pro"
3. Complete the checkout (use Polar test card: `4242 4242 4242 4242`)
4. Verify:
   - Webhook received (check server logs)
   - Database updated (check `user_profiles` table)
   - User redirected to success page

### 3. Test Subscription Management

1. Visit http://localhost:3000/dashboard/subscription
2. Verify current plan displays correctly
3. Test "Manage Billing" button (opens Polar customer portal)
4. Test cancel subscription flow

### 4. Test Usage Limits

1. Create search terms until limit is reached
2. Verify error message displays correctly
3. Verify upgrade prompt appears
4. Check usage tracking in database

## Going Live

### Production Checklist

- [ ] Update `NEXT_PUBLIC_BASE_URL` to production URL
- [ ] Update webhook URL in Polar dashboard to production
- [ ] Switch Polar environment from sandbox to production
- [ ] Test complete checkout flow in production
- [ ] Verify webhook delivery in production
- [ ] Set up monitoring for webhook failures
- [ ] Configure proper error logging
- [ ] Test all upgrade/downgrade scenarios
- [ ] Verify usage reset on billing cycle

### Monitoring

Monitor these metrics:
- Webhook delivery success rate
- Checkout completion rate
- Subscription cancellation rate
- Usage patterns per tier

## Troubleshooting

### Webhooks Not Receiving

**Check:**
1. Webhook URL is correct and publicly accessible
2. Webhook secret matches `.env.local`
3. Webhook endpoint is subscribed to correct events
4. Check server logs for errors
5. Use Polar dashboard to view webhook delivery attempts

**Debug:**
```bash
# Check if webhook endpoint is accessible
curl -X POST https://your-domain.com/api/polar/webhook \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Checkout Not Working

**Check:**
1. Product IDs are correct in `pricing.tsx`
2. Polar customer is being created successfully
3. Check browser console for errors
4. Verify access token has correct scopes

**Debug:**
- Check network tab in browser DevTools
- Review server logs for error messages
- Test with Polar's test mode first

### Subscription Not Updating

**Check:**
1. Webhook is being received
2. Product ID to tier mapping is correct
3. Database update is successful
4. User profile exists in `user_profiles` table

**Debug:**
```sql
-- Check user profile
SELECT * FROM user_profiles WHERE id = 'user_id';

-- Check subscription events
SELECT * FROM subscription_events WHERE user_id = 'user_id' ORDER BY created_at DESC;

-- Check usage tracking
SELECT * FROM usage_tracking WHERE user_id = 'user_id' ORDER BY created_at DESC;
```

### Usage Limits Not Working

**Check:**
1. Usage tracking is being called after operations
2. Billing period functions are working correctly
3. Tier limits are configured correctly

**Debug:**
```sql
-- Test usage tracking function
SELECT get_current_usage('user_id', 'videos_analyzed');

-- Test increment function
SELECT increment_usage('user_id', 'videos_analyzed', 1);
```

### Common Errors

**Error: "Polar customer not found"**
- Solution: Ensure customer creation in checkout flow works
- Check: `user_profiles.polar_customer_id` is set

**Error: "Product not configured"**
- Solution: Update product ID mapping in `pricing.tsx`
- Check: Product IDs are copied correctly from Polar dashboard

**Error: "Invalid webhook signature"**
- Solution: Verify webhook secret matches Polar dashboard
- Check: `POLAR_WEBHOOK_SECRET` environment variable

## Support

For issues:
- Polar Documentation: https://polar.sh/docs
- Polar Discord: https://discord.gg/polar
- GitHub Issues: Create issue in your repository

## Next Steps

After completing the integration:

1. **Add Usage Tracking to More Endpoints**
   - Track video analyses when they complete
   - Track API calls if implementing API access

2. **Implement Usage Reset Job**
   - Create a cron job to reset monthly usage
   - Or rely on billing period auto-reset

3. **Add More Upgrade Prompts**
   - Show upgrade CTAs in strategic locations
   - Display usage warnings when approaching limits

4. **Create Email Notifications**
   - Welcome email on subscription
   - Usage warning emails
   - Renewal reminders

5. **Analytics**
   - Track conversion rates
   - Monitor churn
   - Analyze upgrade patterns
