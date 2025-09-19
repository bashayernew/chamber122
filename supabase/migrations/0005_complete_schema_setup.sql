-- Complete Schema Setup Migration
-- This migration sets up all required tables and fixes all schema issues

-- Drop existing problematic tables if they exist
DROP TABLE IF EXISTS public.admins CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;

-- Create accounts table (if not exists)
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending','approved','rejected','suspended')) DEFAULT 'pending',
  name text NOT NULL,
  logo_url text,
  cover_url text,
  category text,
  tags text[] DEFAULT '{}',
  phone text,
  whatsapp text,
  email text,
  website text,
  country text DEFAULT 'Kuwait',
  city text,
  address text,
  about_short text,
  about_full text,
  gallery_urls text[] DEFAULT '{}',
  business_hours jsonb DEFAULT '{}',
  social jsonb DEFAULT '{}',
  plan text CHECK (plan IN ('free','pro','enterprise')) DEFAULT 'free',
  profile_completeness int DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create events table (if not exists)
CREATE TABLE IF NOT EXISTS public.events (
  id bigserial PRIMARY KEY,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  image_url text,
  status text CHECK (status IN ('published','draft','pending','archived')) DEFAULT 'draft',
  views_count int DEFAULT 0,
  likes_count int DEFAULT 0,
  shares_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bulletins table (if not exists)
CREATE TABLE IF NOT EXISTS public.bulletins (
  id bigserial PRIMARY KEY,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
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

-- Create activities table
CREATE TABLE IF NOT EXISTS public.activities (
  id bigserial PRIMARY KEY,
  business_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
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

-- Create content_views table (if not exists)
CREATE TABLE IF NOT EXISTS public.content_views (
  id bigserial PRIMARY KEY,
  content_type text NOT NULL CHECK (content_type IN ('event','bulletin')),
  content_id bigint NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create admins table with proper structure
CREATE TABLE IF NOT EXISTS public.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulletins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "accounts_owner_select" ON public.accounts;
DROP POLICY IF EXISTS "accounts_owner_update" ON public.accounts;
DROP POLICY IF EXISTS "accounts_public_select" ON public.accounts;
DROP POLICY IF EXISTS "events_owner_all" ON public.events;
DROP POLICY IF EXISTS "events_public_select" ON public.events;
DROP POLICY IF EXISTS "bulletins_owner_all" ON public.bulletins;
DROP POLICY IF EXISTS "bulletins_public_select" ON public.bulletins;
DROP POLICY IF EXISTS "content_views_insert" ON public.content_views;

-- Create accounts policies
CREATE POLICY "accounts_owner_select" ON public.accounts 
  FOR SELECT USING (auth.uid() = owner_user_id);

CREATE POLICY "accounts_owner_update" ON public.accounts 
  FOR UPDATE USING (auth.uid() = owner_user_id);

CREATE POLICY "accounts_public_select" ON public.accounts 
  FOR SELECT USING (status = 'approved');

CREATE POLICY "accounts_owner_insert" ON public.accounts 
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

-- Create events policies
CREATE POLICY "events_owner_all" ON public.events 
  FOR ALL USING (auth.uid() = (SELECT owner_user_id FROM accounts WHERE id = account_id));

CREATE POLICY "events_public_select" ON public.events 
  FOR SELECT USING (status = 'published');

-- Create bulletins policies
CREATE POLICY "bulletins_owner_all" ON public.bulletins 
  FOR ALL USING (auth.uid() = (SELECT owner_user_id FROM accounts WHERE id = account_id));

CREATE POLICY "bulletins_public_select" ON public.bulletins 
  FOR SELECT USING (status = 'published');

-- Create activities policies
CREATE POLICY "activities_public_select" ON public.activities 
  FOR SELECT USING (status = 'published');

CREATE POLICY "activities_owner_insert" ON public.activities 
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "activities_owner_update" ON public.activities 
  FOR UPDATE USING (created_by = auth.uid() OR business_id IN (
    SELECT id FROM accounts WHERE owner_user_id = auth.uid()
  ));

CREATE POLICY "activities_owner_delete" ON public.activities 
  FOR DELETE USING (created_by = auth.uid() OR business_id IN (
    SELECT id FROM accounts WHERE owner_user_id = auth.uid()
  ));

-- Create content_views policies
CREATE POLICY "content_views_insert" ON public.content_views 
  FOR INSERT WITH CHECK (true);

-- Create admins policies
CREATE POLICY "admins_view_own" ON public.admins 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "admins_manage" ON public.admins 
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_owner_user_id ON public.accounts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON public.accounts(status);
CREATE INDEX IF NOT EXISTS idx_events_account_id ON public.events(account_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_bulletins_account_id ON public.bulletins(account_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_status ON public.bulletins(status);
CREATE INDEX IF NOT EXISTS idx_activities_business_id ON public.activities(business_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_by ON public.activities(created_by);
CREATE INDEX IF NOT EXISTS idx_activities_status ON public.activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON public.admins(user_id);

-- Create update triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounts_updated_at 
  BEFORE UPDATE ON public.accounts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER events_updated_at 
  BEFORE UPDATE ON public.events 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bulletins_updated_at 
  BEFORE UPDATE ON public.bulletins 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER activities_updated_at 
  BEFORE UPDATE ON public.activities 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER admins_updated_at 
  BEFORE UPDATE ON public.admins 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
