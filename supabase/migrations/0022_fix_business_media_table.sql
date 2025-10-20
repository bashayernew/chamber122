-- Fix business_media table structure and ensure proper columns/defaults

-- Ensure columns exist and have sensible defaults
ALTER TABLE public.business_media
  ADD COLUMN IF NOT EXISTS id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Optional: ensure index for ordering by created_at
CREATE INDEX IF NOT EXISTS business_media_created_at_idx
  ON public.business_media (business_id, created_at DESC);

-- Confirm basic RLS (adjust if you already have these)
-- ALTER TABLE public.business_media ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they work
DROP POLICY IF EXISTS "owner select media" ON public.business_media;
CREATE POLICY "owner select media"
ON public.business_media
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_media.business_id
      AND b.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "owner insert media" ON public.business_media;
CREATE POLICY "owner insert media"
ON public.business_media
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_media.business_id
      AND b.owner_id = auth.uid()
  )
);
