# Chamber122 - Setup Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up database:**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

3. **Create `.env` file:**
   ```env
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="your-secret-key-change-in-production"
   ```

4. **Create uploads directory:**
   ```bash
   mkdir -p public/uploads
   ```

5. **Run server:**
   ```bash
   npm run dev
   ```

6. **Open browser:**
   ```
   http://localhost:4000
   ```

## Features

- ✅ User authentication (signup/login/logout)
- ✅ Business profile management
- ✅ File uploads (logo, gallery, documents)
- ✅ Events listing and creation
- ✅ Bulletins listing and creation
- ✅ No Supabase dependencies!

## API Endpoints

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `GET /api/business/me` - Get user's business
- `POST /api/business/upsert` - Create/update business
- `GET /api/events/public` - Get public events
- `POST /api/events/create` - Create event
- `GET /api/bulletins/public` - Get public bulletins
- `POST /api/bulletins/create` - Create bulletin
- `POST /api/upload` - Upload file

## Database

- Local: SQLite (`file:./dev.db`)
- Production: Postgres (set `DATABASE_URL` in `.env`)

## File Uploads

Files are stored in `public/uploads/` directory. For production, consider:
- Vercel Blob Storage
- Cloudflare R2
- AWS S3

## Troubleshooting

**Database errors?**
- Run `npx prisma migrate dev`
- Check `.env` file exists with correct `DATABASE_URL`

**Upload errors?**
- Ensure `public/uploads/` directory exists
- Check file permissions

**Auth not working?**
- Verify `JWT_SECRET` is set in `.env`
- Check browser cookies are enabled

