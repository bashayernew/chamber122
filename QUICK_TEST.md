# Quick Test Guide

## Step 1: Verify Your Business ID

Open browser console (F12) and run:

```javascript
const { data: u } = await supabase.auth.getUser();
const { data: biz } = await supabase
  .from('businesses')
  .select('id, owner_id')
  .eq('owner_id', u.user.id)
  .limit(1)
  .maybeSingle();
console.log('✅ My business:', biz);
```

**Expected:** You should see `{ id: 'some-uuid', owner_id: 'your-user-id' }`

If `null`, you need to create a business profile first.

---

## Step 2: Test Event Creation

### Manual Test (Via UI):
1. Go to `/events.html`
2. Click "Add Event" button
3. Fill in the form:
   - Title: `Test Event`
   - Start Date/Time: Tomorrow 2PM
   - Location: `Kuwait City`
   - Description: `This is a test event`
   - Check "Publish immediately"
4. Submit

### Console Test (Quick):
```javascript
// Import helper
const { getCurrentUserBusinessId, createActivityBase } = await import('/public/js/common-activities.js');

// Get your business ID
const businessId = await getCurrentUserBusinessId();
console.log('✅ Business ID:', businessId);

// Create test event
const event = await createActivityBase({
  type: 'event',
  business_id: businessId,
  title: 'Console Test Event',
  description: 'Created from browser console',
  location: 'Kuwait',
  start_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  end_at: null,
  contact_name: null,
  contact_email: 'test@example.com',
  contact_phone: null,
  link: null,
  cover_image_url: null,
  status: 'published',
  is_published: true
});

console.log('✅ Event created:', event);
```

### Verify:
```javascript
// Check if event appears in VIEW
const { data: events } = await supabase
  .from('activities')
  .select('*')
  .eq('kind', 'event')
  .eq('status', 'published');

console.log('✅ Published events:', events.length);
console.table(events.map(e => ({ 
  id: e.id.slice(0,8), 
  title: e.title, 
  kind: e.kind, 
  status: e.status 
})));
```

**Expected:**
- ✅ Event saved to `activities_base` with `type='event'`
- ✅ Event appears on `/events.html` (hard refresh)
- ✅ Event appears in console query above

---

## Step 3: Test Bulletin Creation

### Console Test:
```javascript
// Import helper (if not already imported)
const { getCurrentUserBusinessId, createActivityBase } = await import('/public/js/common-activities.js');

// Get your business ID
const businessId = await getCurrentUserBusinessId();

// Create test bulletin
const bulletin = await createActivityBase({
  type: 'bulletin',
  business_id: businessId,
  title: 'Console Test Bulletin',
  description: 'This is a test bulletin announcement',
  location: null,
  start_at: null,
  end_at: null,
  contact_name: null,
  contact_email: 'info@example.com',
  contact_phone: null,
  link: 'https://example.com',
  cover_image_url: null,
  status: 'published',
  is_published: true
});

console.log('✅ Bulletin created:', bulletin);
```

### Verify:
```javascript
// Check if bulletin appears in VIEW
const { data: bulletins } = await supabase
  .from('activities')
  .select('*')
  .eq('kind', 'bulletin')
  .eq('status', 'published');

console.log('✅ Published bulletins:', bulletins.length);
console.table(bulletins.map(b => ({ 
  id: b.id.slice(0,8), 
  title: b.title, 
  kind: b.kind, 
  status: b.status 
})));
```

**Expected:**
- ✅ Bulletin saved to `activities_base` with `type='bulletin'`
- ✅ Bulletin appears on `/bulletin.html` (hard refresh)
- ✅ Bulletin appears in console query above

---

## Step 4: Test Draft Creation

```javascript
// Create draft event
const draft = await createActivityBase({
  type: 'event',
  business_id: businessId,
  title: 'Draft Test Event',
  description: 'This should only appear in profile',
  location: null,
  start_at: new Date(Date.now() + 172800000).toISOString(), // 2 days from now
  end_at: null,
  contact_name: null,
  contact_email: null,
  contact_phone: null,
  link: null,
  cover_image_url: null,
  status: 'draft',
  is_published: false
});

console.log('✅ Draft created:', draft);
```

### Verify Drafts:
```javascript
const { data: myDrafts } = await supabase
  .from('activities')
  .select('*')
  .eq('business_id', businessId)
  .eq('status', 'draft');

console.log('✅ My drafts:', myDrafts.length);
console.table(myDrafts.map(d => ({ 
  title: d.title, 
  kind: d.kind, 
  status: d.status,
  is_published: d.is_published
})));
```

**Expected:**
- ✅ Draft saved
- ✅ Draft does NOT appear on public `/events.html`
- ✅ Draft ONLY appears on `/public/profile.html` (owner view)

---

## Step 5: Check All Activities

```javascript
// Your complete activity feed
const { data: allMine } = await supabase
  .from('activities')
  .select('id, kind, title, status, is_published, created_at')
  .eq('business_id', businessId)
  .order('created_at', { ascending: false });

console.log('📊 Total activities:', allMine.length);
console.table(allMine);
```

---

## Success Criteria ✅

After running all tests:

- [ ] ✅ `getCurrentUserBusinessId()` returns your business ID
- [ ] ✅ Can create events via console
- [ ] ✅ Events appear on `/events.html`
- [ ] ✅ Can create bulletins via console
- [ ] ✅ Bulletins appear on `/bulletin.html`
- [ ] ✅ Published items visible on public pages
- [ ] ✅ Drafts only visible in profile/dashboard
- [ ] ✅ All activities use `type` in base table
- [ ] ✅ VIEW exposes `kind` for reads
- [ ] ✅ Normalization works (`type ?? kind`)

---

## Troubleshooting

### "No business found"
```javascript
// Check if you have a business
const { data: { user } } = await supabase.auth.getUser();
const { data: businesses } = await supabase
  .from('businesses')
  .select('*')
  .eq('owner_id', user.id);

console.log('My businesses:', businesses);
```

If empty, create a business profile first.

### "Permission denied"
Check RLS policies allow:
- INSERT to `activities_base` for authenticated users
- SELECT from `activities` view for public (published items) and owners (all items)

### "Items not appearing"
1. Hard refresh the page (Ctrl+Shift+R)
2. Check browser console for errors
3. Verify the query:
```javascript
const { data, error } = await supabase
  .from('activities')
  .select('*')
  .eq('kind', 'event');
console.log('Query result:', { data, error });
```

---

## Quick Cleanup

```javascript
// Delete test items (BE CAREFUL!)
const { data: testItems } = await supabase
  .from('activities_base')
  .select('id, title')
  .or('title.ilike.%test%,title.ilike.%console%');

console.log('Test items to delete:', testItems);

// Uncomment to actually delete:
// const { error } = await supabase
//   .from('activities_base')
//   .delete()
//   .in('id', testItems.map(i => i.id));
// console.log('Deleted:', error ? error.message : 'Success');
```

---

**Happy testing!** 🚀

