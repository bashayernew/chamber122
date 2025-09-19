# Compliance Onboarding & Review System Setup Guide

This guide will help you set up the complete compliance onboarding and review system for Chamber122.

## 🚀 **System Overview**

The compliance system includes:
- **Post-auth onboarding** with 2-step form (Business Info + Documents)
- **Admin review dashboard** for managing submissions
- **Global status banner** showing compliance status
- **App guards** preventing unauthorized actions
- **Notification system** for status updates
- **File upload system** with Supabase Storage

## 📋 **Prerequisites**

1. **Supabase Project** with authentication enabled
2. **Database migrations** applied (see below)
3. **Storage bucket** configured for file uploads
4. **Admin users** added to the system

## 🗄️ **Database Setup**

### Step 1: Apply the Migration

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/0006_compliance_system.sql`
4. Click **Run** to execute the migration

This will create:
- `businesses` table
- `profiles` table  
- `business_documents` table
- `business_verifications` table
- `notifications` table
- `admins` table
- RLS policies and helper functions

### Step 2: Create Storage Bucket

1. Go to **Storage** in your Supabase Dashboard
2. Click **New Bucket**
3. Name: `business-files`
4. Set to **Private**
5. Configure allowed MIME types: `application/pdf, image/jpeg, image/jpg, image/png, image/gif, image/webp`
6. Set file size limit: `10MB`

### Step 3: Add Admin Users

```sql
-- Add yourself as an admin (replace with your user ID)
INSERT INTO public.admins (user_id) 
VALUES ('your-user-id-here');
```

## 🔧 **Configuration**

### Step 1: Update Supabase Config

Ensure your `js/config.js` has the correct Supabase URL and anon key:

```javascript
export const SUPABASE_URL = 'https://your-project.supabase.co';
export const SUPABASE_ANON_KEY = 'your-anon-key';
```

### Step 2: Update Auth Redirect URLs

In your Supabase Dashboard:
1. Go to **Authentication** → **URL Configuration**
2. Add these redirect URLs:
   - `http://localhost:3000/auth-callback.html` (development)
   - `https://yourdomain.com/auth-callback.html` (production)

## 📱 **Pages Overview**

### 1. **Compliance Page** (`compliance.html`)
- **URL**: `/compliance.html`
- **Purpose**: 2-step onboarding form for business owners
- **Features**:
  - Business information form
  - Document upload (4 required types)
  - Real-time status updates
  - Progress tracking

### 2. **Admin Review Dashboard** (`admin-review.html`)
- **URL**: `/admin-review.html`
- **Purpose**: Admin interface for reviewing submissions
- **Features**:
  - Business listing with filters
  - Review modal with document viewer
  - Approval/rejection workflow
  - Status management

### 3. **Auth Callback** (`auth-callback.html`)
- **URL**: `/auth-callback.html`
- **Purpose**: Handles email confirmation redirects
- **Features**:
  - Session establishment
  - Redirect to compliance page
  - Error handling

## 🎨 **UI Components**

### 1. **Global Status Banner**
- Shows compliance status across all pages
- Sticky positioning at top
- Different colors for different statuses
- Action buttons for next steps

### 2. **Notification System**
- Bell icon in header
- Dropdown with recent notifications
- Real-time updates
- Mark as read functionality

### 3. **Compliance Guards**
- Prevents unauthorized actions
- Shows modal with status explanation
- Redirects to compliance page

## 🔄 **User Flow**

### **New User Journey**
1. **Signup** → See disclaimer about document review
2. **Email Confirmation** → Redirected to compliance page
3. **Complete Profile** → Fill business info and upload documents
4. **Submit for Review** → Status changes to "pending"
5. **Use App** → Can browse but limited actions until approved

### **Admin Review Journey**
1. **Login as Admin** → Access admin review dashboard
2. **Review Submission** → View business info and documents
3. **Make Decision** → Approve, request changes, reject, or deactivate
4. **Notify User** → User receives notification of decision

### **Status Transitions**
- `pending` → `approved` (admin approval)
- `pending` → `changes_requested` (admin requests changes)
- `pending` → `rejected` (admin rejection)
- `changes_requested` → `pending` (user resubmits)
- Any status → `deactivated` (admin deactivation)

