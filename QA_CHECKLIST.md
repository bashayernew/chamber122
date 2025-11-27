# QA Checklist - Supabase Removal & Backend Migration

## Pre-Testing Setup

- [ ] Run `npm install` to ensure all dependencies are installed
- [ ] Start server: `npm run dev`
- [ ] Verify server starts on `http://localhost:4000`
- [ ] Check console for server startup messages

## 1. Zero Supabase References

### Console Check
- [ ] Open browser DevTools Console
- [ ] Navigate to `http://localhost:4000`
- [ ] **PASS**: No errors about `supabase-client.js` 404
- [ ] **PASS**: No errors about `SUPABASE_URL` undefined
- [ ] **PASS**: No errors about `ERR_NAME_NOT_RESOLVED` for Supabase URLs

### Network Tab Check
- [ ] Open DevTools Network tab
- [ ] Refresh page
- [ ] **PASS**: No requests to `*.supabase.co`
- [ ] **PASS**: No requests to `esm.sh/@supabase`
- [ ] **PASS**: All API calls go to `/api/*` endpoints

### Source Code Check
- [ ] Search codebase: `grep -r "supabase-client" *.html *.js | grep -v test- | grep -v debug-`
- [ ] **PASS**: No results (or only in test files)
- [ ] Search codebase: `grep -r "SUPABASE_URL\|SUPABASE_ANON" *.html *.js | grep -v test- | grep -v debug-`
- [ ] **PASS**: No results (or only in test files)

## 2. No 404 Spam in Console

### Header Auth Slot Test
- [ ] Navigate to `http://localhost:4000`
- [ ] Open Console
- [ ] **PASS**: See initial `[header-auth-slot]` log messages
- [ ] **PASS**: See ONE call to `/api/auth/me` (not repeated)
- [ ] **PASS**: If backend unavailable (404), see ONE warning then STOP
- [ ] **PASS**: No infinite polling/retrying

### Wait Test
- [ ] Wait 10 seconds on page
- [ ] **PASS**: No repeated 404 errors
- [ ] **PASS**: No console spam

## 3. Signup Flow Works

### Navigate to Signup
- [ ] Go to `http://localhost:4000/auth.html#signup`
- [ ] **PASS**: Page loads without errors
- [ ] **PASS**: Form fields are visible

### Fill Signup Form
- [ ] Enter email: `test@example.com`
- [ ] Enter password: `test123`
- [ ] Fill business information:
  - Business name: `Test Business`
  - Description: `Test description`
  - Country: `Kuwait`
  - City: `Kuwait City`
  - Phone: `12345678`
  - WhatsApp: `12345678`
- [ ] Upload logo (optional)
- [ ] Upload gallery images (optional, up to 5)
- [ ] Upload required documents (optional for testing)

### Submit Signup
- [ ] Click "Create My Account"
- [ ] **PASS**: No console errors
- [ ] **PASS**: Success message OR redirect occurs
- [ ] **PASS**: Check `db.json` - user created with hashed password
- [ ] **PASS**: Check `db.json` - business created
- [ ] **PASS**: `auth-token` cookie is set

### After Signup
- [ ] **PASS**: Header shows logged-in state (email/avatar)
- [ ] **PASS**: Can navigate to other pages
- [ ] **PASS**: Session persists on refresh

## 4. Login Flow Works

### Logout First (if logged in)
- [ ] Click avatar/username in header
- [ ] Click "Log out"
- [ ] **PASS**: Redirects to auth page
- [ ] **PASS**: Header shows "Login" and "Sign Up" buttons
- [ ] **PASS**: `auth-token` cookie is cleared

### Navigate to Login
- [ ] Go to `http://localhost:4000/auth.html#login`
- [ ] **PASS**: Page loads without errors
- [ ] **PASS**: Login form is visible

### Enter Credentials
- [ ] Enter email: `test@example.com`
- [ ] Enter password: `test123`

### Submit Login
- [ ] Click "Login"
- [ ] **PASS**: No console errors
- [ ] **PASS**: Success - redirects or shows success message
- [ ] **PASS**: `auth-token` cookie is set
- [ ] **PASS**: Header shows logged-in state

## 5. Header Shows Logged-In State

### After Login/Signup
- [ ] **PASS**: Header shows user email or username
- [ ] **PASS**: Avatar/initials displayed
- [ ] **PASS**: Dropdown menu works (click avatar)
- [ ] **PASS**: "Dashboard" link works
- [ ] **PASS**: "Profile" link works
- [ ] **PASS**: "Log out" button works

