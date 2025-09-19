-- Compliance Onboarding & Review System
-- Database migration for Chamber122 compliance workflow

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS public.business_verifications CASCADE;
DROP TABLE IF EXISTS public.business_documents CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.businesses CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.admins CASCADE;
DROP VIEW IF EXISTS public.v_business_verification_latest CASCADE;
DROP TYPE IF EXISTS public.verification_status CASCADE;

-- Create verification status enum
CREATE TYPE public.verification_status AS ENUM (
  'pending',
  'approved', 
  'changes_requested',
  'rejected',
  'deactivated'
);

-- Businesses table
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  industry text,
  country text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url text,
  contact_email text,
  phone text,
  whatsapp text,
  languages text[], -- e.g. ['ar','en']
  cover_url text,
  socials jsonb, -- {instagram:'', facebook:'', tiktok:'', linkedin:'', youtube:''}
  about_short text,
  about_full text,
  address text,
  service_area text,
  business_hours jsonb,
  number_of_employees integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Business documents table
CREATE TABLE IF NOT EXISTS public.business_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('license','incorporation','signature_auth','iban')),
  file_url text NOT NULL,
  file_name text,
  file_size bigint,
  uploaded_at timestamptz DEFAULT now(),
  UNIQUE (business_id, kind)
);

-- Business verifications table
CREATE TABLE IF NOT EXISTS public.business_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  status public.verification_status NOT NULL DEFAULT 'pending',
  reviewer_id uuid REFERENCES auth.users(id),
  notes text,                -- admin notes to owner
  reasons jsonb,             -- per-field reasons, e.g. {"iban":"blurry","license":"expired"}
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  kind text DEFAULT 'info' CHECK (kind IN ('info','success','warning','error')),
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Admins table
CREATE TABLE IF NOT EXISTS public.admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for businesses
CREATE POLICY "owner read/write businesses" ON public.businesses
  FOR SELECT USING (auth.uid() = owner_id)
  FOR UPDATE USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner insert business" ON public.businesses
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "admin read all businesses" ON public.businesses
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "owner read/write profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id)
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "owner insert profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "admin read all profiles" ON public.profiles
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- RLS Policies for business_documents
CREATE POLICY "owner read/write docs" ON public.business_documents
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()))
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));

CREATE POLICY "owner insert docs" ON public.business_documents
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));

CREATE POLICY "admin read all docs" ON public.business_documents
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- RLS Policies for business_verifications
CREATE POLICY "owner read verifications" ON public.business_verifications
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));

CREATE POLICY "admin manage verifications" ON public.business_verifications
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()))
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()))
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- RLS Policies for notifications
CREATE POLICY "owner read notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin read notifications" ON public.notifications
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

CREATE POLICY "system insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true); -- Allow system to insert notifications

-- RLS Policies for admins
CREATE POLICY "admin read admins" ON public.admins
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- Helper view: latest verification per business
CREATE OR REPLACE VIEW public.v_business_verification_latest AS
SELECT DISTINCT ON (business_id)
  business_id, status, reviewer_id, notes, reasons, created_at
FROM public.business_verifications
ORDER BY business_id, created_at DESC;

-- Indexes for performance
CREATE INDEX idx_businesses_owner_id ON public.businesses(owner_id);
CREATE INDEX idx_businesses_is_active ON public.businesses(is_active);
CREATE INDEX idx_business_documents_business_id ON public.business_documents(business_id);
CREATE INDEX idx_business_documents_kind ON public.business_documents(kind);
CREATE INDEX idx_business_verifications_business_id ON public.business_verifications(business_id);
CREATE INDEX idx_business_verifications_status ON public.business_verifications(status);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read_at ON public.notifications(read_at);

-- Functions for notifications
CREATE OR REPLACE FUNCTION public.notify_user(
  target_user_id uuid,
  notification_title text,
  notification_body text DEFAULT NULL,
  notification_kind text DEFAULT 'info'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, title, body, kind)
  VALUES (target_user_id, notification_title, notification_body, notification_kind)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Function to get business compliance status
CREATE OR REPLACE FUNCTION public.get_business_compliance_status(business_uuid uuid)
RETURNS TABLE (
  business_id uuid,
  status public.verification_status,
  is_active boolean,
  notes text,
  reasons jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as business_id,
    COALESCE(v.status, 'pending'::public.verification_status) as status,
    b.is_active,
    v.notes,
    v.reasons,
    COALESCE(v.created_at, b.created_at) as created_at
  FROM public.businesses b
  LEFT JOIN public.v_business_verification_latest v ON v.business_id = b.id
  WHERE b.id = business_uuid;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
