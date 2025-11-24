-- Add service role policies to allow background jobs to write to database

-- Service role can do everything with search_terms
CREATE POLICY "Service role can manage search terms" ON public.search_terms
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Service role can do everything with tiktok_videos
CREATE POLICY "Service role can manage tiktok videos" ON public.tiktok_videos
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Service role can do everything with hook_analysis
CREATE POLICY "Service role can manage hook analysis" ON public.hook_analysis
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Service role can do everything with trend_analysis
CREATE POLICY "Service role can manage trend analysis" ON public.trend_analysis
  FOR ALL TO service_role USING (true) WITH CHECK (true);
