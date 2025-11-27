# Admin Dashboard - Real Data Integration

## Overview

The admin dashboard now captures **real user signups** automatically and displays them in the admin panel. No more sample data!

## How It Works

### Automatic Data Capture

When a user signs up through the signup form:
1. User fills out the signup form with business details
2. User uploads documents (Civil ID Front, Civil ID Back, Owner Proof)
3. After successful signup, the system automatically:
   - Saves user data to localStorage (`chamber122_users`)
   - Saves documents to localStorage (`chamber122_documents`)
   - Sets user status to `pending` (awaiting admin approval)

### Real-Time Updates

The admin dashboard:
- Automatically refreshes when new users sign up (if dashboard is open)
- Shows all real users who have signed up
- Displays their uploaded documents
- Allows admin to approve/reject/suspend accounts

## Testing Real Data

### Option 1: Use Real Signup Form
1. Go to the signup page (`/auth.html#signup` or `/get-listed.html`)
2. Fill out the form with test data
3. Upload documents
4. Complete signup
5. Go to admin dashboard - the new user will appear!

### Option 2: Add Test User Manually (Browser Console)

Open browser console on admin dashboard and run:

```javascript
// Import the test data helper
import('./js/admin-test-data.js').then(module => {
  // Add a test user
  const user = module.addTestUser();
  
  // Add test documents for that user
  module.addTestDocuments(user.id);
  
  // Refresh the dashboard
  adminDashboard.loadDashboardData();
});
```

Or use the global functions:
```javascript
// Add test user
addTestUser();

// Add documents for a user (replace USER_ID)
addTestDocuments('USER_ID');

// Refresh dashboard
adminDashboard.loadDashboardData();
```

## Data Storage

All data is stored in browser localStorage:

- **`chamber122_users`** - Array of user objects
- **`chamber122_documents`** - Array of document objects  
- **`chamber122_admin_messages`** - Admin messages to users
- **`admin_session`** - Admin login session

## Clearing Data

To reset all data (useful for testing):

```javascript
localStorage.removeItem('chamber122_users');
localStorage.removeItem('chamber122_documents');
localStorage.removeItem('chamber122_admin_messages');
location.reload();
```

## Document Mapping

The system maps signup document types to admin document types:

- `license` → `civil_id_front`
- `iban` → `civil_id_back`  
- `articles` → `owner_proof`
- `civil_id_front` → `civil_id_front` (direct)
- `civil_id_back` → `civil_id_back` (direct)
- `owner_proof` → `owner_proof` (direct)

## Features

✅ **Automatic capture** - No manual setup needed
✅ **Real-time updates** - Dashboard refreshes when new users sign up
✅ **Document tracking** - All uploaded documents are captured
✅ **Status management** - Approve/Reject/Suspend accounts
✅ **Messaging system** - Send messages to users about document issues

## Troubleshooting

### No users showing up?

1. **Check if users have signed up** - Go to signup page and create a test account
2. **Check browser console** - Look for `[signup-to-admin]` messages
3. **Check localStorage** - Open DevTools → Application → Local Storage → Check `chamber122_users`
4. **Refresh dashboard** - Click the "Refresh Data" button

### Documents not showing?

1. Make sure documents were uploaded during signup
2. Check browser console for document save messages
3. Verify document mapping (license → civil_id_front, etc.)
4. Check localStorage for `chamber122_documents`

### Dashboard not updating?

1. Click the "Refresh Data" button manually
2. Check if storage events are working (open in multiple tabs)
3. Reload the page

## Next Steps

1. **Test signup flow** - Create a test account through the signup form
2. **Verify data capture** - Check admin dashboard to see the new user
3. **Test admin actions** - Approve/reject accounts, send messages
4. **Monitor real signups** - All future signups will appear automatically!







