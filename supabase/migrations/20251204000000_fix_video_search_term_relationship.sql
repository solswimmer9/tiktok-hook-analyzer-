-- ============================================================================
-- Fix Video-Search Term Relationship
-- Allows videos to be associated with multiple search terms
-- ============================================================================

-- Drop the old UNIQUE constraint on video_id alone
ALTER TABLE public.tiktok_videos
DROP CONSTRAINT tiktok_videos_video_id_key;

-- Add a new unique constraint on the composite key (search_term_id, video_id)
-- This prevents duplicate rows within the same search term while allowing
-- the same video to appear in different search terms
ALTER TABLE public.tiktok_videos
ADD CONSTRAINT tiktok_videos_search_term_video_id_unique UNIQUE (search_term_id, video_id);

-- Create an index for the composite key to improve upsert performance
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_search_term_video_id
ON public.tiktok_videos (search_term_id, video_id);
