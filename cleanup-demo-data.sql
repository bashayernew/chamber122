-- Clean Demo Data SQL Script
-- WARNING: This will permanently delete all demo data!

-- First, identify demo users by email
-- You'll need to get their user IDs from the auth.users table

-- Step 1: Delete demo events (replace with actual user IDs)
DELETE FROM events 
WHERE business_id IN (
    SELECT id FROM businesses 
    WHERE owner_id IN (
        SELECT id FROM auth.users 
        WHERE email IN ('admin@demo.com', 'pending@demo.com', 'approved@demo.com')
    )
);

-- Step 2: Delete demo bulletins
DELETE FROM bulletins 
WHERE business_id IN (
    SELECT id FROM businesses 
    WHERE owner_id IN (
        SELECT id FROM auth.users 
        WHERE email IN ('admin@demo.com', 'pending@demo.com', 'approved@demo.com')
    )
);

-- Step 3: Delete demo businesses
DELETE FROM businesses 
WHERE owner_id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('admin@demo.com', 'pending@demo.com', 'approved@demo.com')
);

-- Step 4: Delete demo users (this should cascade delete their data)
-- Note: You may need to use the Supabase Admin API for this
-- DELETE FROM auth.users 
-- WHERE email IN ('admin@demo.com', 'pending@demo.com', 'approved@demo.com');

-- Alternative: Clean all events and bulletins (nuclear option)
-- DELETE FROM events;
-- DELETE FROM bulletins;

-- Check remaining data
SELECT 'events' as table_name, COUNT(*) as count FROM events
UNION ALL
SELECT 'bulletins' as table_name, COUNT(*) as count FROM bulletins
UNION ALL
SELECT 'businesses' as table_name, COUNT(*) as count FROM businesses;
