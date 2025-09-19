-- Activities Table Migration
-- This migration creates the activities table for business activities/announcements

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

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Create policies for activities
CREATE POLICY "Anyone can view published activities"
ON public.activities
FOR SELECT
TO public
USING (status = 'published');

CREATE POLICY "Authenticated users can insert activities"
ON public.activities
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own activities"
ON public.activities
FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR business_id IN (
  SELECT id FROM accounts WHERE owner_user_id = auth.uid()
));

CREATE POLICY "Users can delete their own activities"
ON public.activities
FOR DELETE
TO authenticated
USING (created_by = auth.uid() OR business_id IN (
  SELECT id FROM accounts WHERE owner_user_id = auth.uid()
));

-- Create index for performance
CREATE INDEX idx_activities_status ON public.activities(status);
CREATE INDEX idx_activities_business_id ON public.activities(business_id);
CREATE INDEX idx_activities_created_by ON public.activities(created_by);
CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);
