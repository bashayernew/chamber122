-- ============================================================================
-- Activities Migration: Schema Refresh & Verification
-- ============================================================================
-- Run this script in Supabase SQL Editor after deploying the code changes
-- ============================================================================

-- Step 1: Verify activities_base table exists with type column
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'activities_base' 
  AND column_name IN ('type', 'kind', 'title', 'business_id')
ORDER BY ordinal_position;

-- Expected output should include both 'type' and 'kind' columns


-- Step 2: Verify activities view exists
SELECT 
  viewname, 
  definition 
FROM pg_views 
WHERE viewname = 'activities';

-- Expected: Should show the view definition


-- Step 3: Check current data distribution
SELECT 
  CASE 
    WHEN type IS NOT NULL THEN 'Has type'
    WHEN kind IS NOT NULL THEN 'Has kind only'
    ELSE 'Missing both'
  END as data_state,
  COALESCE(type, kind) as activity_type,
  COUNT(*) as count
FROM activities_base
GROUP BY data_state, COALESCE(type, kind)
ORDER BY count DESC;

-- This shows how many records use type vs kind


-- Step 4: Backfill type column from kind (if needed)
-- Only run this if you have existing records with kind but no type
UPDATE activities_base
SET type = kind
WHERE type IS NULL 
  AND kind IS NOT NULL;

-- Verify backfill
SELECT COUNT(*) as records_updated
FROM activities_base
WHERE type IS NOT NULL AND kind IS NOT NULL;


-- Step 5: Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_activities_base_type 
  ON activities_base(type) 
  WHERE type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_base_kind 
  ON activities_base(kind) 
  WHERE kind IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_base_status 
  ON activities_base(status);

CREATE INDEX IF NOT EXISTS idx_activities_base_is_published 
  ON activities_base(is_published);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_activities_base_type_status 
  ON activities_base(type, status, is_published) 
  WHERE type IS NOT NULL;


-- Step 6: Verify RLS policies on activities_base
SELECT 
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as check_expression
FROM pg_policies 
WHERE tablename = 'activities_base'
ORDER BY policyname;

-- Ensure policies allow:
-- - INSERT for authenticated users with their business_id
-- - SELECT for public if status='published' and is_published=true


-- Step 7: Test queries that the frontend will use

-- Test Event Query (simulates frontend read)
SELECT 
  id,
  type,
  kind,
  title,
  status,
  is_published,
  COALESCE(type, kind) as normalized_type
FROM activities
WHERE (type = 'event' OR kind = 'event')
  AND (status = 'published' OR is_published = true)
ORDER BY created_at DESC
LIMIT 5;

-- Test Bulletin Query (simulates frontend read)
SELECT 
  id,
  type,
  kind,
  title,
  status,
  is_published,
  COALESCE(type, kind) as normalized_type
FROM activities
WHERE (type = 'bulletin' OR kind = 'bulletin')
  AND (status = 'published' OR is_published = true)
ORDER BY created_at DESC
LIMIT 5;


-- Step 8: CRITICAL - Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Wait 2 seconds, then verify the cache was refreshed
-- Check your Supabase logs for "schema cache loaded" message


-- Step 9: Create test records (optional - for testing only)
-- Replace 'YOUR_BUSINESS_ID' with an actual business ID from your database

-- Test Event
INSERT INTO activities_base (
  type,
  business_id,
  title,
  description,
  location,
  start_at,
  end_at,
  status,
  is_published
) VALUES (
  'event',
  'YOUR_BUSINESS_ID',  -- Replace this
  'Test Event - Migration Check',
  'This is a test event created after migration',
  'Test Location',
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '1 day' + INTERVAL '2 hours',
  'published',
  true
) RETURNING id, type, title;

-- Test Bulletin
INSERT INTO activities_base (
  type,
  business_id,
  title,
  description,
  start_at,
  status,
  is_published
) VALUES (
  'bulletin',
  'YOUR_BUSINESS_ID',  -- Replace this
  'Test Bulletin - Migration Check',
  'This is a test bulletin created after migration',
  NOW(),
  'published',
  true
) RETURNING id, type, title;


-- Step 10: Verify test records appear in view
SELECT 
  id,
  type,
  kind,
  title,
  status,
  is_published
FROM activities
WHERE title LIKE '%Migration Check%'
ORDER BY created_at DESC;


-- Step 11: Final verification - count all activities by type
SELECT 
  COALESCE(type, kind, 'unknown') as activity_type,
  status,
  COUNT(*) as total
FROM activities
GROUP BY COALESCE(type, kind, 'unknown'), status
ORDER BY activity_type, status;


-- ============================================================================
-- Troubleshooting Queries
-- ============================================================================

-- If no results are showing:
-- 1. Check RLS is not blocking:
SELECT current_user, current_setting('request.jwt.claims', true);

-- 2. Check if table has data:
SELECT COUNT(*) FROM activities_base;

-- 3. Check if view is working:
SELECT COUNT(*) FROM activities;

-- 4. Verify indexes are being used:
EXPLAIN ANALYZE
SELECT * FROM activities
WHERE (type = 'event' OR kind = 'event')
  AND status = 'published'
LIMIT 10;


-- ============================================================================
-- Cleanup (only run if you want to remove test data)
-- ============================================================================

-- Delete test records
-- DELETE FROM activities_base WHERE title LIKE '%Migration Check%';


-- ============================================================================
-- Success Criteria
-- ============================================================================
-- ✅ activities_base table has both 'type' and 'kind' columns
-- ✅ activities view exists and returns data
-- ✅ Indexes created successfully
-- ✅ RLS policies allow appropriate access
-- ✅ Test queries return results
-- ✅ Schema cache refreshed (NOTIFY pgrst)
-- ✅ Test records created and visible
-- ============================================================================

SELECT '✅ Migration verification complete!' as status;

