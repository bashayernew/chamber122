# DEV Auto-Confirm Setup Instructions

This setup enables immediate email+password signup for development (bypasses email confirmation).

## ⚠️ DEV ONLY - Remove Before Production

This system is designed for development only. **Delete the Edge Function and revert code changes before deploying to production.**

## 1. Deploy the Edge Function

```bash
# Deploy the dev-autoconfirm function
supabase functions deploy dev-autoconfirm
```

## 2. Set Required Secrets

The function needs access to your Supabase project credentials:

```bash
# Set the Supabase URL
supabase secrets set SUPABASE_URL=https://your-project-id.supabase.co

# Set the service role key (found in Supabase Dashboard > Settings > API)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## 3. Verify Function is Working

You can test the function directly:

```bash
# Test the function
curl -X POST https://your-project-id.supabase.co/functions/v1/dev-autoconfirm \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-user-id"}'
```

## 4. How It Works

1. **Frontend**: User fills signup form and clicks "Create Account"
2. **Signup**: `devSignupEmailPassword_NoMagic()` calls `supabase.auth.signUp()`
3. **Auto-Confirm**: Function calls Edge Function to confirm email immediately
4. **Sign In**: User is automatically signed in with `signInWithPassword()`
5. **Complete**: Business profile is created automatically

## 5. Files Modified

### Created:
- `supabase/functions/dev-autoconfirm/index.ts` - Edge Function

### Modified:
- `js/auth-login.js` - Added `devSignupEmailPassword_NoMagic()` helper
- `js/signup-with-documents.js` - Updated `onCreateAccount()` to use DEV helper
- `js/auth-signup.js` - Auto-completes signup after DEV confirmation

## 6. Removing DEV Changes (Before Production)

### Delete the Edge Function:
```bash
supabase functions delete dev-autoconfirm
```

### Revert Code Changes:

1. **In `js/auth-login.js`**: Delete the `devSignupEmailPassword_NoMagic()` function (lines 6-53)

2. **In `js/signup-with-documents.js`**: 
   - Remove the import: `import { devSignupEmailPassword_NoMagic } from './auth-login.js';`
   - Uncomment the original code in `onCreateAccount()` and remove the DEV block

3. **In `js/auth-signup.js`**: 
   - Remove the DEV auto-complete block and restore original alert message

### Search for these DEV markers to find all changes:
- `// DEV ONLY`
- `// Delete this function to restore default Supabase auth behavior`
- `// DEV:`

## 7. Security Notes

- The Edge Function uses the SERVICE_ROLE key, which has admin privileges
- This bypasses Supabase's email confirmation security feature
- Only use in development environments
- Never deploy this to production

## 8. Troubleshooting

### Function not found (404):
- Ensure the function is deployed: `supabase functions deploy dev-autoconfirm`
- Check the function URL in your frontend code

### Permission denied:
- Verify SERVICE_ROLE_KEY is set correctly
- Check that the key has admin privileges in Supabase Dashboard

### Auto-signin fails:
- Check browser console for errors
- Verify the user was created successfully in Supabase Dashboard > Authentication

## 9. Alternative for Production

For production, consider:
- Using Supabase's built-in email confirmation
- Implementing admin approval workflows
- Using OAuth providers (Google, GitHub, etc.)
- Custom email confirmation with your own SMTP service
