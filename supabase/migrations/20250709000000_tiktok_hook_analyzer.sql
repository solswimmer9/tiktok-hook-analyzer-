-- ============================================================================
-- TikTok Hook Analyzer - Database Schema Addition
-- Generated on 2025-07-09
-- ============================================================================

-- ============================================================================
-- TIKTOK HOOK ANALYZER TABLES
-- ============================================================================

-- Search terms table
CREATE TABLE IF NOT EXISTS public.search_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TikTok videos table
CREATE TABLE IF NOT EXISTS public.tiktok_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_term_id UUID NOT NULL REFERENCES public.search_terms(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL UNIQUE,
  title TEXT,
  creator TEXT,
  creator_username TEXT,
  view_count BIGINT DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  share_count BIGINT DEFAULT 0,
  comment_count BIGINT DEFAULT 0,
  duration INTEGER, -- in seconds
  video_url TEXT NOT NULL,
  r2_key TEXT, -- Cloudflare R2 storage key
  r2_url TEXT, -- Cloudflare R2 public URL
  thumbnail_url TEXT,
  raw_payload JSONB, -- full TikTok API response for future re-parsing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hook analysis table
CREATE TABLE IF NOT EXISTS public.hook_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.tiktok_videos(id) ON DELETE CASCADE,
  analysis_result JSONB NOT NULL, -- structured analysis results
  gemini_response TEXT, -- raw Gemini response
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trend analysis table
CREATE TABLE IF NOT EXISTS public.trend_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  analysis_results JSONB NOT NULL, -- aggregated trend insights
  total_videos_analyzed INTEGER DEFAULT 0,
  common_phrases JSONB, -- most frequent phrases
  visual_themes JSONB, -- visual pattern analysis
  engagement_patterns JSONB, -- engagement trend analysis
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Search terms indexes
CREATE INDEX IF NOT EXISTS idx_search_terms_user_id ON public.search_terms (user_id);
CREATE INDEX IF NOT EXISTS idx_search_terms_status ON public.search_terms (status);
CREATE INDEX IF NOT EXISTS idx_search_terms_created_at ON public.search_terms (created_at DESC);

-- TikTok videos indexes
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_search_term_id ON public.tiktok_videos (search_term_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_video_id ON public.tiktok_videos (video_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_created_at ON public.tiktok_videos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_view_count ON public.tiktok_videos (view_count DESC);
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_like_count ON public.tiktok_videos (like_count DESC);

-- Hook analysis indexes
CREATE INDEX IF NOT EXISTS idx_hook_analysis_video_id ON public.hook_analysis (video_id);
CREATE INDEX IF NOT EXISTS idx_hook_analysis_processed_at ON public.hook_analysis (processed_at DESC);

-- Trend analysis indexes
CREATE INDEX IF NOT EXISTS idx_trend_analysis_date ON public.trend_analysis (date DESC);
CREATE INDEX IF NOT EXISTS idx_trend_analysis_created_at ON public.trend_analysis (created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.search_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hook_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_analysis ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Search terms policies
CREATE POLICY "Users can view their own search terms" ON public.search_terms
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own search terms" ON public.search_terms
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- TikTok videos policies (users can view videos from their search terms)
CREATE POLICY "Users can view videos from their search terms" ON public.tiktok_videos
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.search_terms st
      WHERE st.id = tiktok_videos.search_term_id
      AND st.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage videos from their search terms" ON public.tiktok_videos
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.search_terms st
      WHERE st.id = tiktok_videos.search_term_id
      AND st.user_id = auth.uid()
    )
  );

-- Hook analysis policies (users can view analysis for their videos)
CREATE POLICY "Users can view analysis for their videos" ON public.hook_analysis
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.tiktok_videos tv
      JOIN public.search_terms st ON tv.search_term_id = st.id
      WHERE tv.id = hook_analysis.video_id
      AND st.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage analysis for their videos" ON public.hook_analysis
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.tiktok_videos tv
      JOIN public.search_terms st ON tv.search_term_id = st.id
      WHERE tv.id = hook_analysis.video_id
      AND st.user_id = auth.uid()
    )
  );

-- Trend analysis policies (all authenticated users can view trends)
CREATE POLICY "Authenticated users can view trend analysis" ON public.trend_analysis
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage trend analysis" ON public.trend_analysis
  FOR ALL TO authenticated USING (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Triggers for updated_at timestamps
CREATE TRIGGER update_search_terms_updated_at
  BEFORE UPDATE ON public.search_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tiktok_videos_updated_at
  BEFORE UPDATE ON public.tiktok_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- UNIQUE CONSTRAINTS
-- ============================================================================

-- Ensure one trend analysis per date
CREATE UNIQUE INDEX IF NOT EXISTS idx_trend_analysis_date_unique ON public.trend_analysis (date);

-- Ensure one search term per user (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_search_terms_user_term_unique ON public.search_terms (user_id, LOWER(term));