-- Create bulletins table
CREATE TABLE IF NOT EXISTS public.bulletins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('announcement', 'job', 'training', 'funding')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(100),
    deadline DATE,
    attachment_path TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bulletins_owner_user_id ON public.bulletins(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_status ON public.bulletins(status);
CREATE INDEX IF NOT EXISTS idx_bulletins_type ON public.bulletins(type);
CREATE INDEX IF NOT EXISTS idx_bulletins_created_at ON public.bulletins(created_at);

-- Enable RLS
ALTER TABLE public.bulletins ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view published bulletins
CREATE POLICY "Anyone can view published bulletins" ON public.bulletins
    FOR SELECT USING (status = 'published');

-- Users can view their own bulletins (all statuses)
CREATE POLICY "Users can view own bulletins" ON public.bulletins
    FOR SELECT USING (auth.uid() = owner_user_id);

-- Users can insert their own bulletins
CREATE POLICY "Users can insert own bulletins" ON public.bulletins
    FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

-- Users can update their own bulletins
CREATE POLICY "Users can update own bulletins" ON public.bulletins
    FOR UPDATE USING (auth.uid() = owner_user_id);

-- Users can delete their own bulletins
CREATE POLICY "Users can delete own bulletins" ON public.bulletins
    FOR DELETE USING (auth.uid() = owner_user_id);

-- Create storage bucket for bulletin attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bulletin-attachments', 'bulletin-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for bulletin attachments
CREATE POLICY "Users can upload bulletin attachments" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'bulletin-attachments' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view bulletin attachments" ON storage.objects
    FOR SELECT USING (bucket_id = 'bulletin-attachments');

CREATE POLICY "Users can update own bulletin attachments" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'bulletin-attachments' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own bulletin attachments" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'bulletin-attachments' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
