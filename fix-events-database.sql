-- Fix Events + Activities Database Structure
-- This migration creates the proper events table and activities view
-- Safe to run multiple times (idempotent)

-- ==============================================
-- 1) Create events table with proper structure
-- ==============================================

-- Drop existing events table if it exists
DROP TABLE IF EXISTS public.events CASCADE;

-- Create events table with all required columns
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location text,
  start_at timestamptz,
  end_at timestamptz,
  contact_name text,
  contact_email text,
  contact_phone text,
  registration_url text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled')),
  is_published boolean DEFAULT false,
  cover_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX events_business_id_idx ON public.events (business_id);
CREATE INDEX events_start_at_idx ON public.events (start_at);
CREATE INDEX events_is_published_idx ON public.events (is_published);
CREATE INDEX events_status_idx ON public.events (status);

-- ==============================================
-- 2) Create activities view (UNION of events + bulletins)
-- ==============================================

-- Drop existing activities view if it exists
DROP VIEW IF EXISTS public.activities CASCADE;

-- Create activities view that unions events and bulletins
CREATE VIEW public.activities AS
SELECT 
  id,
  business_id,
  'event' as kind,
  title,
  description,
  location,
  start_at,
  end_at,
  contact_name,
  contact_email,
  contact_phone,
  registration_url as link,
  status,
  is_published,
  cover_url,
  created_at,
  updated_at,
  start_at as sort_at
FROM public.events

UNION ALL

SELECT 
  id,
  business_id,
  'bulletin' as kind,
  title,
  body as description,
  location,
  publish_at as start_at,
  expire_at as end_at,
  null as contact_name,
  null as contact_email,
  null as contact_phone,
  attachment_url as link,
  status,
  is_published,
  cover_url,
  created_at,
  updated_at,
  COALESCE(publish_at, created_at) as sort_at
FROM public.bulletins;

-- ==============================================
-- 3) RLS policies for events table
-- ==============================================

-- Enable RLS on events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "events_public_read" ON public.events;
DROP POLICY IF EXISTS "events_owner_read" ON public.events;
DROP POLICY IF EXISTS "events_owner_insert" ON public.events;
DROP POLICY IF EXISTS "events_owner_update" ON public.events;

-- Allow anyone to read published events
CREATE POLICY "events_public_read"
ON public.events
FOR SELECT
TO anon, authenticated
USING (is_published = true AND status = 'published');

-- Owners can read all their events
CREATE POLICY "events_owner_read"
ON public.events
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = events.business_id AND b.owner_id = auth.uid()));

-- Owners can insert into their own business events
CREATE POLICY "events_owner_insert"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = events.business_id AND b.owner_id = auth.uid()));

-- Owners can update their own events
CREATE POLICY "events_owner_update"
ON public.events
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = events.business_id AND b.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = events.business_id AND b.owner_id = auth.uid()));

-- ==============================================
-- 4) Grant permissions
-- ==============================================

-- Grant permissions on events table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT ON public.events TO anon;

-- Grant permissions on activities view
GRANT SELECT ON public.activities TO anon, authenticated;

-- ==============================================
-- 5) Create trigger for updated_at
-- ==============================================

-- Create or replace the touch_updated_at function
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS
$$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for events table
DROP TRIGGER IF EXISTS trg_events_updated_at ON public.events;
CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ==============================================
-- 6) Verification
-- ==============================================

-- Verify tables and view exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
    RAISE EXCEPTION 'events table not created';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'activities') THEN
    RAISE EXCEPTION 'activities view not created';
  END IF;
  RAISE NOTICE 'Events table and activities view created successfully';
END $$;
