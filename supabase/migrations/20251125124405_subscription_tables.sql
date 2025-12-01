-- Subscription Management Tables for Polar Integration
-- This migration adds support for subscription tiers and usage tracking

-- Create enum for subscription tiers
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'premium');

-- Create enum for subscription status
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'paused');

-- User profiles table with subscription information
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Polar integration fields
    polar_customer_id TEXT UNIQUE,
    polar_subscription_id TEXT,

    -- Subscription details
    subscription_tier subscription_tier NOT NULL DEFAULT 'free',
    subscription_status subscription_status DEFAULT 'active',
    subscription_started_at TIMESTAMPTZ,
    subscription_ends_at TIMESTAMPTZ,
    subscription_canceled_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usage tracking table for metering
CREATE TABLE IF NOT EXISTS public.usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Usage metrics
    metric_name TEXT NOT NULL, -- e.g., 'videos_analyzed', 'search_terms_created'
    metric_value INTEGER NOT NULL DEFAULT 1,

    -- Billing period tracking
    billing_period_start TIMESTAMPTZ NOT NULL,
    billing_period_end TIMESTAMPTZ NOT NULL,

    -- Metadata for additional context
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Indexes for efficient querying
    CONSTRAINT unique_user_metric_period UNIQUE (user_id, metric_name, billing_period_start)
);

-- Subscription events log for audit trail
CREATE TABLE IF NOT EXISTS public.subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Event details
    event_type TEXT NOT NULL, -- e.g., 'subscription.created', 'subscription.canceled'
    polar_event_id TEXT,

    -- Event payload from Polar
    payload JSONB NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_user_profiles_polar_customer_id ON public.user_profiles(polar_customer_id);
CREATE INDEX idx_user_profiles_subscription_tier ON public.user_profiles(subscription_tier);
CREATE INDEX idx_usage_tracking_user_id ON public.usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_metric_name ON public.usage_tracking(metric_name);
CREATE INDEX idx_usage_tracking_billing_period ON public.usage_tracking(billing_period_start, billing_period_end);
CREATE INDEX idx_subscription_events_user_id ON public.subscription_events(user_id);
CREATE INDEX idx_subscription_events_event_type ON public.subscription_events(event_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get current billing period
CREATE OR REPLACE FUNCTION get_current_billing_period()
RETURNS TABLE (
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        date_trunc('month', NOW()) AS period_start,
        date_trunc('month', NOW()) + INTERVAL '1 month' AS period_end;
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage metric
CREATE OR REPLACE FUNCTION increment_usage(
    p_user_id UUID,
    p_metric_name TEXT,
    p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
BEGIN
    -- Get current billing period
    SELECT period_start, period_end INTO v_period_start, v_period_end
    FROM get_current_billing_period();

    -- Insert or update usage
    INSERT INTO public.usage_tracking (
        user_id,
        metric_name,
        metric_value,
        billing_period_start,
        billing_period_end
    ) VALUES (
        p_user_id,
        p_metric_name,
        p_increment,
        v_period_start,
        v_period_end
    )
    ON CONFLICT (user_id, metric_name, billing_period_start)
    DO UPDATE SET
        metric_value = usage_tracking.metric_value + p_increment,
        created_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get user's current usage for a metric
CREATE OR REPLACE FUNCTION get_current_usage(
    p_user_id UUID,
    p_metric_name TEXT
)
RETURNS INTEGER AS $$
DECLARE
    v_usage INTEGER;
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
BEGIN
    -- Get current billing period
    SELECT period_start, period_end INTO v_period_start, v_period_end
    FROM get_current_billing_period();

    -- Get usage for current period
    SELECT COALESCE(metric_value, 0) INTO v_usage
    FROM public.usage_tracking
    WHERE user_id = p_user_id
        AND metric_name = p_metric_name
        AND billing_period_start = v_period_start;

    RETURN COALESCE(v_usage, 0);
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view their own profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile metadata"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Service role can do everything (for webhooks and admin operations)
CREATE POLICY "Service role has full access to user_profiles"
    ON public.user_profiles
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Usage tracking policies
CREATE POLICY "Users can view their own usage"
    ON public.usage_tracking
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to usage_tracking"
    ON public.usage_tracking
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Subscription events policies (read-only for users, full access for service)
CREATE POLICY "Users can view their own subscription events"
    ON public.subscription_events
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to subscription_events"
    ON public.subscription_events
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Create default profile for existing users
INSERT INTO public.user_profiles (id, subscription_tier, subscription_status)
SELECT id, 'free', 'active'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, subscription_tier, subscription_status)
    VALUES (NEW.id, 'free', 'active');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile for new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON public.user_profiles TO anon, authenticated;
GRANT SELECT ON public.usage_tracking TO anon, authenticated;
GRANT SELECT ON public.subscription_events TO anon, authenticated;

-- Comments for documentation
COMMENT ON TABLE public.user_profiles IS 'Stores user subscription information and Polar integration data';
COMMENT ON TABLE public.usage_tracking IS 'Tracks usage metrics for billing and quota enforcement';
COMMENT ON TABLE public.subscription_events IS 'Audit log for all subscription-related events from Polar webhooks';
COMMENT ON FUNCTION increment_usage IS 'Increments usage counter for a specific metric in the current billing period';
COMMENT ON FUNCTION get_current_usage IS 'Returns current usage count for a metric in the current billing period';
