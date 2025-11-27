-- Admin Messages System Migration
-- Allows admin to send messages to users about document issues
-- Users can respond with corrected documents

-- Create admin_messages table
CREATE TABLE IF NOT EXISTS public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  document_type text, -- e.g., 'civil_id_front', 'civil_id_back', 'owner_proof'
  status text DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create admin_message_responses table for user responses
CREATE TABLE IF NOT EXISTS public.admin_message_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.admin_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_text text,
  document_url text, -- URL to corrected document
  document_type text, -- Type of document being resubmitted
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_messages_user_id ON public.admin_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_business_id ON public.admin_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_status ON public.admin_messages(status);
CREATE INDEX IF NOT EXISTS idx_admin_message_responses_message_id ON public.admin_message_responses(message_id);

-- Enable RLS
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_message_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_messages
-- Users can read their own messages
CREATE POLICY "users_read_own_messages" ON public.admin_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all messages
CREATE POLICY "admins_read_all_messages" ON public.admin_messages
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- Admins can insert messages
CREATE POLICY "admins_insert_messages" ON public.admin_messages
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- Admins can update messages
CREATE POLICY "admins_update_messages" ON public.admin_messages
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- RLS Policies for admin_message_responses
-- Users can read responses to their messages
CREATE POLICY "users_read_own_responses" ON public.admin_message_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_messages am 
      WHERE am.id = admin_message_responses.message_id 
      AND am.user_id = auth.uid()
    )
  );

-- Users can insert responses to their messages
CREATE POLICY "users_insert_responses" ON public.admin_message_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_messages am 
      WHERE am.id = admin_message_responses.message_id 
      AND am.user_id = auth.uid()
    )
  );

-- Admins can read all responses
CREATE POLICY "admins_read_all_responses" ON public.admin_message_responses
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_admin_messages_timestamp
  BEFORE UPDATE ON public.admin_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_messages_updated_at();

