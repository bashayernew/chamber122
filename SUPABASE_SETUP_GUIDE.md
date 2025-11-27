# Supabase Configuration Setup Guide

## ⚠️ Current Issue
The Supabase URL `gidbvemmqffogakcepka.supabase.co` cannot be resolved (DNS error). You need to update it with your actual Supabase project URL.

## Step 1: Get Your Supabase Credentials

1. **Go to Supabase Dashboard**: https://app.supabase.com
2. **Select your project** (or create a new one)
3. **Go to Settings** → **API**
4. **Copy the following**:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Step 2: Update Configuration Files

You need to update the Supabase URL and key in these main files:

### Primary Configuration Files:
1. `public/js/supabase-client.global.js` - Line 5
2. `assets/js/supabase-client.global.js` - Line 7
3. `js/supabase-client.global.js` - Line 4
4. `js/config.js` - Line 1

### HTML Files (if they have inline config):
- `events.html` - Lines 5-6
- `index.html` - Check for meta tags or script tags
- Other HTML files that set `window.SUPABASE_URL`

## Step 3: Quick Update Script

Run this PowerShell command to find all files with the old URL:

```powershell
Get-ChildItem -Recurse -Include *.js,*.html | Select-String "gidbvemmqffogakcepka" | Select-Object Path, LineNumber
```

## Step 4: Manual Update

Replace in all files:
- **Old URL**: `https://gidbvemmqffogakcepka.supabase.co`
- **New URL**: `https://YOUR-PROJECT-ID.supabase.co`

- **Old Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZGJ2ZW1tcWZmb2dha2NlcGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NjI0MTUsImV4cCI6MjA3MjMzODQxNX0.rFFi4gq5ZUApmJM_FM5nfGpcPCHy9FLedVwmJOEzV1w`
- **New Key**: Your actual anon key from Supabase dashboard

## Step 5: Verify

1. Open your Supabase project URL in browser - it should load
2. Test the connection by refreshing your events page
3. Check browser console for any remaining errors

## Need Help?

If you don't have a Supabase project:
1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in project details
4. Wait for project to be created
5. Follow steps above to update configuration








