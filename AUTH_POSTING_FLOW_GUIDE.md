# Authentication & Posting Flow Guide

## Overview
This guide explains how the authentication and posting system works for Events and Bulletins in Chamber122.

## How It Works

### 1. **Authentication Required**
- Users must be **logged in** to create events and bulletins
- When not logged in, the "Add Event" and "Add Bulletin" buttons redirect to login page
- Authentication is checked using Supabase Auth

### 2. **Creating Events** 📅
When a user is logged in:
1. They can click "Add Event" on the Events page
2. Fill out the event form with:
   - Title, Description, Location
   - Start/End dates and times
   - Contact information
   - Registration URL (optional)
3. Submit the form

**Events appear on:**
- ✅ **Events Page** (`/events.html`) - Public view of all published events
- ✅ **Your Profile** (`/public/profile.html`) - Shows your business activities
- ✅ **Your Dashboard** (`/dashboard.html`) - Activity statistics
- ✅ **Business Page** - Associated with your business

### 3. **Creating Bulletins** 📢
When a user is logged in:
1. They can click "Add Bulletin" on the Bulletin page
2. Fill out the bulletin form with:
   - Title, Description
   - Category (announcements, jobs, training, funding, opportunities)
   - Company name, Contact info
   - Deadline (optional)
   - Link (optional)
3. Submit the form

**Bulletins appear on:**
- ✅ **Bulletin Page** (`/bulletin.html`) - Public view of all published bulletins
- ✅ **Your Profile** (`/public/profile.html`) - Shows your business activities
- ✅ **Your Dashboard** (`/dashboard.html`) - Activity statistics
- ✅ **Business Page** - Associated with your business

## Database Structure

Both events and bulletins are stored in the `activities` table with:
- `kind` field: either 'event' or 'bulletin'
- `status`: 'draft' or 'published'
- `is_published`: true/false
- `business_id`: Links to the user's business
- Row Level Security (RLS): Users can only edit their own content

## Code References

### Events
- **Page**: `events.html`
- **JavaScript**: `js/events.js`
- **Form Handler**: `handleEventSubmission()`
- **Database View**: `activities` (filtered by `kind='event'`)

### Bulletins
- **Page**: `bulletin.html`
- **JavaScript**: `js/bulletin.js`
- **Form Handler**: Bulletin submission handler
- **Database View**: `activities` (filtered by `kind='bulletin'`)

### Authentication
- **Client**: `js/supabase-client.js`
- **Auth Check**: `supabase.auth.getUser()`
- **Login Page**: `auth.html`

## Testing the Flow

### Demo Page
Visit: **`http://localhost:8000/test-auth-posting-demo.html`**

This interactive demo page shows:
- ✅ Current authentication status
- ✅ User information (when logged in)
- ✅ Quick links to create events/bulletins
- ✅ Test buttons to verify the system
- ✅ Complete flow diagram

### Manual Testing Steps

1. **Test Login Flow**:
   ```
   1. Open http://localhost:8000/test-auth-posting-demo.html
   2. Click "Login" button
   3. Enter credentials
   4. Return to demo page - status should show "Logged In"
   ```

2. **Test Event Creation**:
   ```
   1. Ensure you're logged in
   2. Go to Events page
   3. Click "Add Event" button
   4. Fill out and submit the form
   5. Check: Events page, Profile, Dashboard
   ```

3. **Test Bulletin Creation**:
   ```
   1. Ensure you're logged in
   2. Go to Bulletin page
   3. Click "Add Bulletin" button
   4. Fill out and submit the form
   5. Check: Bulletin page, Profile, Dashboard
   ```

## Key Features

### Authentication Guards
- ✅ Forms are hidden/disabled when not logged in
- ✅ Create buttons redirect to login if needed
- ✅ Session persistence across pages
- ✅ Automatic auth check on page load

### Real-time Updates
- ✅ New events appear immediately on events page
- ✅ New bulletins appear immediately on bulletin page
- ✅ Profile and dashboard show latest activities
- ✅ No page refresh needed (using async/await)

### Security
- ✅ Row Level Security (RLS) enforced
- ✅ Users can only edit their own content
- ✅ Published status required for public visibility
- ✅ Business ownership validated

## File Locations

### Pages
```
/events.html              - Events listing and creation
/bulletin.html            - Bulletins listing and creation
/dashboard.html           - User dashboard with stats
/public/profile.html      - User profile with activities
/auth.html               - Login/signup page
```

### JavaScript
```
/js/events.js            - Event handling logic
/js/bulletin.js          - Bulletin handling logic
/js/supabase-client.js   - Supabase authentication
/js/activities-list.js   - Activity display logic
```

### Database
```
activities table         - Stores both events and bulletins
  - kind: 'event' | 'bulletin'
  - status: 'draft' | 'published'
  - business_id: Reference to business
  - is_published: Boolean flag
```

## Troubleshooting

### "Not logged in" even after login
- Check browser console for errors
- Verify Supabase client is loaded
- Clear cookies and try again
- Check auth session in DevTools

### Events/Bulletins not appearing
- Verify `status='published'` and `is_published=true`
- Check RLS policies in Supabase
- Confirm business_id is set correctly
- Look for errors in browser console

### Form submission fails
- Check network tab for API errors
- Verify all required fields are filled
- Ensure user has active session
- Check Supabase logs

## Next Steps

1. **Add Image Upload**: Allow event/bulletin cover images
2. **Draft System**: Save drafts before publishing
3. **Edit/Delete**: Add ability to modify existing posts
4. **Notifications**: Alert users when their posts are published
5. **Analytics**: Track views and engagement

---

**Last Updated**: October 2025
**Version**: 1.0

