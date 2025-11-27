# Setup Checklist - Normal Backend Migration Complete

## Quick Start

1. **Install dependencies:**
   ```bash
   cd chamber122
   npm install
   cd server
   npm install
   ```

2. **Start the backend:**
   ```bash
   npm run dev
   ```
   (This runs `cd server && node index.js`)

3. **Open the site:**
   ```
   http://localhost:4000/auth.html#signup
   ```

## Test Checklist

### ✅ Signup Flow
- [ ] Fill signup form with business details
- [ ] Upload logo image (shows preview)
- [ ] Upload gallery images (up to 5, all show previews)
- [ ] Upload required documents (license, articles, signature_auth, iban)
- [ ] Click "Create Account"
- [ ] Should redirect to `/owner.html` automatically
- [ ] Profile page should show:
  - Business name, description, story
  - Phone, WhatsApp, location fields
  - Logo image displayed
  - Gallery images displayed (all uploaded images)

### ✅ Profile Edit Flow
- [ ] Click "Edit Profile" button on `/owner.html`
- [ ] Form should preload with existing data
- [ ] Logo preview should show current logo
- [ ] Gallery previews should show current images
- [ ] Change some fields
- [ ] Upload new logo (preview updates)
- [ ] Add/remove gallery images (previews update)
- [ ] Click "Save"
- [ ] Should redirect back to `/owner.html`
- [ ] Updated data should be displayed

### ✅ Header Authentication UI
- [ ] When logged out: Shows "Login" and "Sign Up" buttons
- [ ] After signup/login: Shows avatar with dropdown
- [ ] Dropdown shows: Dashboard, Profile, Logout
- [ ] Click "Logout": Header updates to signed-out state
- [ ] No console spam (no repeated 404 errors)

### ✅ API Endpoints Working
- [ ] `POST /api/auth/signup` - Creates user + business
- [ ] `POST /api/auth/login` - Authenticates user
- [ ] `GET /api/auth/me` - Returns user + business data
- [ ] `POST /api/auth/logout` - Clears session
- [ ] `POST /api/business/upsert` - Creates/updates business with files
- [ ] `GET /api/business/me` - Returns business + media
- [ ] `POST /api/upload` - Uploads single file
- [ ] `POST /api/upload/multiple` - Uploads multiple files

## File Structure

```
chamber122/
├── server/
│   ├── index.js              # Express app (port 4000)
│   ├── db.js                 # SQLite database setup
│   ├── auth.js               # JWT + bcrypt utilities
│   ├── uploads.js             # Multer configuration
│   ├── routes/
│   │   ├── auth.routes.js    # /api/auth/*
│   │   ├── business.routes.js # /api/business/*
│   │   ├── upload.routes.js   # /api/upload/*
│   │   ├── events.routes.js   # /api/events/*
│   │   └── bulletins.routes.js # /api/bulletins/*
│   ├── uploads/               # Uploaded files storage
│   └── data.db                 # SQLite database
├── js/
│   ├── api.js                 # Frontend API helper
│   ├── auth-signup.js         # Signup flow
│   ├── signup-with-documents.js # File uploads + previews
│   └── businesses-utils.js    # Business creation
├── public/js/
│   ├── header-auth-slot.js    # Header auth UI
│   └── owner-form.js          # Profile edit form
└── package.json               # Root package.json

```

## Key Changes Made

1. **Backend (`/server`):**
   - Express server on port 4000
   - SQLite database with auto-init schema
   - JWT authentication (httpOnly cookies + Authorization header)
   - Multer for file uploads
   - All API routes implemented

2. **Frontend:**
   - `api.js` uses `localStorage` for `session_token`
   - All Supabase calls replaced with `fetch` to `/api/*`
   - File uploads use `FormData` to `/api/upload`
   - Header polling stops on 401/404 errors

3. **Database Schema:**
   - `users` (id, email, password_hash, role, name, phone)
   - `businesses` (id, owner_id, name, description, story, phone, whatsapp, location fields, logo_url)
   - `business_media` (id, business_id, public_url, file_type, document_type)

## No Supabase References

All Supabase imports, client files, and API calls have been removed from production code. The site now uses a normal Node.js/Express backend.

