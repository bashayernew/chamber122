# Signup/Login Test Checklist

## Prerequisites
1. ✅ Install dependencies: `npm install`
2. ✅ Start server: `npm run dev`
3. ✅ Server should be running on `http://localhost:4000`

## Test Signup Flow

### 1. Navigate to Signup Page
- [ ] Go to `http://localhost:4000/auth.html#signup`
- [ ] Page loads without errors
- [ ] No console errors about Supabase
- [ ] Form fields are visible and functional

### 2. Fill Signup Form
- [ ] Enter email (e.g., `test@example.com`)
- [ ] Enter password (at least 6 characters)
- [ ] Fill business information fields:
  - Business name
  - Description
  - Country, City, Area, Block, Street, Floor, Office No
  - Phone, WhatsApp
  - Industry
- [ ] Upload logo (optional)
- [ ] Upload gallery images (up to 5, optional)
- [ ] Upload required documents:
  - Business License
  - Articles of Incorporation
  - Signature Authorization
  - IBAN Certificate

### 3. Submit Signup
- [ ] Click "Create My Account" button
- [ ] No console errors
- [ ] Success message appears OR redirects to owner page
- [ ] Check `db.json` file - user should be created
- [ ] Check `db.json` file - business should be created

### 4. Verify Account Creation
- [ ] Check browser cookies - `auth-token` cookie should be set
- [ ] User should be logged in automatically
- [ ] Header should show user email/avatar
- [ ] Redirect to `/owner.html?businessId={id}` (if implemented)

## Test Login Flow

### 1. Logout First (if logged in)
- [ ] Click avatar/username in header
- [ ] Click "Log out"
- [ ] Should redirect to auth page
- [ ] Header should show "Login" and "Sign Up" buttons

### 2. Navigate to Login Page
- [ ] Go to `http://localhost:4000/auth.html#login`
- [ ] Page loads without errors
- [ ] No console errors about Supabase
- [ ] Login form is visible

### 3. Enter Credentials
- [ ] Enter email used during signup
- [ ] Enter password used during signup

### 4. Submit Login
- [ ] Click "Login" button
- [ ] No console errors
- [ ] Success - should redirect or show success message
- [ ] Check browser cookies - `auth-token` cookie should be set
- [ ] Header should show user email/avatar
- [ ] User should be logged in

## Test Session Persistence

### 1. After Login
- [ ] Refresh the page
- [ ] User should remain logged in
- [ ] Header should still show user email/avatar
- [ ] `auth-token` cookie should still be present

### 2. Close and Reopen Browser
- [ ] Close browser completely
- [ ] Reopen and navigate to `http://localhost:4000`
- [ ] User should still be logged in (cookie persists)
- [ ] Header should show user email/avatar

## Test Error Handling

### 1. Invalid Credentials
- [ ] Try logging in with wrong password
- [ ] Should show error message
- [ ] Should NOT log in
- [ ] Should NOT set auth cookie

### 2. Duplicate Email Signup
- [ ] Try signing up with same email twice
- [ ] Should show error: "User already exists"
- [ ] Should NOT create duplicate user

### 3. Invalid Email Format
- [ ] Try signing up with invalid email (e.g., `notanemail`)
- [ ] Should show error: "Invalid email format"

### 4. Short Password
- [ ] Try signing up with password less than 6 characters
- [ ] Should show error: "Password must be at least 6 characters"

## Test API Endpoints Directly

### 1. Check `/api/auth/me` (Not Logged In)
```bash
curl http://localhost:4000/api/auth/me
```
- [ ] Should return: `{"user":null}`

### 2. Check `/api/auth/me` (After Login)
```bash
# Use browser DevTools Network tab to copy cookie
curl -H "Cookie: auth-token=YOUR_TOKEN" http://localhost:4000/api/auth/me
```
- [ ] Should return user object with email, id, etc.

## Verify No Supabase References

### 1. Check Console
- [ ] Open browser DevTools Console
- [ ] No errors about `supabase-client.js` 404
- [ ] No errors about `SUPABASE_URL`
- [ ] No errors about `ERR_NAME_NOT_RESOLVED` for Supabase URLs

### 2. Check Network Tab
- [ ] No requests to `*.supabase.co`
- [ ] No requests to `esm.sh/@supabase`
- [ ] All API calls go to `/api/*` endpoints

### 3. Check Source Files
- [ ] No `<script>` tags loading Supabase
- [ ] No `import` statements importing Supabase
- [ ] No `window.SUPABASE_URL` or `window.SUPABASE_ANON_KEY`

## Database Verification

### 1. Check `db.json`
- [ ] File exists in project root
- [ ] Contains `users` array with created users
- [ ] Contains `businesses` array with created businesses
- [ ] User passwords are hashed (not plain text)
- [ ] User IDs are unique

## UI/UX Verification

### 1. Visual Consistency
- [ ] Signup form looks identical to before
- [ ] Login form looks identical to before
- [ ] Header auth slot looks identical to before
- [ ] No layout shifts or broken styles
- [ ] Arabic text still displays correctly

### 2. Functionality
- [ ] File uploads show previews
- [ ] Form validation works
- [ ] Error messages display correctly
- [ ] Success messages display correctly
- [ ] Redirects work correctly

## Notes
- Font Awesome tracking prevention warnings are browser privacy features and can be ignored
- `db.json` is created automatically on first server start
- All passwords are hashed with bcrypt
- Auth tokens are stored in httpOnly cookies (7 day expiry)

