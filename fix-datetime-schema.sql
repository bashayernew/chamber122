-- Fix datetime schema for event creation
-- This script ensures the activities table has proper datetime columns

-- ==============================================
-- 1) Check if activities table exists and has proper structure
-- ==============================================

-- First, let's see what tables we have
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('activities', 'events', 'activities_base');

-- ==============================================
-- 2) If activities table exists, check its structure
-- ==============================================

-- Check columns in activities table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'activities' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ==============================================
-- 3) Make end_at column nullable if it exists
-- ==============================================

-- Make end_at nullable in activities table (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'end_at' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.activities ALTER COLUMN end_at DROP NOT NULL;
        RAISE NOTICE 'Made end_at column nullable in activities table';
    ELSE
        RAISE NOTICE 'end_at column does not exist in activities table';
    END IF;
END $$;

-- ==============================================
-- 4) If activities table doesn't exist, create it
-- ==============================================

-- Create activities table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    location text,
    start_at timestamptz NOT NULL,
    end_at timestamptz, -- Nullable
    contact_name text,
    contact_email text,
    contact_phone text,
    link text,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled')),
    is_published boolean DEFAULT false,
    cover_image_url text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- ==============================================
-- 5) Enable RLS on activities table
-- ==============================================

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 6) Create RLS policies for activities table
-- ==============================================

-- Allow anyone to read published activities
CREATE POLICY IF NOT EXISTS activities_public_read
ON public.activities
FOR SELECT
TO anon, authenticated
USING (is_published = true AND status = 'published');

-- Owners can read all their activities
CREATE POLICY IF NOT EXISTS activities_owner_read
ON public.activities
FOR SELECT
TO authenticated
USING (exists (select 1 from businesses b where b.id = activities.business_id and b.owner_id = auth.uid()));

-- Owners can insert into their own business activities
CREATE POLICY IF NOT EXISTS activities_owner_insert
ON public.activities
FOR INSERT
TO authenticated
WITH CHECK (exists (select 1 from businesses b where b.id = activities.business_id and b.owner_id = auth.uid()));

-- Owners can update their own business activities
CREATE POLICY IF NOT EXISTS activities_owner_update
ON public.activities
FOR UPDATE
TO authenticated
USING (exists (select 1 from businesses b where b.id = activities.business_id and b.owner_id = auth.uid()));

-- Owners can delete their own business activities
CREATE POLICY IF NOT EXISTS activities_owner_delete
ON public.activities
FOR DELETE
TO authenticated
USING (exists (select 1 from businesses b where b.id = activities.business_id and b.owner_id = auth.uid()));

-- ==============================================
-- 7) Final verification
-- ==============================================

-- Show final table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'activities' 
AND table_schema = 'public'
ORDER BY ordinal_position;
