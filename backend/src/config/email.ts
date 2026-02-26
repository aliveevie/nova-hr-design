import nodemailer from "nodemailer";
import { env } from "./env.js";

let cachedTestAccount: any = null;

export const createEmailTransporter = async () => {
  // Use Ethereal for testing if SMTP_HOST is not configured or is set to 'ethereal'
  if (!env.SMTP_HOST || env.SMTP_HOST === "ethereal" || env.NODE_ENV === "development") {
    // Create or reuse Ethereal test account
    if (!cachedTestAccount) {
      cachedTestAccount = await nodemailer.createTestAccount();
      console.log("Ethereal test account created:");
      console.log("  User:", cachedTestAccount.user);
      console.log("  Pass:", cachedTestAccount.pass);
      console.log("  Web:", cachedTestAccount.web);
    }

    return nodemailer.createTransport({
      host: cachedTestAccount.smtp.host,
      port: cachedTestAccount.smtp.port,
      secure: cachedTestAccount.smtp.secure,
      auth: {
        user: cachedTestAccount.user,
        pass: cachedTestAccount.pass,
      },
    });
  }

  // Use real SMTP for production
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    throw new Error("SMTP configuration is missing. Please check your .env file.");
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

export const emailConfig = {
  from: env.EMAIL_FROM,
};

