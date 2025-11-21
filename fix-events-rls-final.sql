-- Fix Events RLS Policies - Final Fix
-- This migration fixes the conflicting RLS policies for the events table

-- ==============================================
-- 1) Drop all existing conflicting policies
-- ==============================================

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "events_select" ON public.events;
DROP POLICY IF EXISTS "events_insert" ON public.events;
DROP POLICY IF EXISTS "events_update" ON public.events;
DROP POLICY IF EXISTS "events_public_read" ON public.events;
DROP POLICY IF EXISTS "events_owner_read" ON public.events;
DROP POLICY IF EXISTS "events_owner_insert" ON public.events;
DROP POLICY IF EXISTS "events_owner_update" ON public.events;
DROP POLICY IF EXISTS "events_owner_delete" ON public.events;
DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
DROP POLICY IF EXISTS "Public can view published events" ON public.events;
DROP POLICY IF EXISTS "Users can insert their own events" ON public.events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;

-- ==============================================
-- 2) Create unified, correct RLS policies
-- ==============================================

-- Public can read published events (both conditions must be true)
CREATE POLICY "events_public_read" ON public.events
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND is_published = true);

-- Owners can read all their events (regardless of status)
CREATE POLICY "events_owner_read" ON public.events
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- Owners can insert events for their business
CREATE POLICY "events_owner_insert" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- Owners can update their own events
CREATE POLICY "events_owner_update" ON public.events
  FOR UPDATE TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- Owners can delete their own events
CREATE POLICY "events_owner_delete" ON public.events
  FOR DELETE TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- ==============================================
-- 3) Ensure events table has proper structure
-- ==============================================

-- Make sure the events table has all required columns
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS start_at timestamptz,
ADD COLUMN IF NOT EXISTS end_at timestamptz,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS governorate text,
ADD COLUMN IF NOT EXISTS area text,
ADD COLUMN IF NOT EXISTS street text,
ADD COLUMN IF NOT EXISTS block text,
ADD COLUMN IF NOT EXISTS floor text,
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS cover_image_url text;

-- ==============================================
-- 4) Create proper indexes for performance
-- ==============================================

CREATE INDEX IF NOT EXISTS events_business_id_idx ON public.events (business_id);
CREATE INDEX IF NOT EXISTS events_start_at_idx ON public.events (start_at);
CREATE INDEX IF NOT EXISTS events_is_published_idx ON public.events (is_published);
CREATE INDEX IF NOT EXISTS events_status_idx ON public.events (status);
CREATE INDEX IF NOT EXISTS events_public_idx ON public.events (status, is_published) WHERE status = 'published' AND is_published = true;

-- ==============================================
-- 5) Update any existing events to have proper status
-- ==============================================

-- Update any events that might have inconsistent status
UPDATE public.events 
SET status = 'published', is_published = true 
WHERE status = 'published' AND is_published IS NULL;

UPDATE public.events 
SET status = 'draft', is_published = false 
WHERE status IS NULL OR status = '';

-- ==============================================
-- 6) Verify the fix
-- ==============================================

-- This query should now work for anonymous users
-- SELECT id, title, status, is_published FROM public.events 
-- WHERE status = 'published' AND is_published = true 
-- ORDER BY created_at DESC LIMIT 10;
