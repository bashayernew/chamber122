# Admin Dashboard Setup Guide

## Overview

This admin dashboard system allows administrators to manage user accounts, review documents submitted during signup, approve/reject accounts, send messages about document issues, and suspend accounts.

**Note: This is a standalone system that uses localStorage for data storage. No database or external services required.**

## Features

1. **Admin Login** (`admin-login.html`)
   - Email: `bashayer@123123`
   - Password: `bashayer123123`
   - Local authentication using localStorage (no Supabase required)

2. **User Management Dashboard** (`admin-dashboard.html`)
   - View all users with their account details
   - View documents submitted during signup (Civil ID Front, Civil ID Back, Owner Proof)
   - Approve/Reject user accounts
   - Suspend/Unsuspend accounts
   - Send messages to users about document issues
   - All data stored in browser localStorage

3. **User Messages Page** (`user-messages.html`)
   - Users can view messages from administrators
   - Users can respond to messages
   - Users can submit corrected documents

## Setup

**No database setup required!** The system uses browser localStorage for all data storage.

## Files Created/Modified

### New Files:
- `admin-login.html` - Admin login page (standalone, no Supabase)
- `js/admin-auth.js` - Local authentication and data management system
- `js/admin-dashboard-standalone.js` - Standalone admin dashboard (no Supabase)
- `user-messages.html` - User-facing messages page
- `css/admin-dashboard.css` - Admin dashboard styles

### Modified Files:
- `admin-dashboard.html` - Updated to use standalone version (no Supabase dependencies)

## Usage

### Admin Login
1. Navigate to `/admin-login.html`
2. Enter email: `bashayer@123123`
3. Enter password: `bashayer123123`
4. Click "Sign In"

### Admin Dashboard Features

#### Viewing Users
- All users are displayed in the "User Management" tab
- Each user card shows:
  - User email and contact information
  - Business details
  - Account status (pending, approved, rejected, suspended)
  - Documents (with view links)

#### Approving Accounts
1. Click "Approve" button on a user card
2. Confirm the action
3. User receives a notification
4. Account status changes to "approved"

#### Rejecting Accounts
1. Click "Reject" button on a user card
2. Enter a reason for rejection
3. User receives a notification with the reason
4. Account status changes to "rejected"

#### Sending Document Issue Messages
1. Click "Report Issue" button next to a document
2. Enter subject and message
3. Message is sent to the user
4. User can view and respond via `/user-messages.html`

#### Suspending Accounts
1. Click "Suspend" button on an approved account
2. Confirm the action
3. User receives a notification
4. Account status changes to "suspended"

### User Messages Page

Users can:
1. View all messages from administrators
2. See which document has an issue
3. Submit a response message
4. Upload corrected documents
5. View their previous responses

## Data Storage

All data is stored in browser localStorage using these keys:
- `admin_session` - Admin authentication session
- `chamber122_users` - User accounts and information
- `chamber122_documents` - User documents
- `chamber122_admin_messages` - Admin messages to users

### Data Structure

**Users:**
- id, email, name, phone, business_name, industry, city, status, created_at, updated_at

**Documents:**
- id, user_id, business_id, kind, file_url, file_name, file_size, uploaded_at
- Document types: `civil_id_front`, `civil_id_back`, `owner_proof`

**Messages:**
- id, user_id, subject, message, document_type, status, created_at

## Security

- Admin authentication uses hardcoded credentials (`bashayer@123123` / `bashayer123123`)
- Session stored in localStorage with 24-hour expiration
- Only authenticated admins can access admin dashboard
- Data is browser-specific (stored locally)

## Notes

- **No database required** - Everything works with localStorage
- **No external services** - Fully standalone system
- Sample data is automatically initialized on first load
- Data persists in browser localStorage until cleared
- Each browser/device has its own separate data storage
- To reset all data, clear browser localStorage

