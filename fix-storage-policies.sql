-- Fix storage policies to allow anonymous uploads to temp folder
-- This fixes the RLS policy issue during signup process

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload to temp folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Create new policies that allow anonymous access to temp folder

-- Policy 1: Allow anonymous uploads to temp folder (for signup process)
CREATE POLICY "Anonymous can upload to temp folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'business-files' 
  AND (storage.foldername(name))[1] = 'temp'
);

-- Policy 2: Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to their own folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'business-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Allow viewing temp files (anonymous) and own files (authenticated)
CREATE POLICY "View temp and own files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'business-files' 
  AND (
    (storage.foldername(name))[1] = 'temp'
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- Policy 4: Allow updating temp files (anonymous) and own files (authenticated)
CREATE POLICY "Update temp and own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'business-files' 
  AND (
    (storage.foldername(name))[1] = 'temp'
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- Policy 5: Allow deleting temp files (anonymous) and own files (authenticated)
CREATE POLICY "Delete temp and own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'business-files' 
  AND (
    (storage.foldername(name))[1] = 'temp'
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);
