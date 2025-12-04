-- Scope trend_analysis to individual users to prevent cross-tenant access

-- Add user_id to trend_analysis (nullable for existing rows; app writes this going forward)
ALTER TABLE public.trend_analysis
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Replace broad RLS policies with user-scoped ones
DROP POLICY IF EXISTS "Authenticated users can view trend analysis" ON public.trend_analysis;
DROP POLICY IF EXISTS "Authenticated users can manage trend analysis" ON public.trend_analysis;

CREATE POLICY "Users can view their own trend analysis" ON public.trend_analysis
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own trend analysis" ON public.trend_analysis
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- Update uniqueness and indexing to include user_id
DROP INDEX IF EXISTS idx_trend_analysis_date_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_trend_analysis_user_date_unique ON public.trend_analysis (user_id, date);
CREATE INDEX IF NOT EXISTS idx_trend_analysis_user_id ON public.trend_analysis (user_id);
