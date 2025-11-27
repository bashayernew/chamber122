# How to Start the Server

## Quick Start

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Start the server**:
   ```bash
   npm run dev
   ```

3. **Verify server is running**:
   - You should see: `✅ Server running at http://localhost:4000/`
   - Open browser to `http://localhost:4000`
   - Check console - should see API endpoints listed

## Troubleshooting

### Server won't start

**Error: Port 4000 already in use**
- Another process is using port 4000
- Solution: Kill the process or change PORT in `server.js`

**Error: Cannot find module**
- Dependencies not installed
- Solution: Run `npm install`

**Error: EADDRINUSE**
- Port is already in use
- Solution: Change PORT in `server.js` or kill the process using port 4000

### API returns 404

**Check if server is running:**
- Look for `✅ Server running at http://localhost:4000/` in console
- If not running, start with `npm run dev`

**Check server logs:**
- Server should log each API request
- If no logs, server might not be receiving requests

**Verify route exists:**
- Check `server.js` has the route defined
- Routes should be defined before `app.listen()`

### Database file not created

**db.json should be created automatically:**
- If missing, server will create it on first start
- Check that `server.js` has `initDB()` called in `start()`

## Testing the Server

### Test API endpoints:

```bash
# Test auth/me (should return {user: null} if not logged in)
curl http://localhost:4000/api/auth/me

# Test signup
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## Expected Behavior

When server starts successfully:
- ✅ Server running message appears
- ✅ All API endpoints listed
- ✅ Database file created (`db.json`)
- ✅ No errors in console
- ✅ Browser can access `http://localhost:4000`
- ✅ API calls return responses (not 404)

