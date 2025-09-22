-- Migration: Add triggers to automatically set business_id for events and bulletins
-- This ensures that when users create events/bulletins, their business_id is automatically set

-- First, let's update the events table to match the bulletins schema
-- Add missing columns to events table if they don't exist
DO $$ 
BEGIN
    -- Add business_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'business_id') THEN
        ALTER TABLE public.events ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;
    END IF;
    
    -- Add owner_id column if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'owner_id') THEN
        ALTER TABLE public.events ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'created_by') THEN
        ALTER TABLE public.events ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Rename columns to match the expected schema
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'events' AND column_name = 'starts_at') THEN
        ALTER TABLE public.events RENAME COLUMN starts_at TO start_at;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'events' AND column_name = 'ends_at') THEN
        ALTER TABLE public.events RENAME COLUMN ends_at TO end_at;
    END IF;
    
    -- Add is_published column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'is_published') THEN
        ALTER TABLE public.events ADD COLUMN is_published boolean DEFAULT false;
    END IF;
END $$;

-- Update bulletins table to add created_by column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bulletins' AND column_name = 'created_by') THEN
        ALTER TABLE public.bulletins ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Function to automatically set business_id and created_by for events
CREATE OR REPLACE FUNCTION auto_set_event_business_id()
RETURNS TRIGGER AS $$
DECLARE
    user_business_id uuid;
BEGIN
    -- Set created_by if not provided
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    
    -- Set owner_id if not provided
    IF NEW.owner_id IS NULL THEN
        NEW.owner_id = auth.uid();
    END IF;
    
    -- If business_id is already provided, keep it
    IF NEW.business_id IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Look up business_id for the current user
    SELECT id INTO user_business_id 
    FROM public.businesses 
    WHERE owner_id = auth.uid();
    
    -- If no business found, raise an error
    IF user_business_id IS NULL THEN
        RAISE EXCEPTION 'No business found for the current user. Create your business profile first.';
    END IF;
    
    -- Set the business_id
    NEW.business_id = user_business_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically set business_id and created_by for bulletins
CREATE OR REPLACE FUNCTION auto_set_bulletin_business_id()
RETURNS TRIGGER AS $$
DECLARE
    user_business_id uuid;
BEGIN
    -- Set created_by if not provided
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    
    -- Set owner_user_id if not provided
    IF NEW.owner_user_id IS NULL THEN
        NEW.owner_user_id = auth.uid();
    END IF;
    
    -- If owner_business_id is already provided, keep it
    IF NEW.owner_business_id IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Look up business_id for the current user
    SELECT id INTO user_business_id 
    FROM public.businesses 
    WHERE owner_id = auth.uid();
    
    -- If no business found, raise an error
    IF user_business_id IS NULL THEN
        RAISE EXCEPTION 'No business found for the current user. Create your business profile first.';
    END IF;
    
    -- Set the owner_business_id
    NEW.owner_business_id = user_business_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for events
DROP TRIGGER IF EXISTS trigger_auto_set_event_business_id ON public.events;
CREATE TRIGGER trigger_auto_set_event_business_id
    BEFORE INSERT ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_event_business_id();

-- Create triggers for bulletins
DROP TRIGGER IF EXISTS trigger_auto_set_bulletin_business_id ON public.bulletins;
CREATE TRIGGER trigger_auto_set_bulletin_business_id
    BEFORE INSERT ON public.bulletins
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_bulletin_business_id();

-- Update RLS policies for events to use the new schema
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "events_select_policy" ON public.events;
DROP POLICY IF EXISTS "events_insert_policy" ON public.events;
DROP POLICY IF EXISTS "events_update_policy" ON public.events;
DROP POLICY IF EXISTS "events_delete_policy" ON public.events;

-- Create new RLS policies for events
CREATE POLICY "events_select_policy" ON public.events
    FOR SELECT USING (
        -- Owners can see their own events
        owner_id = auth.uid() OR
        -- Public can see published events
        is_published = true
    );

CREATE POLICY "events_insert_policy" ON public.events
    FOR INSERT WITH CHECK (
        -- Users can only insert events for themselves
        owner_id = auth.uid() AND
        created_by = auth.uid()
    );

CREATE POLICY "events_update_policy" ON public.events
    FOR UPDATE USING (
        -- Users can only update their own events
        owner_id = auth.uid()
    ) WITH CHECK (
        -- Ensure they can't change ownership
        owner_id = auth.uid()
    );

CREATE POLICY "events_delete_policy" ON public.events
    FOR DELETE USING (
        -- Users can only delete their own events
        owner_id = auth.uid()
    );

-- Update RLS policies for bulletins (ensure they're using the correct column names)
DROP POLICY IF EXISTS "Providers can view their own bulletins" ON public.bulletins;
DROP POLICY IF EXISTS "Providers can insert their own bulletins" ON public.bulletins;
DROP POLICY IF EXISTS "Providers can update their own bulletins" ON public.bulletins;
DROP POLICY IF EXISTS "Providers can delete their own bulletins" ON public.bulletins;
DROP POLICY IF EXISTS "Public can view published bulletins" ON public.bulletins;

-- Create simplified RLS policies for bulletins
CREATE POLICY "bulletins_select_policy" ON public.bulletins
    FOR SELECT USING (
        -- Owners can see their own bulletins
        owner_user_id = auth.uid() OR
        -- Public can see published bulletins
        status = 'published'
    );

CREATE POLICY "bulletins_insert_policy" ON public.bulletins
    FOR INSERT WITH CHECK (
        -- Users can only insert bulletins for themselves
        owner_user_id = auth.uid() AND
        created_by = auth.uid()
    );

CREATE POLICY "bulletins_update_policy" ON public.bulletins
    FOR UPDATE USING (
        -- Users can only update their own bulletins
        owner_user_id = auth.uid()
    ) WITH CHECK (
        -- Ensure they can't change ownership
        owner_user_id = auth.uid()
    );

CREATE POLICY "bulletins_delete_policy" ON public.bulletins
    FOR DELETE USING (
        -- Users can only delete their own bulletins
        owner_user_id = auth.uid()
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_owner_id ON public.events(owner_id);
CREATE INDEX IF NOT EXISTS idx_events_business_id ON public.events(business_id);
CREATE INDEX IF NOT EXISTS idx_events_is_published ON public.events(is_published);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON public.events(start_at);

-- Add comments for documentation
COMMENT ON FUNCTION auto_set_event_business_id() IS 'Automatically sets business_id and created_by for events based on the current user';
COMMENT ON FUNCTION auto_set_bulletin_business_id() IS 'Automatically sets owner_business_id and created_by for bulletins based on the current user';
