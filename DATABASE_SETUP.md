# Database Setup Guide

## Quick Fix for 404 Errors

The 404 errors you're seeing are because the database tables don't exist yet. Follow these steps to fix them:

### Step 1: Apply the Migration

1. **Go to your Supabase Dashboard**: https://app.supabase.com/
2. **Select your project**: `gidbvemmqffogakcepka`
3. **Navigate to SQL Editor**: Click on "SQL Editor" in the left sidebar
4. **Create a new query**: Click "New query"
5. **Copy and paste the migration**: Copy the entire contents of `supabase/migrations/0005_complete_schema_setup.sql`
6. **Run the migration**: Click "Run" to execute the SQL

### Step 2: Verify Tables Created

After running the migration, you should see these tables in your database:
- `accounts` - Main business accounts table
- `events` - Business events
- `bulletins` - Business announcements
- `activities` - Business activities
- `content_views` - Analytics tracking
- `admins` - Admin users

### Step 3: Test the Website

1. **Refresh your website**: Go to `http://localhost:3000`
2. **Check the console**: Should see no more 404 errors
3. **Test signup**: Try creating a new account
4. **Test directory**: Visit the directory page

## What This Migration Does

- ✅ Creates all missing tables
- ✅ Sets up proper foreign key relationships
- ✅ Configures Row Level Security (RLS) policies
- ✅ Creates performance indexes
- ✅ Sets up update triggers
- ✅ Fixes the admins table recursion issue

## Expected Results

After applying this migration:
- ✅ No more 404 errors for accounts table
- ✅ No more 500 errors for activities
- ✅ Directory page will load properly
- ✅ Signup process will work
- ✅ All database queries will succeed

## Troubleshooting

If you still see errors after applying the migration:

1. **Check the SQL Editor**: Look for any error messages in the Supabase SQL Editor
2. **Verify tables exist**: Go to "Table Editor" in Supabase to see if tables were created
3. **Check RLS policies**: Go to "Authentication" > "Policies" to verify policies were created
4. **Clear browser cache**: Hard refresh your website (Ctrl+F5)

## Need Help?

If you encounter any issues:
1. Check the Supabase SQL Editor for error messages
2. Verify your Supabase project URL and keys in `js/config.js`
3. Make sure you're running the migration in the correct project
