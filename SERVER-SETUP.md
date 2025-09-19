# Chamber122 Development Server Setup

## Quick Start

### Option 1: Custom Python Server (Recommended)
```bash
python server.py
```

### Option 2: Batch File (Windows)
Double-click `start-server.bat`

### Option 3: PowerShell (Windows)
```powershell
.\start-server.ps1
```

### Option 4: Standard Python Server
```bash
python -m http.server 8000
```

## What the Custom Server Fixes

### ✅ Content-Type Headers
- **HTML files**: `text/html; charset=utf-8`
- **CSS files**: `text/css; charset=utf-8`
- **JavaScript files**: `application/javascript; charset=utf-8`
- **JSON files**: `application/json; charset=utf-8`
- **Font files**: `font/woff2`, `font/woff`, `font/ttf`
- **SVG files**: `image/svg+xml`

### ✅ Security Headers
- `X-Content-Type-Options: nosniff`
- `Content-Security-Policy: frame-ancestors 'none'`
- `Referrer-Policy: strict-origin-when-cross-origin`

### ✅ Cache Headers
- **Static assets** (CSS, JS, images): `Cache-Control: public, max-age=31536000`
- **HTML files**: `Cache-Control: no-cache, no-store, must-revalidate`

### ✅ Removed Problematic Headers
- No `X-XSS-Protection` (deprecated)
- No `Expires` header (replaced with Cache-Control)

## Browser Compatibility

The custom server ensures:
- ✅ **Safari 9+** - Proper charset support
- ✅ **Firefox 22+** - Correct MIME types
- ✅ **Chrome/Edge** - Modern security headers
- ✅ **Mobile browsers** - Optimized caching

## Testing

1. Start the custom server: `python server.py`
2. Open: http://localhost:8000/
3. Check browser DevTools → Network tab
4. Verify Content-Type headers include `charset=utf-8`
5. Run webhint.io accessibility check

## Troubleshooting

### If Python server doesn't start:
```bash
# Check Python version
python --version

# Install required modules
pip install --upgrade pip
```

### If port 8000 is busy:
Edit `server.py` and change `PORT = 8000` to another port like `PORT = 8080`

### For production deployment:
Use the `.htaccess` file with Apache or configure your web server with the same MIME types and headers.
