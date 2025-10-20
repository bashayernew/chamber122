-- Complete fix for businesses and business_media tables
-- Run this single migration to fix everything

-- 1. Ensure businesses table has all required fields
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS whatsapp text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS instagram text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS area text,
ADD COLUMN IF NOT EXISTS block text,
ADD COLUMN IF NOT EXISTS street text,
ADD COLUMN IF NOT EXISTS floor text,
ADD COLUMN IF NOT EXISTS office_no text,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;

-- 2. Drop and recreate business_media table to ensure it has the right structure
DROP TABLE IF EXISTS public.business_media CASCADE;

CREATE TABLE public.business_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  public_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.business_media ENABLE ROW LEVEL SECURITY;

-- 4. Create policies
CREATE POLICY "owners can insert their media" ON public.business_media
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_media.business_id
        AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "owners can select their media" ON public.business_media
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_media.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- 5. Create indexes
CREATE INDEX idx_business_media_business_id ON public.business_media(business_id);
CREATE INDEX idx_business_media_created_at ON public.business_media(created_at DESC);

-- 6. Storage policies for business-assets bucket
DROP POLICY IF EXISTS "auth can upload to business-assets" ON storage.objects;
CREATE POLICY "auth can upload to business-assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-assets');

DROP POLICY IF EXISTS "auth can update business-assets" ON storage.objects;
CREATE POLICY "auth can update business-assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'business-assets')
  WITH CHECK (bucket_id = 'business-assets');
