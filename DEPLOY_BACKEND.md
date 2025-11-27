# Deploy Backend to Make Website Fully Functional

## Current Situation
- ✅ Frontend is deployed to Vercel
- ❌ Backend Express server is NOT deployed
- ❌ API calls are failing (404 errors)

## Solution: Deploy Backend Separately

You have two options:

### Option 1: Deploy to Railway (Recommended - Free tier available)

1. **Go to Railway.app** and sign up/login
2. **Create a new project**
3. **Connect your GitHub repository**
4. **Add a new service** → Select "Deploy from GitHub repo"
5. **Configure the service:**
   - Root Directory: `chamber122/server`
   - Build Command: `npm install`
   - Start Command: `node index.js`
6. **Add Environment Variables:**
   - `PORT=4000` (or let Railway assign one)
   - `JWT_SECRET=your-secret-key-here` (use a strong random string)
   - `NODE_ENV=production`
7. **Deploy** - Railway will give you a URL like `https://your-app.railway.app`
8. **Update frontend API base URL** (see below)

### Option 2: Deploy to Render (Free tier available)

1. **Go to render.com** and sign up/login
2. **Create a new Web Service**
3. **Connect your GitHub repository**
4. **Configure:**
   - Name: `chamber122-backend`
   - Environment: `Node`
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && node index.js`
   - Root Directory: `chamber122/server`
5. **Add Environment Variables:**
   - `JWT_SECRET=your-secret-key-here`
   - `NODE_ENV=production`
6. **Deploy** - Render will give you a URL like `https://your-app.onrender.com`
7. **Update frontend API base URL** (see below)

## After Backend is Deployed

### Step 1: Get Your Backend URL
- Railway: `https://your-app.railway.app`
- Render: `https://your-app.onrender.com`

### Step 2: Update Frontend API Configuration

Edit `chamber122/js/api.js` and update the `API_BASE_URL`:

```javascript
// For Railway:
const API_BASE_URL = 'https://your-app.railway.app';

// OR for Render:
const API_BASE_URL = 'https://your-app.onrender.com';
```

### Step 3: Update Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add:
   - `VITE_API_URL` = `https://your-backend-url.com` (or `REACT_APP_API_URL` depending on your setup)

### Step 4: Redeploy Frontend

After updating the API URL, push to GitHub and Vercel will auto-deploy.

## Alternative: Use Vercel Serverless Functions

If you prefer to keep everything on Vercel, you can convert the Express routes to Vercel serverless functions, but this requires:
- Converting SQLite to a cloud database (Vercel Postgres, Supabase, etc.)
- Rewriting all routes as serverless functions
- More complex setup

**Recommendation:** Use Option 1 or 2 (Railway/Render) for simplicity.

## Testing After Deployment

1. ✅ Sign up a new account
2. ✅ Login
3. ✅ Complete profile
4. ✅ Search for MSMEs in directory
5. ✅ Post events and bulletins
6. ✅ View events and bulletins on all pages
7. ✅ Admin dashboard: view documents, approve/suspend
8. ✅ All filters work

## Current Backend Endpoints

Your Express server provides:
- `POST /api/auth/signup` - User signup
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/business/upsert` - Create/update business profile
- `GET /api/businesses/public` - Get all businesses
- `GET /api/events` - Get all events
- `POST /api/events/create` - Create event
- `GET /api/bulletins` - Get all bulletins
- `POST /api/bulletins` - Create bulletin
- `GET /api/dashboard/*` - Admin dashboard endpoints

All these will work once the backend is deployed!

