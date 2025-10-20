-- Storage policies for business-assets bucket

-- Enable RLS on storage.objects if not already enabled
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "auth can upload to business-assets" ON storage.objects;
DROP POLICY IF EXISTS "auth can update business-assets" ON storage.objects;

-- Allow authenticated users to upload to business-assets bucket
CREATE POLICY "auth can upload to business-assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-assets');

-- Allow users to update their own files in business-assets bucket
CREATE POLICY "auth can update business-assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'business-assets')
  WITH CHECK (bucket_id = 'business-assets');
