# Migration Files Checklist

Quick reference of all files that need modification during Supabase → Custom Backend migration.

## Files to DELETE (Supabase Client Files)

- [ ] `public/js/supabase-client.global.js`
- [ ] `assets/js/supabase-client.global.js`
- [ ] `js/supabase-client.global.js`
- [ ] `js/config.js` (or remove Supabase config from it)
- [ ] `supabase-client.js` (if exists at root)

## Files to CREATE (New Backend)

### Backend API Routes
- [ ] `/api/auth/signup.ts`
- [ ] `/api/auth/login.ts`
- [ ] `/api/auth/logout.ts`
- [ ] `/api/auth/me.ts`
- [ ] `/api/business/me.ts`
- [ ] `/api/business/upsert.ts`
- [ ] `/api/businesses/index.ts`
- [ ] `/api/businesses/[id].ts`
- [ ] `/api/events/public.ts`
- [ ] `/api/events/me.ts`
- [ ] `/api/events/index.ts`
- [ ] `/api/events/[id].ts`
- [ ] `/api/bulletins/public.ts`
- [ ] `/api/bulletins/me.ts`
- [ ] `/api/bulletins/index.ts`
- [ ] `/api/bulletins/[id].ts`

### Backend Library Files
- [ ] `lib/db.ts` (Prisma client)
- [ ] `lib/auth.ts` (JWT helpers)
- [ ] `lib/middleware.ts` (Auth middleware)

### Database
- [ ] `prisma/schema.prisma`
- [ ] `prisma/migrations/` (auto-generated)

### Frontend Helper
- [ ] `js/api.js` (NEW - unified API helper)

## Files to MODIFY (Replace Supabase Calls)

### Authentication Files
- [ ] `public/js/auth-guard.js` - Replace `supabase.auth.getSession()` with `/api/auth/me`
- [ ] `js/auth.js` - Replace auth methods with API calls
- [ ] `js/auth-login.js` - Replace login with `/api/auth/login`
- [ ] `js/auth-dev.js` - Replace dev auth helpers
- [ ] `js/signup-utils.js` - Replace OTP with API calls
- [ ] `js/require-auth.js` - Replace with API check
- [ ] `public/js/header-auth-slot.js` - Replace session check with `/api/auth/me`
- [ ] `auth.html` - Update form handlers

### API/Data Fetching Files
- [ ] `public/js/api.js` - Replace ALL `supabase.from()` calls with `fetch()`
- [ ] `js/lib/events.fetch.js` - Replace Supabase queries with `fetch()`
- [ ] `assets/js/lib/events.fetch.js` - Replace Supabase queries with `fetch()`
- [ ] `js/events.js` - Update to use new API endpoints
- [ ] `js/bulletin.js` - Update to use new API endpoints
- [ ] `assets/js/bulletins-public.js` - Update to use new API endpoints
- [ ] `public/js/events.page.js` - Update to use new API endpoints
- [ ] `public/js/bulletins.page.js` - Update to use new API endpoints
- [ ] `js/activities-list.js` - Update to use new API endpoints
- [ ] `public/js/activities-list.js` - Update to use new API endpoints

### Business Files
- [ ] `js/businesses-utils.js` - Replace with `/api/business/upsert`
- [ ] `js/directory.js` - Replace with `/api/businesses`
- [ ] `owner-form.html` - Update form submission
- [ ] `owner.html` - Update to use `/api/business/me`
- [ ] `public/js/profile.page.js` - Update business loading

### Admin Files (Optional Phase 1)
- [ ] `js/admin-review.js` - Update to use new API endpoints
- [ ] `admin-review.html` - Update API calls
- [ ] `admin-dashboard.html` - Update API calls

## HTML Files to MODIFY (Remove Supabase Scripts)

### Main Pages
- [ ] `index.html` - Remove Supabase scripts, update event/bulletin loading
- [ ] `events.html` - Remove Supabase scripts
- [ ] `bulletin.html` - Remove Supabase scripts
- [ ] `auth.html` - Remove Supabase scripts, update forms
- [ ] `auth-callback.html` - Remove/update OAuth callback logic
- [ ] `owner.html` - Remove Supabase scripts
- [ ] `owner-form.html` - Remove Supabase scripts
- [ ] `owner-activities.html` - Remove Supabase scripts
- [ ] `owner-bulletins.html` - Remove Supabase scripts
- [ ] `directory.html` - Remove Supabase scripts
- [ ] `admin-dashboard.html` - Remove Supabase scripts
- [ ] `admin-review.html` - Remove Supabase scripts

### Public Folder Pages
- [ ] `public/events.html` - Remove Supabase scripts
- [ ] `public/bulletins.html` - Remove Supabase scripts
- [ ] `public/profile.html` - Remove Supabase scripts
- [ ] `public/dashboard-owner.html` - Remove Supabase scripts
- [ ] `public/get-listed.html` - Remove Supabase scripts

## Files to SKIP (Phase 2 - Storage)

These files use Supabase storage and will be handled in Phase 2:
- `js/lib/uploads.js`
- `public/js/api.js` (uploadEventCover function)
- `js/file-upload.js`
- `js/upload-doc.js`
- `js/storage.js`
- `js/businesses-utils.js` (gallery upload section)
- `public/js/owner.gallery.js`

For Phase 1, these will store URLs only (no file uploads).

## Configuration Files to UPDATE

- [ ] `package.json` - Add dependencies: `@prisma/client`, `prisma`, `bcrypt`, `jsonwebtoken`, `cookie`
- [ ] `.env.example` - Add `DATABASE_URL`, `JWT_SECRET`
- [ ] `.gitignore` - Add `prisma/migrations/`, `.env.local`

## Test Files (Can be Deleted or Updated Later)

These test/debug files can be ignored for now or deleted:
- All `test-*.html` files
- All `debug-*.html` files
- `temp.html`

---

## Priority Order

1. **Backend Setup** (Prisma, API routes)
2. **Auth API** (signup, login, logout, me)
3. **Frontend API Helper** (`js/api.js`)
4. **Replace Auth** (auth-guard, auth.js, header-auth-slot)
5. **Replace Database Calls** (events, bulletins, businesses)
6. **Remove Supabase Scripts** (HTML files)
7. **Delete Supabase Files** (client files)

---

**Total Files to Modify**: ~50+  
**Total Files to Create**: ~20  
**Total Files to Delete**: ~5








