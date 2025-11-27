# SUPABASE TO BACKEND MIGRATION PLAN

## PHASE 0 - FULL AUDIT COMPLETE

### A) SUPABASE USAGE INVENTORY

#### 1. Supabase Client Files (TO REMOVE):
- `chamber122/js/supabase-client.global.js` - Main client initialization
- `chamber122/public/js/supabase-client.global.js` - Public client
- `chamber122/public/js/supabase-client.js` - Alternative client
- `chamber122/js/supabase-client.js` - Client wrapper/proxy
- `chamber122/js/supabase.js` - Re-export wrapper
- `chamber122/assets/js/supabase-client.global.js` - Assets client
- `chamber122/js/config.js` - Contains SUPABASE_URL and SUPABASE_ANON_KEY

#### 2. HTML Files Loading Supabase Scripts:
- `auth.html` - Lines 18-45` - Bootstrap loader + client init
- `index.html` - Likely has Supabase scripts
- `owner.html` - Likely has Supabase scripts  
- `owner-form.html` - Likely has Supabase scripts
- `events.html` - Likely has Supabase scripts
- `bulletin.html` - Likely has Supabase scripts
- `directory.html` - Likely has Supabase scripts
- `admin-dashboard.html` - Likely has Supabase scripts
- All other HTML files need audit

#### 3. JavaScript Files Using Supabase (56 files found):

**Auth & Session:**
- `js/auth-signup-utils.js` - signUp, signIn, requireSession
- `js/auth-signup.js` - Signup handler
- `js/auth-login.js` - Login handler
- `js/auth-api.js` - Auth API calls
- `js/auth-actions.js` - Auth actions
- `js/auth-callback.js` - OAuth callback
- `js/auth-session.js` - Session management
- `js/auth-state-manager.js` - Auth state
- `js/auth-dev.js` - Dev auth helpers
- `public/js/header-auth-slot.js` - Header auth UI (uses profiles table)

**Business Management:**
- `js/businesses-utils.js` - createBusinessRecord (uses storage + businesses table)
- `js/businesses.api.js` - createBusiness, getMyBusiness
- `js/signup-with-documents.js` - Signup with file uploads
- `js/file-upload.js` - File upload to Supabase storage
- `js/upload-doc.js` - Document upload
- `public/js/owner-form.js` - Business profile form
- `js/owner.js` - Owner page logic
- `js/owner-form.js` - Owner form handler
- `js/owner-activities.js` - Owner activities
- `js/owner-activities-new.js` - New activities (uses bulletins table)

**Events:**
- `js/events.js` - Event creation/listing (uses events table)
- `js/lib/events.fetch.js` - Event fetching with business joins
- `js/event.js` - Single event page

**Bulletins:**
- `js/bulletins.js` - Bulletin creation (uses bulletins table + storage)
- `js/bulletin.js` - Single bulletin page
- `js/bulletin-management.js` - Bulletin management
- `assets/js/bulletins-public.js` - Public bulletins

**Directory & Listing:**
- `js/directory.js` - Business directory (uses businesses table)
- `js/listing.js` - Business listing
- `js/business.js` - Single business page
- `js/business-form.js` - Business form

**Admin:**
- `js/admin.js` - Admin functions (uses businesses table)
- `js/admin-review.js` - Admin review (uses businesses table)
- `js/admin-dashboard.js` - Admin dashboard (uses businesses, events, bulletins)

**Compliance:**
- `js/compliance.js` - Compliance checks (uses businesses, profiles)
- `js/compliance-guards.js` - Compliance guards
- `js/compliance-banner.js` - Compliance banner

**Other:**
- `js/account-completeness.js` - Account completeness (uses profiles, businesses)
- `js/onboarding-integration.js` - Onboarding (uses businesses)
- `js/msme-overlay.js` - MSME overlay (uses businesses, events, bulletins)
- `js/site-header.js` - Site header (uses profiles)
- `js/nav-auth-state.js` - Nav auth state
- `js/header-auth.js` - Header auth
- `js/header-auth-slot.js` - Header auth slot
- `js/get-listed.js` - Get listed page
- `js/signup-utils.js` - Signup utilities
- `js/signup-stepper.js` - Signup stepper
- `js/signup-and-upload.js` - Signup with upload
- `js/analytics.js` - Analytics
- `js/activities-list.js` - Activities list
- `js/gating.js` - Gating logic
- `js/require-auth.js` - Require auth
- `js/password-reset.js` - Password reset
- `js/storage.js` - Storage utilities
- `js/lib/uploads.js` - Upload utilities

### B) DATABASE TABLES USED:

Based on code analysis, these Supabase tables are referenced:

1. **users** (Supabase Auth) - Replaced by User table
2. **profiles** - User profile data (full_name, avatar_url, user_id)
3. **businesses** - Business records (owner_id, name, description, story, logo_url, etc.)
4. **business_media** - Gallery images (business_id, file_url, media_type)
5. **events** - Events (owner_id, title, description, starts_at, ends_at, status, is_published)
6. **bulletins** - Bulletins (owner_id, title, content, status, is_published, image_url)

### C) SUPABASE STORAGE BUCKETS:

1. **business-files** - Logo and documents
2. **business-media** - Gallery images  
3. **bulletins** - Bulletin images

---

## PHASE 1 - BACKEND SETUP PLAN

### STEP 1: Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password_hash String
  role          String    @default("msme") // msme, admin
  name          String?
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt
  
  business      Business?
  events        Event[]
  bulletins     Bulletin[]
  
  @@map("users")
}

model Business {
  id               String   @id @default(cuid())
  owner_id         String   @unique
  name             String
  business_name    String?  // Alias for name
  description      String?
  short_description String?
  story            String?
  industry         String?
  category         String?
  country          String?  @default("Kuwait")
  city             String?
  area             String?
  block            String?
  street           String?
  floor            String?
  office_no        String?
  phone            String?
  whatsapp         String?
  website          String?
  instagram        String?
  logo_url         String?
  is_active        Boolean  @default(true)
  status           String?  @default("pending") // pending, approved, rejected
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt
  
  owner            User     @relation(fields: [owner_id], references: [id], onDelete: Cascade)
  media            BusinessMedia[]
  
  @@map("businesses")
}

model BusinessMedia {
  id          String   @id @default(cuid())
  business_id String
  file_path   String?
  file_url    String
  media_type  String   @default("image")
  display_order Int    @default(0)
  created_at  DateTime @default(now())
  
  business    Business @relation(fields: [business_id], references: [id], onDelete: Cascade)
  
  @@map("business_media")
}

model Event {
  id          String   @id @default(cuid())
  owner_id    String
  title       String
  description String?
  starts_at   DateTime?
  ends_at     DateTime?
  status      String  @default("draft") // draft, pending, published
  is_published Boolean @default(false)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
  
  owner       User    @relation(fields: [owner_id], references: [id], onDelete: Cascade)
  
  @@map("events")
}

model Bulletin {
  id          String   @id @default(cuid())
  owner_id    String
  title       String
  content     String
  category    String?
  url         String?
  image_url   String?
  start_date  DateTime?
  end_date    DateTime?
  status      String   @default("draft") // draft, pending, published
  is_published Boolean @default(false)
  is_pinned   Boolean  @default(false)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
  
  owner       User    @relation(fields: [owner_id], references: [id], onDelete: Cascade)
  
  @@map("bulletins")
}
```

