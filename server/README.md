# Chamber122 Backend Server

Express + SQLite backend API for Chamber122.

## Setup

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Configure environment (optional):**
   ```bash
   cp .env.example .env
   # Edit .env if needed
   ```

3. **Start server:**
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create user account
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Business
- `POST /api/business/upsert` - Create/update business
- `GET /api/business/me` - Get current user's business

### Uploads
- `POST /api/upload` - Upload single file
- `POST /api/upload/multiple` - Upload multiple files

### Events
- `GET /api/events/public` - Get public events
- `POST /api/events/create` - Create event

### Bulletins
- `GET /api/bulletins/public` - Get public bulletins
- `POST /api/bulletins/create` - Create bulletin

## Database

SQLite database is automatically created at `server/data.db` on first run.

Schema includes:
- `users` - User accounts
- `businesses` - Business profiles
- `business_media` - Business media files
- `events` - Events
- `bulletins` - Bulletins

## File Uploads

Uploaded files are stored in `server/uploads/{userId}/` directory.

Public URLs are served at `/uploads/{userId}/{filename}`.

## Development

The server runs on port 4000 by default and serves static files from the parent directory.

For production, configure a reverse proxy (nginx, etc.) to serve static files and proxy `/api/*` to this server.

