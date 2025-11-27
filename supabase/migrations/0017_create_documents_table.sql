-- Create documents table for user signup documents
-- This table stores documents submitted during user signup (civil_id_front, civil_id_back, owner_proof)

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('civil_id_front', 'civil_id_back', 'owner_proof')),
  file_url text NOT NULL,
  file_name text,
  file_size bigint,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_business_id ON public.documents(business_id);
CREATE INDEX IF NOT EXISTS idx_documents_kind ON public.documents(kind);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
-- Users can read their own documents
CREATE POLICY "users_read_own_documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own documents
CREATE POLICY "users_insert_own_documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own documents
CREATE POLICY "users_update_own_documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can read all documents
CREATE POLICY "admins_read_all_documents" ON public.documents
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

