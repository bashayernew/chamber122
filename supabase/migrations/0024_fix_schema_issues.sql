-- Fix Database Schema Issues
-- This migration addresses:
-- 1. Missing is_published column in activities table
-- 2. Issues with v_business_verification_latest view

-- ==============================================
-- 1) Fix activities table schema
-- ==============================================

-- Add missing columns to activities table if they don't exist
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS start_at timestamptz,
ADD COLUMN IF NOT EXISTS end_at timestamptz,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create index for better performance on date queries
CREATE INDEX IF NOT EXISTS activities_start_at_idx ON public.activities (start_at);
CREATE INDEX IF NOT EXISTS activities_end_at_idx ON public.activities (end_at);
CREATE INDEX IF NOT EXISTS activities_is_published_idx ON public.activities (is_published);

-- ==============================================
-- 2) Fix v_business_verification_latest view
-- ==============================================

-- Drop the existing view if it exists
DROP VIEW IF EXISTS public.v_business_verification_latest;

-- Recreate the view with proper structure
CREATE VIEW public.v_business_verification_latest AS
SELECT 
    bv.id,
    bv.business_id,
    bv.status,
    bv.verification_type,
    bv.submitted_at,
    bv.reviewed_at,
    bv.reviewed_by,
    bv.notes,
    bv.created_at,
    bv.updated_at,
    b.business_name,
    b.owner_id
FROM public.business_verifications bv
JOIN public.businesses b ON bv.business_id = b.id
WHERE bv.id = (
    SELECT bv2.id 
    FROM public.business_verifications bv2 
    WHERE bv2.business_id = bv.business_id 
    ORDER BY bv2.created_at DESC 
    LIMIT 1
);

-- Grant permissions on the view
GRANT SELECT ON public.v_business_verification_latest TO authenticated;

-- ==============================================
-- 3) Ensure business_verifications table exists
-- ==============================================

-- Create business_verifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.business_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    verification_type text NOT NULL, -- document, business_info, etc.
    submitted_at timestamptz DEFAULT now(),
    reviewed_at timestamptz,
    reviewed_by uuid REFERENCES auth.users(id),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on business_verifications
ALTER TABLE public.business_verifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for business_verifications
DROP POLICY IF EXISTS "business_verifications_select" ON public.business_verifications;
CREATE POLICY "business_verifications_select" ON public.business_verifications
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = business_verifications.business_id
            AND b.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "business_verifications_insert" ON public.business_verifications;
CREATE POLICY "business_verifications_insert" ON public.business_verifications
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = business_verifications.business_id
            AND b.owner_id = auth.uid()
        )
    );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS business_verifications_business_id_idx ON public.business_verifications (business_id);
CREATE INDEX IF NOT EXISTS business_verifications_status_idx ON public.business_verifications (status);

-- ==============================================
-- 4) Ensure activities table has proper RLS policies
-- ==============================================

-- Enable RLS on activities if not already enabled
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for activities
DROP POLICY IF EXISTS "activities_select" ON public.activities;
CREATE POLICY "activities_select" ON public.activities
    FOR SELECT TO authenticated
    USING (is_published = true OR created_by = auth.uid());

DROP POLICY IF EXISTS "activities_insert" ON public.activities;
CREATE POLICY "activities_insert" ON public.activities
    FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "activities_update" ON public.activities;
CREATE POLICY "activities_update" ON public.activities
    FOR UPDATE TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- ==============================================
-- 5) Add missing columns to activities if needed
-- ==============================================

-- Ensure activities table has all required columns
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS event_type text,
ADD COLUMN IF NOT EXISTS max_participants integer,
ADD COLUMN IF NOT EXISTS current_participants integer DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS activities_created_by_idx ON public.activities (created_by);
CREATE INDEX IF NOT EXISTS activities_event_type_idx ON public.activities (event_type);
CREATE INDEX IF NOT EXISTS activities_created_at_idx ON public.activities (created_at);

-- ==============================================
-- 6) Update existing activities to have default values
-- ==============================================

-- Update existing activities to have proper default values
UPDATE public.activities 
SET 
    is_published = COALESCE(is_published, false),
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now())
WHERE is_published IS NULL OR created_at IS NULL OR updated_at IS NULL;
