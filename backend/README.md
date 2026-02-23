# HR System Backend API

Backend API for the HR Management System built with Node.js, Express, TypeScript, and SQLite.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- No build tools required! Uses lowdb (JSON file storage)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. The database will be automatically created on first run.

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

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Employees
- `GET /api/employees` - List employees
- `GET /api/employees/:id` - Get employee
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Other endpoints follow similar patterns for:
- `/api/applicants` - Recruitment
- `/api/attendance` - Attendance
- `/api/leave` - Leave management
- `/api/payroll` - Payroll
- `/api/performance` - Performance reviews
- `/api/training` - Training records
- `/api/discipline` - Disciplinary records
- `/api/holidays` - Holidays

## Email Configuration

The system uses nodemailer for email notifications. Configure SMTP settings in `.env`:
- `SMTP_HOST` - SMTP server host
- `SMTP_PORT` - SMTP port (usually 587)
- `SMTP_USER` - Email username
- `SMTP_PASS` - Email password
- `EMAIL_FROM` - From email address

## Database

JSON database file is stored at `./database/db.json`. The database is automatically created on first run with all necessary collections.

## Default User

- Email: `mabubakar@galaxyitt.com.ng`
- Password: `mabubukar$#!0024!`

