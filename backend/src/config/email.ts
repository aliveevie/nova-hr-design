import nodemailer from "nodemailer";
import { env } from "./env.js";

let cachedTestAccount: any = null;

export const createEmailTransporter = async () => {
  // Priority 1: If SMTP_HOST is explicitly set and not "ethereal", use real SMTP
  if (env.SMTP_HOST && env.SMTP_HOST !== "ethereal" && env.SMTP_USER && env.SMTP_PASS) {
    console.log("Using real SMTP server:", env.SMTP_HOST);
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE, // true for 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Accept self-signed certificates
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  // Priority 2: Use Ethereal for testing (when SMTP not configured or explicitly set to "ethereal")
  console.log("Using Ethereal test account (SMTP not configured or set to 'ethereal')");
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
};

export const emailConfig = {
  from: env.EMAIL_FROM,
};

