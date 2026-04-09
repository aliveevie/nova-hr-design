import { createEmailTransporter, emailConfig } from "../config/email.js";
import { env } from "../config/env.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let transporter: any = null;

const getTransporter = async () => {
  if (!transporter) {
    transporter = await createEmailTransporter();
  }
  return transporter;
};

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<{ success: boolean; previewUrl?: string; messageId?: string }> => {
  const payload = {
    from: emailConfig.from,
    to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]*>/g, ""),
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const transport = await getTransporter();
      const info = await transport.sendMail(payload);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log("✅ Email sent via Ethereal. Preview URL:", previewUrl);
        return { success: true, previewUrl, messageId: info.messageId };
      }
      console.log(`✅ Email sent successfully to ${options.to}. Message ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      const code = String(error?.code || "");
      const transient = code === "ETIMEDOUT" || code === "ESOCKET" || code === "ECONNECTION";
      console.error(`❌ Error sending email to ${options.to}:`, error.message || error);
      if (error.code) console.error(`   Error code: ${error.code}`);
      if (attempt === 1 && transient) {
        // Recreate transport and retry once for transient SMTP timeout/socket failures.
        transporter = null;
        continue;
      }
      return { success: false };
    }
  }
  return { success: false };
};

const loadTemplate = (templateName: string): string => {
  const file = `${templateName}.html`;
  // Try both runtime layouts:
  // 1) tsx/dev: backend/src/services -> ../templates
  // 2) tsc/dist: backend/dist/src/services -> ../../src/templates
  const candidates = [
    join(__dirname, "../templates", file),
    join(__dirname, "../../src/templates", file),
    join(process.cwd(), "src/templates", file),
  ];
  for (const p of candidates) {
    try {
      return readFileSync(p, "utf-8");
    } catch {
      // try next candidate
    }
  }
  console.error(`Error loading template ${templateName}: no template file found in known paths.`);
  return "";
};

const replaceTemplateVariables = (template: string, variables: Record<string, string>): string => {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
};

// Email functions for different events
export const sendLeaveRequestEmail = async (
  managerEmail: string,
  employeeName: string,
  leaveType: string,
  fromDate: string,
  toDate: string,
  days: number,
  reason?: string
) => {
  const template = loadTemplate("leave-request");
  const html = replaceTemplateVariables(template, {
    managerName: "Manager",
    employeeName,
    leaveType,
    fromDate,
    toDate,
    days: days.toString(),
    reason: reason || "No reason provided",
  });
  return sendEmail({
    to: managerEmail,
    subject: `Leave Request Submitted - ${employeeName}`,
    html,
  });
};

export const sendLeaveApprovalEmail = async (
  employeeEmail: string,
  employeeName: string,
  leaveType: string,
  fromDate: string,
  toDate: string,
  status: "Approved" | "Rejected"
) => {
  const template = loadTemplate(status === "Approved" ? "leave-approved" : "leave-rejected");
  const html = replaceTemplateVariables(template, {
    employeeName,
    leaveType,
    fromDate,
    toDate,
    status,
  });
  return sendEmail({
    to: employeeEmail,
    subject: `Leave Request ${status} - ${employeeName}`,
    html,
  });
};

export const sendPayrollEmail = async (
  employeeEmail: string,
  employeeName: string,
  month: string,
  year: string,
  netPay: number
) => {
  const template = loadTemplate("payroll-processed");
  const html = replaceTemplateVariables(template, {
    employeeName,
    month,
    year,
    netPay: netPay.toLocaleString(),
  });
  return sendEmail({
    to: employeeEmail,
    subject: `Payslip for ${month}/${year}`,
    html,
  });
};

export const sendWelcomeEmail = async (
  employeeEmail: string,
  employeeName: string,
  jobTitle: string,
  department: string
) => {
  const template = loadTemplate("welcome");
  const html = replaceTemplateVariables(template, {
    employeeName,
    jobTitle,
    department,
  });
  return sendEmail({
    to: employeeEmail,
    subject: `Welcome to NovaHR - ${employeeName}`,
    html,
  });
};

export const sendApplicantStatusEmail = async (
  applicantEmail: string,
  applicantName: string,
  position: string,
  status: string
) => {
  const template = loadTemplate("applicant-status");
  const html = replaceTemplateVariables(template, {
    applicantName,
    position,
    status,
  });
  return sendEmail({
    to: applicantEmail,
    subject: `Application Status Update - ${position}`,
    html,
  });
};

export const sendPerformanceReviewEmail = async (
  employeeEmail: string,
  employeeName: string,
  overallScore: number,
  rating: string
) => {
  const template = loadTemplate("performance-review");
  const html = replaceTemplateVariables(template, {
    employeeName,
    overallScore: overallScore.toString(),
    rating,
  });
  return sendEmail({
    to: employeeEmail,
    subject: `Performance Review Completed - ${employeeName}`,
    html,
  });
};

export const sendDisciplineEmail = async (
  employeeEmail: string,
  employeeName: string,
  type: string,
  reason: string
) => {
  const template = loadTemplate("discipline");
  const html = replaceTemplateVariables(template, {
    employeeName,
    type,
    reason,
  });
  return sendEmail({
    to: employeeEmail,
    subject: `Disciplinary Action - ${type}`,
    html,
  });
};

export const sendTrainingReminderEmail = async (
  employeeEmail: string,
  employeeName: string,
  trainingTitle: string,
  date: string
) => {
  const template = loadTemplate("training-reminder");
  const html = replaceTemplateVariables(template, {
    employeeName,
    trainingTitle,
    date,
  });
  return sendEmail({
    to: employeeEmail,
    subject: `Training Reminder - ${trainingTitle}`,
    html,
  });
};

export const sendEmployeeWelcomeWithLogin = async (
  employeeEmail: string,
  employeeName: string,
  jobTitle: string,
  department: string,
  password: string,
  loginUrl: string
) => {
  const template = loadTemplate("employee-welcome-login");
  const html = template
    ? replaceTemplateVariables(template, {
        employeeName,
        jobTitle,
        department,
        email: employeeEmail,
        password,
        loginUrl,
      })
    : `
      <h2>Welcome to GalaxyITT HR System</h2>
      <p>Hello ${employeeName}, your employee account has been created.</p>
      <p><strong>Email:</strong> ${employeeEmail}</p>
      <p><strong>Temporary Password:</strong> ${password}</p>
      <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
      <p>Please sign in and change your password immediately.</p>
    `;
  return sendEmail({
    to: employeeEmail,
    subject: `Welcome to GalaxyITT HR System - Your Login Credentials`,
    html,
  });
};

/** Same welcome email as admin “Add employee” / bulk upload — one code path for credentials. */
export const sendWelcomeEmailForNewEmployeeRow = async (
  employeeRow: {
    email: string;
    name: string;
    department: string;
    job_title?: string | null;
    jobTitle?: string | null;
  },
  tempPassword: string
) => {
  const loginUrl = `${env.FRONTEND_URL.replace(/\/$/, "")}/login`;
  const jobTitle = String(employeeRow.job_title ?? employeeRow.jobTitle ?? "");
  return sendEmployeeWelcomeWithLogin(
    employeeRow.email,
    employeeRow.name,
    jobTitle,
    employeeRow.department,
    tempPassword,
    loginUrl
  );
};

export const sendPasswordResetEmail = async (
  email: string,
  userName: string,
  resetUrl: string,
  expiresMinutes: number
) => {
  const template = loadTemplate("password-reset");
  const html = replaceTemplateVariables(template, {
    userName,
    resetUrl,
    expiresMinutes: String(expiresMinutes),
  });
  return sendEmail({
    to: email,
    subject: "Reset your NovaHR password",
    html,
  });
};

export const sendFirstLoginVerificationEmail = async (
  email: string,
  userName: string,
  verifyUrl: string,
  expiresMinutes: number
) => {
  const template = loadTemplate("first-login-verification");
  const html = replaceTemplateVariables(template, {
    userName,
    verifyUrl,
    expiresMinutes: String(expiresMinutes),
  });
  return sendEmail({
    to: email,
    subject: "Verify your first admin login - NovaHR",
    html,
  });
};

export const sendAdminLoginNotificationEmail = async (
  email: string,
  userName: string,
  ipAddress: string,
  userAgent: string
) => {
  const template = loadTemplate("admin-login-notification");
  const html = replaceTemplateVariables(template, {
    userName,
    ipAddress,
    userAgent,
    loginTime: new Date().toISOString(),
  });
  return sendEmail({
    to: email,
    subject: "Successful admin login detected - NovaHR",
    html,
  });
};