### Session Persistence
- [ ] Refresh page
- [ ] **PASS**: Still logged in
- [ ] **PASS**: Header still shows logged-in state
- [ ] Close browser completely
- [ ] Reopen and navigate to site
- [ ] **PASS**: Still logged in (cookie persists)

## 6. API Endpoints Work

### Test `/api/auth/me` (Not Logged In)
```bash
curl http://localhost:4000/api/auth/me
```
- [ ] **PASS**: Returns `{"user":null}`

### Test `/api/auth/me` (After Login)
```bash
# Get cookie from browser DevTools > Application > Cookies
curl -H "Cookie: auth-token=YOUR_TOKEN" http://localhost:4000/api/auth/me
```
- [ ] **PASS**: Returns user object with email, id, etc.

### Test `/api/auth/signup`
```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@example.com","password":"test123"}'
```
- [ ] **PASS**: Returns user object and token
- [ ] **PASS**: Sets `auth-token` cookie

### Test `/api/auth/login`
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```
- [ ] **PASS**: Returns user object and token
- [ ] **PASS**: Sets `auth-token` cookie

### Test `/api/auth/logout`
```bash
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Cookie: auth-token=YOUR_TOKEN"
```
- [ ] **PASS**: Returns `{"success":true}`
- [ ] **PASS**: Clears `auth-token` cookie

## 7. Database Verification

### Check `db.json`
- [ ] File exists in project root
- [ ] Contains `users` array
- [ ] Contains `businesses` array
- [ ] **PASS**: User passwords are hashed (not plain text)
- [ ] **PASS**: User IDs are unique
- [ ] **PASS**: Business `owner_id` matches user `id`

## 8. UI/UX Verification

### Visual Consistency
- [ ] **PASS**: Signup form looks identical to before
- [ ] **PASS**: Login form looks identical to before
- [ ] **PASS**: Header auth slot looks identical to before
- [ ] **PASS**: No layout shifts
- [ ] **PASS**: No broken styles
- [ ] **PASS**: Arabic text still displays correctly

### Functionality
- [ ] **PASS**: File uploads show previews (if implemented)
- [ ] **PASS**: Form validation works
- [ ] **PASS**: Error messages display correctly
- [ ] **PASS**: Success messages display correctly
- [ ] **PASS**: Redirects work correctly

## 9. Error Handling

### Invalid Credentials
- [ ] Try logging in with wrong password
- [ ] **PASS**: Shows error message
- [ ] **PASS**: Does NOT log in
- [ ] **PASS**: Does NOT set auth cookie

### Duplicate Email Signup
- [ ] Try signing up with same email twice
- [ ] **PASS**: Shows error: "User already exists"
- [ ] **PASS**: Does NOT create duplicate user

### Invalid Email Format
- [ ] Try signing up with invalid email (e.g., `notanemail`)
- [ ] **PASS**: Shows error: "Invalid email format"

### Short Password
- [ ] Try signing up with password less than 6 characters
- [ ] **PASS**: Shows error: "Password must be at least 6 characters"

### Backend Unavailable (404)
- [ ] Stop server (`Ctrl+C`)
- [ ] Refresh page
- [ ] **PASS**: Header shows signed-out state
- [ ] **PASS**: No infinite 404 errors in console
- [ ] **PASS**: One warning message then stops

## 10. Performance

### Page Load
- [ ] **PASS**: Page loads quickly (< 2 seconds)
- [ ] **PASS**: No blocking requests
- [ ] **PASS**: API calls complete quickly

### Network Usage
- [ ] **PASS**: No unnecessary requests
- [ ] **PASS**: No duplicate API calls
- [ ] **PASS**: Polling stops when backend unavailable

## Final Verification

- [ ] All tests pass
- [ ] No console errors
- [ ] No network errors
- [ ] Signup works end-to-end
- [ ] Login works end-to-end
- [ ] Session persists correctly
- [ ] UI looks identical to before
- [ ] Zero Supabase references remain

## Notes

- Font Awesome tracking prevention warnings are browser privacy features and can be ignored
- `db.json` is created automatically on first server start
- All passwords are hashed with bcrypt
- Auth tokens are stored in httpOnly cookies (7 day expiry)
- File uploads save to `public/uploads/` directory

