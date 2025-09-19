-- Fix Schema Issues Migration
-- This migration fixes various schema issues including admins table recursion

-- Drop problematic admins table if it exists and recreate it properly
DROP TABLE IF EXISTS public.admins CASCADE;

-- Create admins table with proper structure
CREATE TABLE IF NOT EXISTS public.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for admins
CREATE POLICY "Admins can view all admins"
ON public.admins
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.admins WHERE user_id = auth.uid()
));

CREATE POLICY "Super admins can manage admins"
ON public.admins
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.admins 
  WHERE user_id = auth.uid() AND role = 'super_admin'
));

-- Ensure accounts table exists and has proper structure
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

-- Enable RLS for accounts
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Create accounts policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accounts' AND policyname = 'accounts_owner_select') THEN
    CREATE POLICY "accounts_owner_select" ON public.accounts FOR SELECT USING (auth.uid() = owner_user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accounts' AND policyname = 'accounts_owner_update') THEN
    CREATE POLICY "accounts_owner_update" ON public.accounts FOR UPDATE USING (auth.uid() = owner_user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accounts' AND policyname = 'accounts_public_select') THEN
    CREATE POLICY "accounts_public_select" ON public.accounts FOR SELECT USING (status = 'approved');
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_owner_user_id ON public.accounts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON public.accounts(status);
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON public.admins(user_id);
