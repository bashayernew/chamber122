-- Add business_id and created_by columns to events table if they don't exist
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add created_by column to bulletins table if it doesn't exist (business_id already exists as owner_business_id)
ALTER TABLE public.bulletins 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Function to auto-set business_id and created_by for events
CREATE OR REPLACE FUNCTION auto_set_events_business_id()
RETURNS TRIGGER AS $$
DECLARE
  user_business_id uuid;
BEGIN
  -- Set created_by if not provided
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  
  -- If business_id already provided, keep it
  IF NEW.business_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Look up the business where owner_id = auth.uid()
  SELECT id INTO user_business_id 
  FROM public.businesses 
  WHERE owner_id = auth.uid()
  LIMIT 1;
  
  -- If no business found, raise error
  IF user_business_id IS NULL THEN
    RAISE EXCEPTION 'No business found for the current user. Create your business profile first.';
  END IF;
  
  -- Set the business_id
  NEW.business_id = user_business_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-set owner_business_id and created_by for bulletins
CREATE OR REPLACE FUNCTION auto_set_bulletins_business_id()
RETURNS TRIGGER AS $$
DECLARE
  user_business_id uuid;
BEGIN
  -- Set created_by if not provided
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  
  -- If owner_business_id already provided, keep it
  IF NEW.owner_business_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Look up the business where owner_id = auth.uid()
  SELECT id INTO user_business_id 
  FROM public.businesses 
  WHERE owner_id = auth.uid()
  LIMIT 1;
  
  -- If no business found, raise error
  IF user_business_id IS NULL THEN
    RAISE EXCEPTION 'No business found for the current user. Create your business profile first.';
  END IF;
  
  -- Set the owner_business_id
  NEW.owner_business_id = user_business_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for events table
DROP TRIGGER IF EXISTS trigger_auto_set_events_business_id ON public.events;
CREATE TRIGGER trigger_auto_set_events_business_id
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_events_business_id();

-- Create triggers for bulletins table
DROP TRIGGER IF EXISTS trigger_auto_set_bulletins_business_id ON public.bulletins;
CREATE TRIGGER trigger_auto_set_bulletins_business_id
  BEFORE INSERT ON public.bulletins
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_bulletins_business_id();

-- Update RLS policies for events to use business_id
DROP POLICY IF EXISTS "Users can view events by business" ON public.events;
DROP POLICY IF EXISTS "Users can insert events" ON public.events;
DROP POLICY IF EXISTS "Users can update events" ON public.events;
DROP POLICY IF EXISTS "Users can delete events" ON public.events;

-- Events RLS policies
CREATE POLICY "Users can view their own events" ON public.events
  FOR SELECT USING (
    created_by = auth.uid() OR 
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Public can view published events" ON public.events
  FOR SELECT USING (status = 'published');

CREATE POLICY "Users can insert their own events" ON public.events
  FOR INSERT WITH CHECK (
    created_by = auth.uid() OR 
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can update their own events" ON public.events
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can delete their own events" ON public.events
  FOR DELETE USING (
    created_by = auth.uid() OR 
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- Update bulletins RLS policies to include business_id check
DROP POLICY IF EXISTS "Providers can view their own bulletins" ON public.bulletins;
DROP POLICY IF EXISTS "Providers can insert their own bulletins" ON public.bulletins;
DROP POLICY IF EXISTS "Providers can update their own bulletins" ON public.bulletins;
DROP POLICY IF EXISTS "Providers can delete their own bulletins" ON public.bulletins;

-- Bulletins RLS policies
CREATE POLICY "Users can view their own bulletins" ON public.bulletins
  FOR SELECT USING (
    owner_user_id = auth.uid() OR 
    owner_business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Public can view published bulletins" ON public.bulletins
  FOR SELECT USING (status = 'published');

CREATE POLICY "Users can insert their own bulletins" ON public.bulletins
  FOR INSERT WITH CHECK (
    owner_user_id = auth.uid() AND
    (owner_business_id IS NULL OR owner_business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  );

CREATE POLICY "Users can update their own bulletins" ON public.bulletins
  FOR UPDATE USING (
    owner_user_id = auth.uid() OR 
    owner_business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can delete their own bulletins" ON public.bulletins
  FOR DELETE USING (
    owner_user_id = auth.uid() OR 
    owner_business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_business_id ON public.events(business_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_bulletins_owner_business_id ON public.bulletins(owner_business_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_created_by ON public.bulletins(created_by);
