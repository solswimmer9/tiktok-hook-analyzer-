-- Fix RLS policies for usage_tracking table
-- Users need to be able to insert their own usage records

-- Allow authenticated users to insert their own usage records
CREATE POLICY "Users can insert their own usage"
    ON public.usage_tracking
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own usage records
-- (This is needed because the increment_usage function uses ON CONFLICT DO UPDATE)
CREATE POLICY "Users can update their own usage"
    ON public.usage_tracking
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
