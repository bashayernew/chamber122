# 🔐 Activities Ownership Migration Guide

## Overview
This migration adds proper ownership controls to the `activities` table, ensuring users can only see and manage their own activities while allowing admins to see all activities.

## What This Migration Does

### 1. **Schema Updates**
- Updates foreign key from `accounts` to `businesses` table
- Backfills `created_by` column from business owners
- Adds performance indexes

### 2. **Automatic Ownership Assignment**
- Creates triggers that automatically set `created_by` when new activities are created
- Ensures all activities have proper ownership

### 3. **Security (RLS)**
- Owners can only read/write their own activities
- Admins can read all activities
- Prevents unauthorized access

### 4. **Performance**
- Adds indexes for fast filtering by `created_by` and `created_at`

## How to Apply the Migration

### Step 1: Open the Migration Helper
1. Start your dev server: `npm run dev`
2. Open: `http://localhost:3000/apply-migration.html`
3. Log in to your Supabase account

### Step 2: Check Current State
1. Click "Check Current State" to verify database access
2. Ensure you can see activities, businesses, and accounts data

### Step 3: Apply the SQL Migration
1. Click "Show Migration SQL" to see the complete SQL
2. Copy the SQL code
3. Go to your Supabase Dashboard → SQL Editor
4. Paste and run the SQL migration
5. Wait for it to complete successfully

### Step 4: Verify the Migration
1. Go back to the migration helper
2. Click "Verify Migration" to test that everything works
3. Click "Test Activities" to ensure functionality

## Testing the Migration

### Quick Console Test
After applying the migration, test in your browser console:

```javascript
// Test activities query
const { data: { user } } = await supabase.auth.getUser();
await supabase
  .from('activities')
  .select('id,created_at,created_by')
  .eq('created_by', user.id)
  .order('created_at', { ascending: false })
  .limit(1);
```

### Test File
Open `http://localhost:3000/test-activities-ownership.html` for comprehensive testing.

## What to Expect

### Before Migration
- Activities might not have proper `created_by` values
- Users might see activities they shouldn't
- No automatic ownership assignment

### After Migration
- All activities have proper `created_by` values
- Users only see their own activities
- New activities automatically get correct ownership
- Admins can see all activities
- Better performance with indexes

## Troubleshooting

### Common Issues

1. **"Foreign key constraint" error**
   - Make sure the `businesses` table exists and has data
   - Check that `activities.business_id` values match `businesses.id`

2. **"Permission denied" error**
   - Ensure you're logged in as a user with proper permissions
   - Check that RLS policies are correctly applied

3. **"created_by is null" after migration**
   - Run the backfill query manually:
   ```sql
   UPDATE public.activities a
   SET created_by = b.owner_user_id
   FROM public.accounts b
   WHERE a.business_id = b.id AND a.created_by IS NULL;
   ```

### Rollback (if needed)
If you need to rollback the migration:

```sql
-- Remove triggers
DROP TRIGGER IF EXISTS trg_activities_set_owner_ins ON public.activities;
DROP TRIGGER IF EXISTS trg_activities_set_owner_upd ON public.activities;

-- Remove policies
DROP POLICY IF EXISTS "owner or admin read activities" ON public.activities;
DROP POLICY IF EXISTS "owner insert activities" ON public.activities;
DROP POLICY IF EXISTS "owner update activities" ON public.activities;

-- Remove indexes
DROP INDEX IF EXISTS idx_activities_created_by;
DROP INDEX IF EXISTS idx_activities_created_at;

-- Remove function
DROP FUNCTION IF EXISTS public.set_activity_owner();
DROP FUNCTION IF EXISTS public.is_admin(uuid);
```

## Frontend Compatibility

The frontend code in `owner-activities.js` already works correctly with this migration:
- ✅ Filters by `created_by` (line 62)
- ✅ Uses proper query structure
- ✅ Handles insert/update/delete operations

No frontend changes are needed!

## Next Steps

After successful migration:
1. Test the activities functionality in your app
2. Monitor query performance
3. Consider adding more admin features if needed
4. Update any documentation about activities ownership

## Support

If you encounter issues:
1. Check the Supabase logs in your dashboard
2. Verify the migration completed successfully
3. Test with the provided test files
4. Check that your user has proper permissions