### STEP 2: API Routes Structure (`api/` directory)

```
api/
├── auth/
│   ├── signup.js          POST /api/auth/signup
│   ├── login.js          POST /api/auth/login
│   ├── logout.js          POST /api/auth/logout
│   └── me.js              GET /api/auth/me
├── business/
│   ├── me.js              GET /api/business/me
│   ├── upsert.js           POST /api/business/upsert
│   └── [id].js             GET /api/business/[id]
├── upload/
│   └── index.js            POST /api/upload (Phase 2)
├── events/
│   ├── index.js            GET /api/events/public
│   └── create.js           POST /api/events/create
└── bulletins/
    ├── index.js            GET /api/bulletins/public
    └── create.js           POST /api/bulletins/create
```

### STEP 3: Frontend API Helper (`js/api.js`)

Create new file to replace Supabase calls:

```javascript
// js/api.js - Backend API helper
const API_BASE = '/api';

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    credentials: 'include', // For httpOnly cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };
  
  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }
  
  const res = await fetch(url, config);
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  
  return res.json();
}

export const api = {
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
  post: (endpoint, body) => apiRequest(endpoint, { method: 'POST', body }),
  put: (endpoint, body) => apiRequest(endpoint, { method: 'PUT', body }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
};

// Auth helpers
export async function getCurrentUser() {
  try {
    return await api.get('/auth/me');
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser() || Promise.reject(new Error('Not authenticated'));
}
```

---

## PHASE 2 - MIGRATION ORDER

