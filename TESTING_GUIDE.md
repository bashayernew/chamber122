# Event Management System - Testing Guide

## 🎯 **Complete Event Creation Flow Test**

This guide will walk you through testing the complete event management system to ensure events appear correctly across all pages.

### **Prerequisites**
- Supabase client is properly configured
- You are signed in as a business owner
- Database tables exist: `events`, `bulletins`, `businesses`, `activities` (view)
- RLS policies are configured

### **Test Flow Overview**
1. Create an event in the dashboard
2. Verify it appears in the dashboard (published/drafts tabs)
3. Verify it appears on the public events page
4. Verify it appears in the profile unified feed
5. Test draft vs published behavior

---

## **Step 1: Create a Published Event**

### **URL:** `/public/dashboard-owner.html`

1. **Navigate to Dashboard**
   - Go to `/public/dashboard-owner.html`
   - Verify you see "Dashboard" header
   - Verify you see "Create Event" and "Create Bulletin" buttons

2. **Open Event Creation Form**
   - Click "Create Event" button
   - Verify modal opens with form fields

3. **Fill Required Fields**
   ```
   Title: "Chamber Networking Mixer"
   Description: "Join us for an evening of networking and business connections"
   Location: "Chamber Office, 123 Main St"
   Start Date & Time: [Set to tomorrow at 6:00 PM]
   End Date & Time: [Set to tomorrow at 8:00 PM]
   Contact Email: "events@chamber122.com"
   Contact Phone: "(555) 123-4567"
   Registration URL: "https://chamber122.com/register"
   Cover Image URL: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=500&h=300&fit=crop"
   Status: "Published"
   Make publicly visible: ✅ (checked)
   ```

4. **Submit Event**
   - Click "Create Event" button
   - Verify success toast appears: "Event created successfully!"
   - Verify modal closes
   - Verify you're switched to "Published Feed" tab

### **Expected Result:**
- Event appears in "Published Feed" tab
- Event shows with green "Published" badge
- Event shows all filled information

---

## **Step 2: Verify on Public Events Page**

### **URL:** `/public/events.html`

1. **Navigate to Events Page**
   - Go to `/public/events.html`
   - Verify page loads without errors

2. **Check Event Display**
   - Verify your event appears in the events grid
   - Verify event shows:
     - Correct title: "Chamber Networking Mixer"
     - Correct date/time
     - Correct location
     - Cover image
     - "Register" button (if registration URL provided)

3. **Test Search/Filter**
   - Search for "networking" - should find your event
   - Search for "xyz" - should not find your event
   - Filter by type - should work correctly

### **Expected Result:**
- Event appears in public events list
- All event details display correctly
- Search and filter work properly

---

## **Step 3: Verify in Profile Unified Feed**

### **URL:** `/public/profile.html`

1. **Navigate to Profile**
   - Go to `/public/profile.html`
   - Verify page loads without errors

2. **Check Activities Feed**
   - Verify your event appears in "Recent Activities"
   - Verify event shows:
     - Correct title and description
     - Event badge (not bulletin)
     - Date/time information
     - Contact and registration links
     - Green "Published" badge

### **Expected Result:**
- Event appears in profile activities feed
- Event shows as published with correct details

---

## **Step 4: Test Draft Event**

### **URL:** `/public/dashboard-owner.html`

1. **Create Draft Event**
   - Click "Create Event" button
   - Fill form with:
     ```
     Title: "Draft Training Session"
     Description: "This is a draft event"
     Start Date & Time: [Set to next week]
     Status: "Draft"
     Make publicly visible: ❌ (unchecked)
     ```
   - Submit form

2. **Verify Draft Behavior**
   - Verify you're switched to "Drafts" tab
   - Verify event appears in drafts list
   - Verify event shows yellow "Draft" badge

3. **Test Public Visibility**
   - Go to `/public/events.html`
   - Verify draft event does NOT appear
   - Go to `/public/profile.html`
   - Verify draft event does NOT appear in activities

### **Expected Result:**
- Draft appears only in dashboard drafts tab
- Draft does not appear on public pages
- Draft does not appear in profile activities

---

## **Step 5: Test Error Handling**

### **Test Required Field Validation**
1. Try to create event with empty title
2. Try to create event with empty start date
3. Verify appropriate error messages appear

### **Test Network Errors**
1. Disconnect internet
2. Try to create event
3. Verify error handling and user feedback

---

## **Acceptance Test Checklist**

### **AT1: Public Events Page** ✅
- [ ] Shows only published events (`status='published' AND is_published=true`)
- [ ] No draft events visible
- [ ] Search and filter work correctly
- [ ] No console errors

### **AT2: Published Event Flow** ✅
- [ ] Create published event in dashboard
- [ ] Event appears in dashboard "Published Feed"
- [ ] Event appears on `/public/events.html`
- [ ] Event appears on `/public/profile.html` activities
- [ ] All event details display correctly

### **AT3: Draft Event Flow** ✅
- [ ] Create draft event in dashboard
- [ ] Event appears in dashboard "Drafts" tab
- [ ] Event does NOT appear on public events page
- [ ] Event does NOT appear in profile activities
- [ ] Draft badge shows correctly

### **AT4: Error Handling** ✅
- [ ] No client errors in console
- [ ] No undefined property reads (like `charAt of undefined`)
- [ ] Form validation works
- [ ] Network errors handled gracefully
- [ ] Toast notifications work

### **AT5: Cover Images** ✅
- [ ] Cover images display correctly
- [ ] Fallback images work when no cover URL provided
- [ ] Images load without errors

---

## **Troubleshooting**

### **Common Issues:**

1. **"Please sign in to access the dashboard"**
   - Ensure you're authenticated in Supabase
   - Check that your user has a business record

2. **Events not appearing on public pages**
   - Verify RLS policies allow public read access
   - Check that `status='published'` and `is_published=true`

3. **Console errors**
   - Check browser console for JavaScript errors
   - Verify all API endpoints are working
   - Check Supabase client configuration

4. **Form submission fails**
   - Check required fields are filled
   - Verify date format is correct
   - Check network connectivity

### **Debug Steps:**
1. Open browser developer tools
2. Check Console tab for errors
3. Check Network tab for failed requests
4. Verify Supabase client is initialized
5. Check database permissions and RLS policies

---

## **Success Criteria**

✅ **All acceptance tests pass**  
✅ **No console errors**  
✅ **Events flow correctly between all pages**  
✅ **Draft vs published behavior works**  
✅ **Error handling is robust**  
✅ **UI is responsive and user-friendly**

**🎉 If all tests pass, the event management system is working correctly!**