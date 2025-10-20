# Quick Start Demo Guide

This guide will help you verify that all the fixes are working correctly. Follow these steps in order.

## Prerequisites

✅ Code changes have been deployed  
✅ Database schema includes `activities_base` table and `activities` view  
✅ Schema cache has been refreshed (see Step 1)

---

## Step 1: Refresh Schema Cache ⚡

**Critical First Step!**

Open Supabase SQL Editor and run:

```sql
NOTIFY pgrst, 'reload schema';
```

Wait 2-3 seconds for PostgREST to reload.

---

## Step 2: Create a Test Event 📅

1. **Navigate to:** `/events.html`
2. **Click:** "Add Event" button
3. **Fill the form:**
   - Title: `Demo Event October`
   - Date: Tomorrow
   - Time: 14:00
   - Type: `networking`
   - Location: `Chamber122 Hall`
   - Description: `This is a test event to verify the migration`
4. **Click:** "Submit" or "Create Event"

### Expected Results ✅

- ✅ Success message appears
- ✅ You're redirected to `/events.html`
- ✅ Your event appears in the events grid
- ✅ Event card shows the title, date, and location

### Verification in Database

```sql
SELECT id, type, kind, title, status, is_published
FROM activities_base
WHERE title = 'Demo Event October';
```

**Expected:** `type='event'`, `kind=NULL`, `status='published'`, `is_published=true`

---

## Step 3: View Events Page 🔍

1. **Navigate to:** `/events.html`
2. **Observe:** All published events display

### Expected Results ✅

- ✅ Events grid shows all published events
- ✅ Both new events (with `type='event'`) and old events (with `kind='event'`) appear
- ✅ Event cards display correctly with images, dates, and actions
- ✅ "Learn More" buttons work
- ✅ "Contact" buttons work

### Verification Query

```sql
-- This simulates what the frontend queries
SELECT 
  id,
  COALESCE(type, kind) as normalized_type,
  title,
  status
FROM activities
WHERE (type = 'event' OR kind = 'event')
  AND (status = 'published' OR is_published = true)
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:** Returns all your events with `normalized_type='event'`

---

## Step 4: Create a Test Bulletin 📢

1. **Navigate to:** Bulletin creation page (check your navigation)
2. **Click:** "Add Bulletin" button
3. **Fill the form:**
   - Title: `Demo Bulletin October`
   - Details: `This is a test bulletin to verify the migration`
   - Category: `Announcement`
   - Check: "Public"
   - Uncheck: "Save as draft"
4. **Click:** "Publish"

### Expected Results ✅

- ✅ Success indication
- ✅ Modal closes
- ✅ Bulletin appears in the list (if on bulletins page)

### Verification in Database

```sql
SELECT id, type, kind, title, status, is_published
FROM activities_base
WHERE title = 'Demo Bulletin October';
```

**Expected:** `type='bulletin'`, `kind=NULL`, `status='published'`, `is_published=true`

---

## Step 5: View Bulletins Page 🔍

1. **Navigate to:** `/bulletin.html`
2. **Observe:** All published bulletins display

### Expected Results ✅

- ✅ Bulletins grid shows all published bulletins
- ✅ Both new bulletins (with `type='bulletin'`) and old bulletins (with `kind='bulletin'`) appear
- ✅ Bulletin cards display correctly with category badges
- ✅ Contact buttons work
- ✅ "Learn More" links work (if provided)

### Verification Query

```sql
-- This simulates what the frontend queries
SELECT 
  id,
  COALESCE(type, kind) as normalized_type,
  title,
  status
FROM activities
WHERE (type = 'bulletin' OR kind = 'bulletin')
  AND (status = 'published' OR is_published = true)
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:** Returns all your bulletins with `normalized_type='bulletin'`

---

## Step 6: Check Profile Page (Owner View) 👤

1. **Login** as a business owner
2. **Navigate to:** `/public/profile.html`
3. **Observe:** All your activities (events + bulletins)

### Expected Results ✅

- ✅ Activity list shows both events and bulletins
- ✅ Each item shows correct type badge (Event or Bulletin)
- ✅ Status badges show correctly (Draft or Published)
- ✅ Dates format correctly
- ✅ "Edit" buttons appear

### What You Should See

