-- Guest Moderation Tables Migration
-- This migration creates tables for guest submissions that require moderation

-- Create event_suggestions table
CREATE TABLE IF NOT EXISTS public.event_suggestions (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  date date NOT NULL,
  location text,
  description text,
  submitter_email text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

-- Create bulletin_submissions table  
CREATE TABLE IF NOT EXISTS public.bulletin_submissions (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  submitter_email text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulletin_submissions ENABLE ROW LEVEL SECURITY;

-- Anonymous insert policies (guests can only insert, not read)
CREATE POLICY "anon can insert event suggestions"
ON public.event_suggestions
FOR INSERT
TO anon
WITH CHECK (status = 'pending');

CREATE POLICY "anon can insert bulletin submissions"
ON public.bulletin_submissions
FOR INSERT
TO anon
WITH CHECK (status = 'pending');

-- Enforce pending status triggers
CREATE OR REPLACE FUNCTION enforce_pending_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.status := 'pending';
  RETURN NEW;
END $$;

CREATE TRIGGER trg_pending_event
BEFORE INSERT ON public.event_suggestions
FOR EACH ROW EXECUTE FUNCTION enforce_pending_status();

CREATE TRIGGER trg_pending_bulletin
BEFORE INSERT ON public.bulletin_submissions
FOR EACH ROW EXECUTE FUNCTION enforce_pending_status();
