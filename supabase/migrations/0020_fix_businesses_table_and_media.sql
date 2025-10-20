-- Fix businesses table to have all required fields and create business_media table

-- Add all missing fields to businesses table
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

-- Create business_media table for storing business gallery images
CREATE TABLE IF NOT EXISTS public.business_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  public_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on business_media
ALTER TABLE public.business_media ENABLE ROW LEVEL SECURITY;

-- Create policies for business_media
DROP POLICY IF EXISTS "owners can insert their media" ON public.business_media;
CREATE POLICY "owners can insert their media" ON public.business_media
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_media.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners can select their media" ON public.business_media;
CREATE POLICY "owners can select their media" ON public.business_media
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_media.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_media_business_id ON public.business_media(business_id);
CREATE INDEX IF NOT EXISTS idx_business_media_created_at ON public.business_media(created_at DESC);
