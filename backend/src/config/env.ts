import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || "3001", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET || "secret-key",
  DATABASE_PATH: process.env.DATABASE_PATH || "./database/hr.db",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  // SMTP settings are fully controlled by your .env – no provider is hardcoded.
  // Configure these for *your* mail server (e.g. company SMTP, SendGrid, etc.).
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: parseInt(process.env.SMTP_PORT || "587", 10),
  SMTP_SECURE: process.env.SMTP_SECURE === "true",
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  EMAIL_FROM: process.env.EMAIL_FROM || "",
};

