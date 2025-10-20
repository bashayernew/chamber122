-- Fix Gallery and Events/Bulletins Issues
-- This migration addresses:
-- 1. Proper business_media table structure
-- 2. RLS policies for business_media
-- 3. Ensures events and bulletins have proper columns

-- ==============================================
-- 1) Create/normalize business_media table
-- ==============================================

-- Drop existing business_media if it has wrong structure
DROP TABLE IF EXISTS public.business_media CASCADE;

-- Create proper business_media table
CREATE TABLE public.business_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_media ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for business_media
CREATE POLICY "owners manage own media"
ON public.business_media
FOR ALL
TO authenticated
USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS business_media_business_id_idx ON public.business_media (business_id);
CREATE INDEX IF NOT EXISTS business_media_created_at_idx ON public.business_media (created_at);

-- ==============================================
-- 2) Ensure events table has proper columns
-- ==============================================

-- Add missing columns to events if they don't exist
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS start_at timestamptz,
ADD COLUMN IF NOT EXISTS end_at timestamptz,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS events_business_id_idx ON public.events (business_id);
CREATE INDEX IF NOT EXISTS events_start_at_idx ON public.events (start_at);
CREATE INDEX IF NOT EXISTS events_is_published_idx ON public.events (is_published);

-- ==============================================
-- 3) Ensure bulletins table has proper columns
-- ==============================================

-- Add missing columns to bulletins if they don't exist
ALTER TABLE public.bulletins 
ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS body text,
ADD COLUMN IF NOT EXISTS publish_at timestamptz,
ADD COLUMN IF NOT EXISTS expire_at timestamptz,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS bulletins_business_id_idx ON public.bulletins (business_id);
CREATE INDEX IF NOT EXISTS bulletins_publish_at_idx ON public.bulletins (publish_at);
CREATE INDEX IF NOT EXISTS bulletins_is_published_idx ON public.bulletins (is_published);

-- ==============================================
-- 4) RLS policies for events and bulletins
-- ==============================================

-- Enable RLS on events if not already enabled
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for events
DROP POLICY IF EXISTS "events_select" ON public.events;
CREATE POLICY "events_select" ON public.events
    FOR SELECT TO authenticated
    USING (
        is_published = true OR 
        business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "events_insert" ON public.events;
CREATE POLICY "events_insert" ON public.events
    FOR INSERT TO authenticated
    WITH CHECK (
        business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "events_update" ON public.events;
CREATE POLICY "events_update" ON public.events
    FOR UPDATE TO authenticated
    USING (
        business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    )
    WITH CHECK (
        business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    );

-- Enable RLS on bulletins if not already enabled
ALTER TABLE public.bulletins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bulletins
DROP POLICY IF EXISTS "bulletins_select" ON public.bulletins;
CREATE POLICY "bulletins_select" ON public.bulletins
    FOR SELECT TO authenticated
    USING (
        is_published = true OR 
        business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "bulletins_insert" ON public.bulletins;
CREATE POLICY "bulletins_insert" ON public.bulletins
    FOR INSERT TO authenticated
    WITH CHECK (
        business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "bulletins_update" ON public.bulletins;
CREATE POLICY "bulletins_update" ON public.bulletins
    FOR UPDATE TO authenticated
    USING (
        business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    )
    WITH CHECK (
        business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    );
