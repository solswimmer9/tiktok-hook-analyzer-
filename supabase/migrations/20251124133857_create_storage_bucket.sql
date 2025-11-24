-- Create storage bucket for TikTok videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('tiktok-videos', 'tiktok-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the bucket
-- Allow authenticated users to upload videos
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tiktok-videos');

-- Allow authenticated users to read videos
CREATE POLICY "Allow authenticated reads" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'tiktok-videos');

-- Allow public reads (since bucket is public)
CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'tiktok-videos');

-- Allow service role to do everything
CREATE POLICY "Allow service role all operations" ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'tiktok-videos')
  WITH CHECK (bucket_id = 'tiktok-videos');
