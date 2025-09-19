-- Create activities table
CREATE TABLE IF NOT EXISTS public.activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    starts_at timestamptz,
    ends_at timestamptz,
    status text CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Select policy: users can only see their own activities
CREATE POLICY "Users can view their own activities" ON public.activities
    FOR SELECT USING (owner_user_id = auth.uid());

-- Insert policy: users can only insert activities for themselves
CREATE POLICY "Users can insert their own activities" ON public.activities
    FOR INSERT WITH CHECK (owner_user_id = auth.uid());

-- Update policy: users can only update their own activities
CREATE POLICY "Users can update their own activities" ON public.activities
    FOR UPDATE USING (owner_user_id = auth.uid());

-- Delete policy: users can only delete their own activities
CREATE POLICY "Users can delete their own activities" ON public.activities
    FOR DELETE USING (owner_user_id = auth.uid());

-- Create index for better performance on owner_user_id
CREATE INDEX IF NOT EXISTS idx_activities_owner_user_id ON public.activities(owner_user_id);

-- Create index for better performance on created_at (for ordering)
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at);