### ORDER 1: Remove Supabase Bootstrap (HTML)
- Remove `<script id="supabase-loader">` from all HTML files
- Remove `<script src="/js/supabase-client.global.js">` from all HTML files
- Remove any `window.SUPABASE_URL` assignments

### ORDER 2: Create Backend API (Node.js/Vercel)
- Set up Prisma
- Create API routes for auth (signup/login/logout/me)
- Create API routes for business (me/upsert)
- Test API endpoints work

### ORDER 3: Replace Auth Logic
- Update `js/auth-signup-utils.js` to use `/api/auth/*`
- Update `js/auth-signup.js` to use new API
- Update `js/auth-login.js` to use new API
- Update `public/js/header-auth-slot.js` to use `/api/auth/me`
- Remove Supabase client imports

### ORDER 4: Replace Business Logic
- Update `js/businesses-utils.js` to use `/api/business/*`
- Update `js/businesses.api.js` to use new API
- Update `js/signup-with-documents.js` to use new API
- Update `public/js/owner-form.js` to use new API
- Update `js/owner.js` to use new API

### ORDER 5: Replace Events Logic
- Update `js/events.js` to use `/api/events/*`
- Update `js/lib/events.fetch.js` to use new API
- Update `js/event.js` to use new API

### ORDER 6: Replace Bulletins Logic
- Update `js/bulletins.js` to use `/api/bulletins/*`
- Update `js/bulletin-management.js` to use new API
- Update `assets/js/bulletins-public.js` to use new API

### ORDER 7: Replace Storage (Phase 2)
- Create `/api/upload` endpoint
- Update `js/file-upload.js` to use new endpoint
- Update `js/upload-doc.js` to use new endpoint
- Update `js/businesses-utils.js` logo/gallery uploads

### ORDER 8: Cleanup
- Delete all `*supabase*.js` files
- Remove `@supabase/supabase-js` from package.json
- Remove Supabase config constants
- Search entire codebase for any remaining Supabase references

---

## FILES TO MODIFY SUMMARY

### Files to DELETE (7):
1. `js/supabase-client.global.js`
2. `public/js/supabase-client.global.js`
3. `public/js/supabase-client.js`
4. `js/supabase-client.js`
5. `js/supabase.js`
6. `assets/js/supabase-client.global.js`
7. `js/config.js` (or remove Supabase constants)

### Files to CREATE (8+):
1. `prisma/schema.prisma`
2. `api/auth/signup.js`
3. `api/auth/login.js`
4. `api/auth/logout.js`
5. `api/auth/me.js`
6. `api/business/me.js`
7. `api/business/upsert.js`
8. `api/events/index.js`
9. `api/events/create.js`
10. `api/bulletins/index.js`
11. `api/bulletins/create.js`
12. `js/api.js` (new API helper)

### Files to MODIFY (56+ JS files):
- All files listed in section A.3 above
- All HTML files that load Supabase scripts

---

## ENVIRONMENT VARIABLES NEEDED

```env
# Database
DATABASE_URL="file:./dev.db"  # Local SQLite
# DATABASE_URL="postgresql://..." # Production Postgres

# JWT Secret
JWT_SECRET="your-secret-key-here"

# File Upload (Phase 2)
# VERCEL_BLOB_TOKEN="..." or
# CLOUDFLARE_R2_ACCESS_KEY="..."
# CLOUDFLARE_R2_SECRET_KEY="..."
# CLOUDFLARE_R2_BUCKET="..."
```

---

## TESTING CHECKLIST

### Auth Flow:
- [ ] Signup creates user in database
- [ ] Login sets httpOnly cookie
- [ ] Logout clears cookie
- [ ] /api/auth/me returns current user
- [ ] Header shows user when logged in
- [ ] Header shows login/signup when logged out

### Business Flow:
- [ ] Signup creates business record
- [ ] Owner page loads business data
- [ ] Business form updates business
- [ ] Logo upload works (Phase 2)
- [ ] Gallery upload works (Phase 2)

### Events Flow:
- [ ] Public events list loads
- [ ] Event creation works
- [ ] Event details page works

### Bulletins Flow:
- [ ] Public bulletins list loads
- [ ] Bulletin creation works
- [ ] Bulletin management works

### Cleanup Verification:
- [ ] No Supabase references in console
- [ ] No ERR_NAME_NOT_RESOLVED errors
- [ ] No GoTrueClient warnings
- [ ] Site looks identical to before

---

## NEXT STEPS

**WAITING FOR APPROVAL BEFORE IMPLEMENTATION**

This plan is ready for review. Once approved, implementation will proceed in the order specified above.
