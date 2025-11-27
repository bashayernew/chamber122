# Vercel Project Setup Guide - Step by Step

## After Deleting and Recreating the Project

### Step 1: Create New Project
1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `bashayernew/chamber122`
4. **IMPORTANT**: Before clicking "Deploy", configure these settings:

### Step 2: Configure Project Settings (CRITICAL)
In the project setup page, set these BEFORE deploying:

**Framework Preset:**
- Select **"Other"** or **"Static HTML"**
- DO NOT select Next.js, React, Vue, etc.

**Root Directory:**
- Leave **EMPTY** (or set to `.`)
- This tells Vercel the root of your repo is the project root

**Build and Output Settings:**
- **Build Command**: Leave **EMPTY**
- **Output Directory**: Leave **EMPTY** (or set to `.`)
- **Install Command**: Leave **EMPTY**

**Environment Variables:**
- You can add these later if needed
- For now, leave empty

### Step 3: Deploy
Click **"Deploy"** and wait for it to complete.

### Step 4: Verify Deployment
After deployment completes:

1. **Check the main page loads:**
   - Visit: `https://your-project.vercel.app`
   - Should show your homepage

2. **Test JavaScript files are served:**
   - Visit: `https://your-project.vercel.app/js/businesses-utils.js`
   - Should show JavaScript code (not HTML 404 page)
   - Visit: `https://your-project.vercel.app/js/signup-with-documents.js`
   - Should show JavaScript code (not HTML 404 page)

3. **Test the signup page:**
   - Visit: `https://your-project.vercel.app/auth.html`
   - Open browser console (F12)
   - Should NOT see "Unexpected token" errors
   - Try selecting a logo file - preview should appear

### Step 5: If JavaScript Files Still Return 404

If the JS files still return HTML 404 pages:

1. Go to **Project Settings** → **General**
2. Verify all settings are still correct (they might have changed)
3. Go to **Deployments** → Click **"Redeploy"** on the latest deployment
4. Wait for redeploy to complete

### Step 6: Verify Files Are in Git

Make sure all files are committed:
```bash
git ls-files js/ | head -20
```

Should show files like:
- js/businesses-utils.js
- js/signup-with-documents.js
- js/auth-signup.js
- etc.

If files are missing, they need to be added:
```bash
git add js/
git commit -m "Add JS files"
git push
```

## What Should Work After Correct Setup

✅ Homepage loads
✅ All HTML pages load (auth.html, directory.html, etc.)
✅ JavaScript files are served correctly (not 404 HTML)
✅ CSS files load
✅ Logo preview shows when selecting logo
✅ Gallery preview shows when selecting images
✅ No "Unexpected token" errors in console

## If It Still Doesn't Work

The issue might be:
1. Vercel is still detecting it as a framework project
2. Files aren't being deployed (check deployment logs)
3. There's a `.vercelignore` or `.gitignore` excluding files

Check deployment logs in Vercel dashboard to see what files are being uploaded.

