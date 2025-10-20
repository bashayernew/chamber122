-- Fix activities view to read from activities_base table
-- This ensures events created in activities_base appear in the events page

-- Drop existing activities view
DROP VIEW IF EXISTS public.activities CASCADE;

-- Create new activities view that reads from activities_base
CREATE VIEW public.activities AS
SELECT 
  id,
  business_id,
  COALESCE(kind, type) as kind,  -- Use kind if exists, otherwise use type
  title,
  description,
  location,
  start_at,
  end_at,
  contact_name,
  contact_email,
  contact_phone,
  link,
  status,
  is_published,
  cover_image_url,
  created_at,
  updated_at,
  created_by
FROM public.activities_base;

-- Grant permissions on the view
GRANT SELECT ON public.activities TO anon, authenticated;

-- Add RLS policy for the view
ALTER VIEW public.activities SET (security_invoker = true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the view works
SELECT 'View created successfully' as status;
