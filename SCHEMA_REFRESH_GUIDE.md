# Schema Cache Refresh Guide

## Overview

When you make changes to your Supabase database schema (tables, views, functions, triggers), PostgREST needs to reload its schema cache to recognize these changes. Without refreshing the cache, your API requests may fail or return unexpected results.

## When to Refresh the Schema Cache

You need to refresh the schema cache after:

1. **Creating or modifying views** (e.g., `activities` view)
2. **Adding or altering tables** (e.g., `activities_base` table)
3. **Changing column definitions** (e.g., adding `type` column)
4. **Modifying database functions** or triggers
5. **Updating RLS policies** or permissions

## How to Refresh the Schema Cache

### Method 1: Using SQL (Recommended)

Run this SQL command in the Supabase SQL Editor:

```sql
NOTIFY pgrst, 'reload schema';
```

This sends a notification to PostgREST to reload its schema cache immediately.

### Method 2: Via Migration File

Include the notification in your migration files:

```sql
-- Your schema changes here
CREATE OR REPLACE VIEW activities AS
  SELECT * FROM activities_base;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
```

### Method 3: Automatic Refresh (Built-in)

PostgREST automatically refreshes its schema cache every 10 seconds by default. However, for immediate testing, it's better to use Method 1.

## Common Issues and Solutions

### Issue: "relation does not exist" error

**Solution:** Refresh the schema cache using `NOTIFY pgrst, 'reload schema';`

### Issue: New columns not appearing in API responses

**Solution:** 
1. Verify the column exists: `SELECT * FROM information_schema.columns WHERE table_name = 'your_table';`
2. Refresh the schema cache
3. Check RLS policies allow reading the column

### Issue: View changes not reflected

**Solution:**
```sql
-- Recreate the view
CREATE OR REPLACE VIEW activities AS
  SELECT * FROM activities_base;

-- Refresh cache
NOTIFY pgrst, 'reload schema';
```

## Best Practices

1. **Always refresh after schema changes** during development
2. **Include refresh in migration files** for production deployments
3. **Wait a moment** after refresh before testing (1-2 seconds)
4. **Check PostgREST logs** if issues persist
5. **Verify permissions** - ensure your database role has access to new schema objects

## Verification

To verify the schema cache has been refreshed:

1. **Check the timestamp** of the last reload in PostgREST logs
2. **Test an API call** that uses the new schema
3. **Query the view** directly to ensure it's working:
   ```sql
   SELECT * FROM activities LIMIT 1;
   ```

## Example: Refreshing After Activities View Changes

If you've just created or modified the `activities` view:

```sql
-- 1. Create/modify the view
CREATE OR REPLACE VIEW activities AS
SELECT 
  id,
  type,
  kind,  -- legacy column for backward compatibility
  business_id,
  title,
  description,
  location,
  start_at,
  end_at,
  status,
  is_published,
  cover_image_url,
  created_at,
  updated_at
FROM activities_base;

-- 2. Verify view works
SELECT COUNT(*) FROM activities;

-- 3. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 4. Test with a sample query
SELECT id, type, kind FROM activities LIMIT 5;
```

## Troubleshooting Checklist

- [ ] Schema changes applied successfully?
- [ ] `NOTIFY pgrst, 'reload schema';` executed?
- [ ] RLS policies allow access to new columns?
- [ ] PostgREST service is running?
- [ ] Correct database connection string?
- [ ] Wait 1-2 seconds after refresh before testing

## Additional Resources

- [PostgREST Schema Cache Documentation](https://postgrest.org/en/stable/schema_cache.html)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)

---

**Note:** In production environments with connection pooling, you may need to refresh multiple PostgREST instances. The `NOTIFY` command will broadcast to all connected instances automatically.

