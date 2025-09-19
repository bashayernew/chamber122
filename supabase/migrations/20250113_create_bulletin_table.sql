-- Create bulletin table for MSME providers to post announcements, jobs, training, and funding opportunities
CREATE TABLE IF NOT EXISTS public.bulletins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  
  -- Bulletin content
  type text NOT NULL CHECK (type IN ('announcement', 'job_posting', 'training', 'funding')),
  title text NOT NULL,
  description text NOT NULL,
  
  -- Optional fields
  location text,
  deadline_date timestamptz,
  attachment_url text,
  attachment_name text,
  
  -- Status and metadata
  status text NOT NULL CHECK (status IN ('draft', 'published', 'expired')) DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz,
  
  -- Search and filtering
  tags text[] DEFAULT '{}',
  
  CONSTRAINT valid_deadline CHECK (deadline_date IS NULL OR deadline_date > created_at)
);

-- Enable Row Level Security
ALTER TABLE public.bulletins ENABLE ROW LEVEL SECURITY;

-- Policies for bulletins
-- Providers can only see/manage their own bulletins
CREATE POLICY "Providers can view their own bulletins" ON public.bulletins
  FOR SELECT USING (
    auth.uid() = owner_user_id OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('provider_individual', 'provider_company')
    )
  );

CREATE POLICY "Providers can insert their own bulletins" ON public.bulletins
  FOR INSERT WITH CHECK (
    auth.uid() = owner_user_id AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('provider_individual', 'provider_company')
    )
  );

CREATE POLICY "Providers can update their own bulletins" ON public.bulletins
  FOR UPDATE USING (
    auth.uid() = owner_user_id AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('provider_individual', 'provider_company')
    )
  );

CREATE POLICY "Providers can delete their own bulletins" ON public.bulletins
  FOR DELETE USING (
    auth.uid() = owner_user_id AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('provider_individual', 'provider_company')
    )
  );

-- Public can view published bulletins
CREATE POLICY "Public can view published bulletins" ON public.bulletins
  FOR SELECT USING (status = 'published');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bulletins_owner_user_id ON public.bulletins(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_status ON public.bulletins(status);
CREATE INDEX IF NOT EXISTS idx_bulletins_type ON public.bulletins(type);
CREATE INDEX IF NOT EXISTS idx_bulletins_published_at ON public.bulletins(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulletins_deadline ON public.bulletins(deadline_date);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bulletin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_bulletins_updated_at
  BEFORE UPDATE ON public.bulletins
  FOR EACH ROW
  EXECUTE FUNCTION update_bulletin_updated_at();

-- Function to set published_at when status changes to published
CREATE OR REPLACE FUNCTION set_bulletin_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set published_at
CREATE TRIGGER set_bulletins_published_at
  BEFORE UPDATE ON public.bulletins
  FOR EACH ROW
  EXECUTE FUNCTION set_bulletin_published_at();
