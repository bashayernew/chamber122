# Header Menu Integration Instructions

This document explains how to integrate the new role-aware header menu into all pages of your website.

## Overview

The new header menu replaces the static "Account" button with a dynamic, role-aware dropdown that:
- Shows different menu items based on user role (provider vs customer)
- Connects to Supabase Auth and Profiles
- Handles authentication state and redirects
- Provides role switching functionality

## Files Created

1. **`/shared/header-menu.js`** - Main component with all functionality
2. **CSS styles added to `css/style.css`** - Menu styling
3. **This integration guide**

## Integration Steps

### Step 1: Update Header HTML on All Pages

For each page that has a header (typically all pages), replace the existing account menu section with the new component.

#### Find this section in your HTML:
```html
<!-- Auth CTAs (shown when NOT logged in) -->
<div id="auth-cta" class="flex items-center gap-3" data-testid="auth-cta">
  <a href="auth.html#login" class="btn btn-ghost text-sm" data-testid="login-cta" data-i18n="nav.login">Login</a>
  <a href="auth.html#signup" class="btn btn-primary text-sm px-4 py-2 rounded-2xl shadow-sm" data-testid="signup-cta" data-i18n="nav.signup">
    Sign Up & Get Listed
  </a>
</div>

<!-- Account menu (shown ONLY when logged in) -->
<div id="account-menu" class="relative hidden" data-testid="account-menu">
  <button id="account-btn" class="btn btn-outline flex items-center gap-2">
    <img id="account-avatar" src="" alt="" class="h-7 w-7 rounded-full object-cover hidden">
    <span id="account-name" data-i18n="nav.account">Account</span>
    <svg class="h-4 w-4 opacity-70" viewBox="0 0 20 20"><path d="M5 7l5 6 5-6"/></svg>
  </button>
  <div id="account-dropdown" class="menu hidden">
    <a href="owner-activities.html" data-testid="menu-my-activities" data-i18n="nav.myActivities">My Activities</a>
    <a href="admin-dashboard.html" id="menu-admin" class="hidden" data-testid="menu-admin" data-i18n="nav.admin">Admin Panel</a>
    <a href="#" id="btn-logout" data-testid="logout" data-i18n="nav.logout">Logout</a>
  </div>
</div>
```

#### Replace it with:
```html
<!-- New Role-Aware Account Menu -->
<div id="accountMenu"></div>
<script type="module" src="/shared/header-menu.js"></script>
```

### Step 2: Pages to Update

Update the header in these files:
- `index.html`
- `directory.html`
- `events.html`
- `bulletin.html`
- `about.html`
- `contact.html`
- `auth.html`
- `owner.html`
- `owner-activities.html`
- `admin-dashboard.html`
- `get-listed.html`
- Any other pages with headers

### Step 3: Verify Integration

After updating each page:

1. **Test Authentication Flow:**
   - Visit any page while logged out → should redirect to `/auth.html#login`
   - Log in → should see the new header menu

2. **Test Role-Based Menus:**
   - **Provider users** should see: Account, Business, Activities, Media Library, Logout
   - **Customer users** should see: Account, Become a Provider, Logout

3. **Test Functionality:**
   - Click menu items → should navigate correctly
   - Click "Become a Provider" → should update role and redirect
   - Click "Logout" → should sign out and redirect to login

## Menu Behavior

### Provider Role (`provider_company` or `provider_individual`)
Shows menu items:
- **Account** → `/account.html`
- **Business** → `/account-business.html`
- **Activities** → `/owner-activities.html`
- **Media Library** → `/dashboard-media.html`
- **Logout** → Signs out and redirects to login

### Customer Role (`customer` or `null`)
Shows menu items:
- **Account** → `/account.html`
- **Become a Provider** → Updates profile role to `provider_individual`, then redirects to `/account-business.html`
- **Logout** → Signs out and redirects to login

## Database Requirements

The component expects a `profiles` table with these columns:
- `user_id` (uuid, references auth.users)
- `full_name` (text, nullable)
- `role` (text, nullable) - values: `provider_company`, `provider_individual`, `customer`, or `null`

## Pending Signup Handling

The component automatically handles `localStorage.pendingSignup` data:
- Checks for pending signup data on page load
- Runs `finalizePostLogin()` if found
- Clears the localStorage after processing

## Styling

The menu uses existing dark theme classes and follows the site's design system:
- Dark background with golden accents
- Hover effects with smooth transitions
- Consistent with existing button and link styles
- Responsive design

## Error Handling

- Authentication errors → redirect to login
- Profile fetch errors → creates default profile
- Role update errors → shows alert message
- Network errors → graceful fallbacks

## Browser Compatibility

- Uses modern ES6 modules
- Requires browsers that support:
  - ES6 imports/exports
  - Fetch API
  - LocalStorage
  - CSS Grid/Flexbox

## Testing Checklist

- [ ] All pages load without console errors
- [ ] Authentication redirect works
- [ ] Role-based menus display correctly
- [ ] Menu items navigate to correct pages
- [ ] "Become a Provider" updates role and redirects
- [ ] Logout signs out and redirects
- [ ] Pending signup data is processed
- [ ] Menu styling matches site design
- [ ] Mobile responsiveness works
- [ ] No conflicts with existing JavaScript

## Troubleshooting

### Menu not showing:
- Check browser console for JavaScript errors
- Verify Supabase connection is working
- Ensure user is properly authenticated

### Role not updating:
- Check database permissions for profiles table
- Verify RLS policies allow updates
- Check browser console for error messages

### Styling issues:
- Ensure CSS file is loaded after the component
- Check for conflicting CSS rules
- Verify CSS variables are defined

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify Supabase connection and permissions
3. Test with different user roles
4. Check network tab for failed requests