## 🛡️ **Security Features**

### **Row Level Security (RLS)**
- Users can only see their own data
- Admins can see all data
- Proper isolation between businesses

### **File Upload Security**
- Private storage bucket
- File type validation
- Size limits enforced
- Unique file naming

### **Access Control**
- Admin-only review dashboard
- Compliance guards on sensitive actions
- Session-based authentication

## 📊 **Status Meanings**

| Status | Description | User Actions | App Access |
|--------|-------------|--------------|------------|
| `pending` | Under review | Can edit profile | Limited |
| `approved` | Fully verified | Full access | Full |
| `changes_requested` | Needs updates | Must update docs | Limited |
| `rejected` | Not approved | Can resubmit | Very limited |
| `deactivated` | Account disabled | Contact support | None |

## 🔧 **Customization**

### **Adding New Document Types**
1. Update `business_documents` table schema
2. Add new document cards in `compliance.html`
3. Update validation in `compliance.js`

### **Modifying Status Messages**
1. Edit status text in `compliance-banner.js`
2. Update notification messages in `admin-review.js`
3. Customize modal content in `compliance-guards.js`

### **Styling Changes**
1. Modify `css/compliance.css` for compliance page
2. Update `css/admin-review.css` for admin dashboard
3. Adjust banner styles in `js/compliance-banner.js`

## 🧪 **Testing Checklist**

### **User Testing**
- [ ] Sign up with new account
- [ ] Complete compliance form
- [ ] Upload all required documents
- [ ] Submit for review
- [ ] Check status banner appears
- [ ] Try to create event/bulletin (should be blocked)
- [ ] Receive notification when reviewed

### **Admin Testing**
- [ ] Login as admin user
- [ ] Access review dashboard
- [ ] Review business submission
- [ ] Approve/reject business
- [ ] Check user receives notification
- [ ] Verify status updates correctly

### **Edge Cases**
- [ ] File upload with invalid type
- [ ] File upload exceeding size limit
- [ ] Network errors during upload
- [ ] Session expiration during form submission
- [ ] Admin trying to access user pages

## 🚨 **Troubleshooting**

### **Common Issues**

1. **"Access denied" errors**
   - Check RLS policies are applied
   - Verify user is in `admins` table

2. **File upload failures**
   - Check storage bucket exists and is private
   - Verify file type and size limits
   - Check Supabase storage permissions

3. **Notifications not showing**
   - Check notification system is loaded
   - Verify user is authenticated
   - Check database connection

4. **Status banner not appearing**
   - Check compliance banner script is loaded
   - Verify business record exists
   - Check Supabase client initialization

### **Debug Mode**
Enable console logging by adding this to your browser console:
```javascript
localStorage.setItem('debug', 'compliance');
```

## 📈 **Performance Optimization**

### **Database Indexes**
The migration includes optimized indexes for:
- Business lookups by owner
- Verification status queries
- Notification retrieval
- Document associations

### **File Upload Optimization**
- Chunked uploads for large files
- Progress indicators
- Error handling and retry logic
- Client-side validation

### **Caching Strategy**
- Notification polling every 30 seconds
- Status banner updates on page load
- Document previews cached locally

## 🔄 **Maintenance**

### **Regular Tasks**
1. **Monitor storage usage** - Clean up old files
2. **Review admin logs** - Check for suspicious activity
3. **Update file limits** - Adjust based on usage
4. **Backup notifications** - Archive old notifications

### **Database Maintenance**
```sql
-- Clean up old notifications (older than 30 days)
DELETE FROM public.notifications 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Archive old verification records (keep latest per business)
-- (This would require a more complex query)
```

## 📞 **Support**

If you encounter issues:
1. Check the browser console for errors
2. Verify Supabase connection and permissions
3. Check database migration was applied correctly
4. Ensure all scripts are loading properly

## 🎉 **Success!**

Once everything is set up, you'll have a complete compliance system that:
- ✅ Guides users through onboarding
- ✅ Allows admins to review submissions
- ✅ Prevents unauthorized actions
- ✅ Sends real-time notifications
- ✅ Maintains security and data integrity

The system is designed to be user-friendly, secure, and scalable for your Chamber122 platform!
