-- Complete Supabase Migration for Chamber122
-- This migration creates all necessary tables, triggers, RLS policies, and RPCs
-- Safe to run multiple times (idempotent)

-- ============================================================================
-- 1. CORE TABLES
-- ============================================================================

-- Create admins table
CREATE TABLE IF NOT EXISTS public.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create businesses table
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  industry text,
  country text,
  city text,
  short_description text,
  whatsapp text,
  logo_url text,
  cover_url text,
  gallery_urls text[],
  registration_type text CHECK (registration_type IN ('registered', 'individual')),
  doc_cr_url text,
  doc_id_url text,
  doc_proof_url text,
  is_active boolean DEFAULT false,
  profile_completeness integer DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create accounts view (compatibility layer)
CREATE OR REPLACE VIEW public.accounts AS
SELECT
  b.id,
  b.owner_id AS owner_user_id,
  b.name,
  b.industry,
  b.country,
  b.is_active,
  b.created_at
FROM public.businesses b;

-- Create activities table
CREATE TABLE IF NOT EXISTS public.activities (
  id bigserial PRIMARY KEY,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  image_url text,
  status text CHECK (status IN ('published','draft','pending','archived')) DEFAULT 'draft',
  views_count int DEFAULT 0,
  likes_count int DEFAULT 0,
  shares_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_is_active ON public.businesses(is_active);
CREATE INDEX IF NOT EXISTS idx_activities_business_id ON public.activities(business_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_by ON public.activities(created_by);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_status ON public.activities(status);
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON public.admins(user_id);

-- ============================================================================
-- 3. HELPER FUNCTIONS
-- ============================================================================

-- Admin checker function
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean LANGUAGE sql STABLE AS
$$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = uid);
$$;

-- Touch updated_at trigger function
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS
$$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Set activity owner trigger function
CREATE OR REPLACE FUNCTION public.set_activity_owner()
RETURNS trigger LANGUAGE plpgsql AS
$$
DECLARE v_owner uuid;
BEGIN
  -- If created_by already provided, keep it; else derive from business_id
  IF NEW.created_by IS NULL THEN
    SELECT owner_id INTO v_owner FROM public.businesses WHERE id = NEW.business_id;
    NEW.created_by := v_owner;
  END IF;

  -- Ensure created_at has a value
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

-- Touch updated_at triggers
DROP TRIGGER IF EXISTS trg_businesses_updated_at ON public.businesses;
CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_activities_updated_at ON public.activities;
CREATE TRIGGER trg_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_admins_updated_at ON public.admins;
CREATE TRIGGER trg_admins_updated_at
  BEFORE UPDATE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Activity ownership triggers
DROP TRIGGER IF EXISTS trg_activities_set_owner_ins ON public.activities;
CREATE TRIGGER trg_activities_set_owner_ins
  BEFORE INSERT ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.set_activity_owner();

DROP TRIGGER IF EXISTS trg_activities_set_owner_upd ON public.activities;
CREATE TRIGGER trg_activities_set_owner_upd
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.set_activity_owner();

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Clear existing policies
DROP POLICY IF EXISTS "businesses_policies" ON public.businesses;
DROP POLICY IF EXISTS "activities_policies" ON public.activities;
DROP POLICY IF EXISTS "admins_policies" ON public.admins;

-- Businesses policies
CREATE POLICY "businesses_owner_crud" ON public.businesses
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "businesses_admin_read" ON public.businesses
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Activities policies
CREATE POLICY "activities_owner_crud" ON public.activities
  FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "activities_admin_read" ON public.activities
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "activities_public_read" ON public.activities
  FOR SELECT TO public
  USING (status = 'published');

-- Admins policies
CREATE POLICY "admins_admin_only" ON public.admins
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================================
-- 6. RPC FUNCTIONS
-- ============================================================================

-- Get account and completeness
CREATE OR REPLACE FUNCTION public.get_account_and_completeness()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS
$$
DECLARE
  user_id uuid;
  business_record record;
  completeness json;
  result json;
BEGIN
  -- Get current user
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RETURN json_build_object(
      'business', null,
      'completeness', json_build_object(
        'hasBusiness', false,
        'industry', false,
        'country', false,
        'percentage', 0
      ),
      'next_step', 'signup'
    );
  END IF;

  -- Get business
  SELECT * INTO business_record
  FROM public.businesses
  WHERE owner_id = user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Calculate completeness
  IF business_record IS NULL THEN
    completeness := json_build_object(
      'hasBusiness', false,
      'industry', false,
      'country', false,
      'percentage', 0
    );
  ELSE
    completeness := json_build_object(
      'hasBusiness', true,
      'industry', business_record.industry IS NOT NULL AND business_record.industry != '',
      'country', business_record.country IS NOT NULL AND business_record.country != '',
      'percentage', COALESCE(business_record.profile_completeness, 0)
    );
  END IF;

  -- Build result
  result := json_build_object(
    'business', CASE WHEN business_record IS NULL THEN null ELSE to_json(business_record) END,
    'completeness', completeness,
    'next_step', CASE
      WHEN business_record IS NULL THEN 'signup'
      WHEN NOT business_record.is_active THEN 'approval'
      WHEN COALESCE(business_record.profile_completeness, 0) < 80 THEN 'complete_profile'
      ELSE 'dashboard'
    END
  );

  RETURN result;
END;
$$;

-- Get my business
CREATE OR REPLACE FUNCTION public.get_my_business()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS
$$
DECLARE
  user_id uuid;
  business_record record;
BEGIN
  -- Get current user
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RETURN json_build_object('business', null);
  END IF;

  -- Get latest business
  SELECT * INTO business_record
  FROM public.businesses
  WHERE owner_id = user_id
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN json_build_object(
    'business', CASE WHEN business_record IS NULL THEN null ELSE to_json(business_record) END
  );
END;
$$;

-- ============================================================================
-- 7. PERMISSIONS
-- ============================================================================

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT SELECT ON public.activities TO anon;
GRANT SELECT ON public.accounts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admins TO authenticated;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_and_completeness() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_business() TO authenticated;

-- ============================================================================
-- 8. BACKFILL EXISTING DATA
-- ============================================================================

-- Backfill activities created_by if needed
UPDATE public.activities a
SET created_by = b.owner_id
FROM public.businesses b
WHERE a.business_id = b.id
  AND a.created_by IS NULL;

-- ============================================================================
-- 9. VERIFICATION
-- ============================================================================

-- Verify tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'businesses') THEN
    RAISE EXCEPTION 'businesses table not created';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities') THEN
    RAISE EXCEPTION 'activities table not created';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') THEN
    RAISE EXCEPTION 'admins table not created';
  END IF;
  RAISE NOTICE 'All tables created successfully';
END $$;
