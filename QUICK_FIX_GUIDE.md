# Quick Fix Guide - Show Events on Page

## Problem
Events page shows no events because Supabase domain doesn't exist (DNS error).

## Solution
The server now includes integrated API routes that provide sample events automatically.

## Steps to See Events

### 1. Restart the Server

Stop your current server (Ctrl+C) and restart it:
```bash
node server.js
```

You should see:
```
✅ Server running at http://localhost:4000/
✅ API endpoints available:
   - GET /api/events/public
   - GET /api/bulletins/public
   - GET /api/auth/me

   Mock API integrated - events will display automatically
```

### 2. Refresh Events Page

Go to: `http://localhost:4000/events.html`

You should now see 3 sample events displayed automatically!

## How It Works

1. The events fetch function tries Supabase first
2. When Supabase fails (DNS error), it automatically falls back to the mock API
3. Mock API returns sample events from `api-server.js`
4. Events display on the page

## Mock API Endpoints

- `GET /api/events/public` - Returns sample events (same port as frontend)
- `GET /api/bulletins/public` - Returns sample bulletins
- `GET /api/auth/me` - Returns null user (not logged in)

## Next Steps

This is a **temporary solution**. To permanently fix:

1. **Review Migration Plan**: See `MIGRATION_PLAN.md`
2. **Implement Phase 1**: Replace Supabase with real backend
3. **Remove Mock API**: Once real API is working

## Troubleshooting

### Events still not showing?

1. **Check API is working**: Open `http://localhost:4000/api/events/public` in browser
2. **Check browser console**: Look for "Using mock API data" message
3. **Check CORS**: Mock API has CORS enabled, should work

### Port conflicts?

- Server uses port **4000** (both frontend and API)
- Change `PORT` in `server.js` if needed

---

**Note**: This mock API will be replaced during Phase 1 migration with real Prisma + PostgreSQL backend.

