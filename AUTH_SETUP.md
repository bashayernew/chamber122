# Authentication Setup Guide

This guide explains how to configure the authentication system for Chamber122.

## Supabase Configuration

### 1. Supabase Dashboard Setup

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Set the following URLs:

**Site URL:**
```
http://localhost:3000
```

**Redirect URLs:**
```
http://localhost:3000/auth-callback.html
https://yourdomain.com/auth-callback.html
```

### 2. Environment Configuration

The authentication system uses the following configuration in `js/config.js`:

```javascript
export const SUPABASE_URL = "your-supabase-url";
export const SUPABASE_ANON_KEY = "your-supabase-anon-key";
```

### 3. Authentication Flow

1. **Signup**: User creates account → receives email confirmation
2. **Email Confirmation**: User clicks link → redirected to `/auth-callback.html`
3. **Session Establishment**: Callback page exchanges code for session
4. **UI Update**: Header automatically updates to show authenticated state
5. **Redirect**: User is redirected to appropriate page (owner dashboard)

### 4. Features

- **Persistent Sessions**: User stays logged in across browser sessions
- **Auto Token Refresh**: Tokens are automatically refreshed
- **Reactive UI**: Header updates automatically when auth state changes
- **Email Confirmation**: Required for account activation
- **User Metadata**: Business information stored in user metadata

### 5. Files Added/Modified

**New Files:**
- `auth-callback.html` - Email confirmation callback page
- `js/auth-state-manager.js` - Centralized auth state management
- `js/reactive-header.js` - Reactive header component

**Modified Files:**
- `js/supabase-client.js` - Added session management options
- `js/auth-signup.js` - Updated to include email redirect
- `index.html`, `auth.html`, `owner.html` - Added auth scripts

### 6. Testing

1. Start the development server: `npm run dev`
2. Go to `http://localhost:3000/auth.html`
3. Create a new account
4. Check your email for confirmation link
5. Click the confirmation link
6. Verify you're redirected and logged in

### 7. Troubleshooting

**Common Issues:**

1. **Email not received**: Check spam folder, verify Supabase email settings
2. **Callback not working**: Ensure redirect URLs are configured in Supabase
3. **Session not persisting**: Check browser console for errors
4. **UI not updating**: Verify all auth scripts are loaded

**Debug Commands:**
```javascript
// Check current auth state
window.__signupDebug.getCurrentStep()

// Check if user is authenticated
authStateManager.isAuthenticated()

// Get current user
authStateManager.getCurrentUser()
```