- Events with calendar icon 📅
- Bulletins with megaphone icon 📢
- Clear distinction between drafts and published items
- Your newly created test event and bulletin

---

## Step 7: Check Dashboard (Admin View) 📊

1. **Login** as admin
2. **Navigate to:** `/admin-dashboard.html` or your dashboard
3. **Observe:** Statistics and counters

### Expected Results ✅

- ✅ "Total Events" counter is accurate
- ✅ "Total Bulletins" counter is accurate
- ✅ Both old records (with `kind`) and new records (with `type`) are counted
- ✅ No errors in browser console

### Verification Query

```sql
-- This simulates the dashboard count
SELECT 
  COALESCE(type, kind) as activity_type,
  COUNT(*) as total
FROM activities
GROUP BY COALESCE(type, kind);
```

**Expected:** Shows counts for `event` and `bulletin` types

---

## Step 8: Test Backward Compatibility 🔄

Let's verify that old records (with `kind` instead of `type`) still work.

### Create a Legacy-Style Record

```sql
-- Simulate an old record (kind column only)
INSERT INTO activities_base (
  kind,            -- Old column
  business_id,
  title,
  description,
  status,
  is_published
) VALUES (
  'event',
  'YOUR_BUSINESS_ID',  -- Replace with real ID
  'Legacy Test Event',
  'This simulates an old record',
  'published',
  true
) RETURNING id, type, kind, title;
```

### Expected Database State

- `type`: NULL
- `kind`: 'event'

### Expected Frontend Behavior ✅

1. **Navigate to:** `/events.html`
2. **Expected:** "Legacy Test Event" appears alongside your new events
3. **Expected:** No visual difference between old and new records

---

## Troubleshooting Common Issues 🔧

### Issue: "No events/bulletins showing"

**Solution:**
```sql
-- 1. Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- 2. Check if data exists
SELECT COUNT(*) FROM activities_base;

-- 3. Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'activities_base';
```

### Issue: "Type showing as undefined"

**Check:** Browser console for errors  
**Solution:** Clear browser cache and reload

### Issue: "Can't create events/bulletins"

**Check:** 
1. User is authenticated
2. User has a business_id
3. RLS policies allow INSERT

```sql
-- Check your business_id
SELECT id, name, owner_id FROM businesses WHERE owner_id = 'YOUR_USER_ID';
```

### Issue: "Old records not appearing"

**Check:** Query uses `.or()` for both type and kind

**Verify with:**
```sql
-- Should return both old and new records
SELECT id, type, kind, title FROM activities
WHERE (type = 'event' OR kind = 'event')
LIMIT 10;
```

---

## Verification Checklist ✅

Use this checklist to confirm everything works:

- [ ] Schema cache refreshed
- [ ] Can create a new event → appears on `/events.html`
- [ ] Can create a new bulletin → appears on `/bulletin.html`
- [ ] New event shows `type='event'` in database
- [ ] New bulletin shows `type='bulletin'` in database
- [ ] Events page shows both old (kind) and new (type) events
- [ ] Bulletins page shows both old (kind) and new (type) bulletins
- [ ] Profile page shows all activities with correct badges
- [ ] Dashboard counters are accurate
- [ ] No errors in browser console
- [ ] No errors in database logs

---

## Success! 🎉

If all the above tests pass, your migration is complete and working correctly!

### What's Next?

1. **Monitor** for 24-48 hours for any edge cases
2. **Test** with real users in a staging environment
3. **Document** any custom business logic specific to your app
4. **Consider** backfilling old records' `type` column:
   ```sql
   UPDATE activities_base SET type = kind WHERE type IS NULL AND kind IS NOT NULL;
   ```

---

## Need Help?

- Check `ACTIVITIES_MIGRATION_SUMMARY.md` for detailed technical info
- Check `SCHEMA_REFRESH_GUIDE.md` for schema cache issues
- Review browser console for JavaScript errors
- Review Supabase logs for database errors

---

**Demo completed successfully!** [[memory:6248488]]

Your application now supports:
- ✅ Creating events → stored in `activities_base` with `type='event'`
- ✅ Creating bulletins → stored in `activities_base` with `type='bulletin'`
- ✅ Viewing events on `/events.html`
- ✅ Viewing bulletins on `/bulletin.html`
- ✅ Profile and dashboard show all activities correctly
- ✅ Backward compatibility with legacy `kind` column

