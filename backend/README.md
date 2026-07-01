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

## Fingerprint attendance (DigitalPersona U.are.U + SourceAFIS)

The fingerprint flow is designed so end users **only install the free
DigitalPersona driver/client once** on their own Windows PC and then simply
visit the web app — no local server, no Docker, nothing else running on their
device.

How it works:

1. **User device:** install the free
   [HID Authentication Device Client ("Lite Client")](https://digitalpersona.hidglobal.com/lite-client/)
   once. It bundles the USB driver plus a background Windows service that lets
   browsers talk to the reader. (This is the "driver" users remember installing.)
2. **Browser:** the web app loads the DigitalPersona WebSDK and captures the
   fingerprint **as a PNG image** in the page (`SampleFormat.PngImage`).
3. **This backend (cloud, e.g. Render):** receives the PNG, extracts a template
   and runs 1:N matching with the open-source **SourceAFIS** engine, then
   records attendance. All matching happens server-side, so the reader can be
   on any user's device while the backend runs in the cloud.

### Server requirements

The matcher is a small Java program (`backend/fingerprint-matcher`) built into
a fat jar and invoked by Node. The provided `Dockerfile` builds this jar and
ships a headless JRE alongside Node, so **deploy the backend as a Docker
service** (Render supports Docker deploys):

- `FINGERPRINT_MATCHER_JAR` — path to the jar (set automatically in the image).
- `FINGERPRINT_DPI` — reader DPI used for extraction (default `500`).
- `FINGERPRINT_MATCH_THRESHOLD` — SourceAFIS score threshold (default `40`).
- `JAVA_BIN` — java binary (default `java`, on `PATH` in the image).

Apply the additive DB migration once:

```bash
npm run migrate:sourceafis
```

For local (non-Docker) dev of fingerprint matching you need Java 17+ installed
and the jar built:

```bash
cd fingerprint-matcher && mvn package    # produces target/fingerprint-matcher.jar
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
