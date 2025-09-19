-- Create storage bucket for bulletin attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('bulletin-attachments', 'bulletin-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for bulletin attachments
CREATE POLICY "Providers can upload bulletin attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'bulletin-attachments' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('provider_individual', 'provider_company')
  )
);

CREATE POLICY "Providers can view bulletin attachments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'bulletin-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Providers can update their own bulletin attachments" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'bulletin-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Providers can delete their own bulletin attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'bulletin-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Public can view bulletin attachments (for published bulletins)
CREATE POLICY "Public can view bulletin attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'bulletin-attachments');
