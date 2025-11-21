-- Create Registrations Table
-- Stores registrations for events and bulletins

-- Drop table if exists (for testing)
DROP TABLE IF EXISTS public.registrations CASCADE;

-- Create registrations table
CREATE TABLE public.registrations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    type text NOT NULL CHECK (type IN ('event', 'bulletin')),
    item_id uuid NOT NULL, -- ID of event or bulletin
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    message text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_registrations_item ON public.registrations(item_id);
CREATE INDEX idx_registrations_type ON public.registrations(type);

-- Enable RLS
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can insert a registration (public signup)
CREATE POLICY "Anyone can register" ON public.registrations
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Event/bulletin creators can view registrations for their items
CREATE POLICY "Creators can view registrations" ON public.registrations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = registrations.item_id
            AND events.business_id IN (
                SELECT id FROM public.businesses WHERE owner_id = auth.uid()
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.bulletins
            WHERE bulletins.id = registrations.item_id
            AND bulletins.business_id IN (
                SELECT id FROM public.businesses WHERE owner_id = auth.uid()
            )
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_registrations_updated_at
    BEFORE UPDATE ON public.registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.registrations IS 'Stores user registrations for events and bulletins';
COMMENT ON COLUMN public.registrations.type IS 'Type of item: event or bulletin';
COMMENT ON COLUMN public.registrations.item_id IS 'ID of the event or bulletin';
COMMENT ON COLUMN public.registrations.status IS 'Registration status: pending, approved, or rejected';









