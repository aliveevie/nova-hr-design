# HR System Backend API

Backend API for the HR Management System built with Node.js, Express, and TypeScript.

## Persistence Strategy

- **Production (Vercel):** Supabase Postgres (durable)
- **Local development:** LowDB JSON file (`database/db.json`) fallback

This prevents production data from being overwritten during deployments.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. For production, configure Supabase and run SQL schema:
- Open Supabase SQL editor
- Run `supabase/schema.sql`

## Running

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## Local Test Data Cleanup (dev only)

To clear local JSON test data safely:
```bash
npm run reset:local-db
```

This only affects your local `database/db.json`, not production Supabase data.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request reset link
- `POST /api/auth/reset-password` - Reset password using token

### Employees
- `GET /api/employees` - List employees
- `GET /api/employees/:id` - Get employee
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Deactivate employee
- `POST /api/employees/bulk-upload` - Bulk import employees

## Environment Variables

See `.env.example`. Important production values:

- `USE_SUPABASE=true`
- `SUPABASE_URL=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`
- `FRONTEND_URL=...`
- `PASSWORD_RESET_TOKEN_TTL_MINUTES=60`

## Password Reset Flow

- User enters email on forgot-password page
- Backend creates one-time token (hashed at rest) with expiry
- Email reset link is sent
- User sets a new password from reset page
- Token is invalidated after use
