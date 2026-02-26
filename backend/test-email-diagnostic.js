import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

console.log("=".repeat(60));
console.log("📧 NODEMAILER EMAIL DIAGNOSTIC TEST");
console.log("=".repeat(60));
console.log();

// Step 1: Check environment variables
console.log("1️⃣  Checking Environment Variables:");
console.log("   SMTP_HOST:", process.env.SMTP_HOST || "❌ NOT SET");
console.log("   SMTP_PORT:", process.env.SMTP_PORT || "❌ NOT SET");
console.log("   SMTP_SECURE:", process.env.SMTP_SECURE || "❌ NOT SET");
console.log("   SMTP_USER:", process.env.SMTP_USER ? "✅ SET (hidden)" : "❌ NOT SET");
console.log("   SMTP_PASS:", process.env.SMTP_PASS ? "✅ SET (hidden)" : "❌ NOT SET");
console.log("   EMAIL_FROM:", process.env.EMAIL_FROM || "❌ NOT SET");
console.log("   NODE_ENV:", process.env.NODE_ENV || "development");
console.log();

// Step 2: Test Ethereal (should always work)
console.log("2️⃣  Testing Ethereal (Nodemailer Test Service):");
try {
  const testAccount = await nodemailer.createTestAccount();
  console.log("   ✅ Ethereal account created successfully");
  console.log("   User:", testAccount.user);
  console.log("   SMTP Host:", testAccount.smtp.host);
  console.log("   SMTP Port:", testAccount.smtp.port);
  console.log("   Secure:", testAccount.smtp.secure);
  
  const etherealTransporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  
  const etherealInfo = await etherealTransporter.sendMail({
    from: `"Test" <${testAccount.user}>`,
    to: "test@example.com",
    subject: "Ethereal Test",
    text: "This is a test email from Ethereal",
    html: "<p>This is a test email from <b>Ethereal</b></p>",
  });
  
  const previewUrl = nodemailer.getTestMessageUrl(etherealInfo);
  console.log("   ✅ Ethereal email sent successfully!");
  console.log("   Preview URL:", previewUrl);
} catch (error) {
  console.log("   ❌ Ethereal test failed:", error.message);
}
console.log();

// Step 3: Test Real SMTP (if configured)
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  console.log("3️⃣  Testing Real SMTP Configuration:");
  console.log("   Host:", process.env.SMTP_HOST);
  console.log("   Port:", process.env.SMTP_PORT);
  console.log("   Secure:", process.env.SMTP_SECURE === "true");
  console.log("   User:", process.env.SMTP_USER);
  
  try {
    const smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Accept self-signed certificates
      },
      // Connection timeout
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
    
    // Verify connection
    console.log("   🔍 Verifying SMTP connection...");
    await smtpTransporter.verify();
    console.log("   ✅ SMTP connection verified successfully!");
    
    // Try sending a test email
    console.log("   🔍 Attempting to send test email...");
    const testInfo = await smtpTransporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: "iabdulkarim@galaxyitt.com.ng",
      subject: "SMTP Test Email",
      text: "This is a test email from your SMTP server",
      html: "<p>This is a <b>test email</b> from your SMTP server</p>",
    });
    
    console.log("   ✅ Test email sent successfully!");
    console.log("   Message ID:", testInfo.messageId);
    console.log("   Response:", testInfo.response);
  } catch (error) {
    console.log("   ❌ SMTP test failed!");
    console.log("   Error Code:", error.code);
    console.log("   Error Message:", error.message);
    console.log("   Error Command:", error.command);
    
    if (error.code === "ETIMEDOUT" || error.code === "ECONNREFUSED") {
      console.log();
      console.log("   💡 Possible Issues:");
      console.log("      - SMTP server is not reachable");
      console.log("      - Firewall blocking the connection");
      console.log("      - Wrong SMTP_HOST or SMTP_PORT");
      console.log("      - Server requires VPN or specific network");
    } else if (error.code === "EAUTH") {
      console.log();
      console.log("   💡 Possible Issues:");
      console.log("      - Wrong SMTP_USER or SMTP_PASS");
      console.log("      - Account requires app-specific password");
      console.log("      - Account is locked or disabled");
    } else if (error.code === "ECONNRESET") {
      console.log();
      console.log("   💡 Possible Issues:");
      console.log("      - Connection was reset by server");
      console.log("      - Server requires STARTTLS");
      console.log("      - Try setting SMTP_SECURE=false");
    }
  }
} else {
  console.log("3️⃣  Skipping Real SMTP Test (not configured)");
  console.log("   To test real SMTP, set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env");
}
console.log();

// Step 4: Check current email config logic
console.log("4️⃣  Current Configuration Logic:");
const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
const isDevelopment = (process.env.NODE_ENV || "development") === "development";
const useEthereal = !process.env.SMTP_HOST || process.env.SMTP_HOST === "ethereal" || isDevelopment;

console.log("   Has SMTP Config:", hasSmtpConfig ? "✅ Yes" : "❌ No");
console.log("   Is Development:", isDevelopment ? "✅ Yes" : "❌ No");
console.log("   Will Use Ethereal:", useEthereal ? "✅ Yes" : "❌ No");
console.log();

if (hasSmtpConfig && useEthereal) {
  console.log("   ⚠️  WARNING: You have SMTP configured but the system will use Ethereal!");
  console.log("   This is because NODE_ENV=development forces Ethereal mode.");
  console.log("   To use real SMTP, either:");
  console.log("     1. Set NODE_ENV=production");
  console.log("     2. Or modify the email config to check SMTP_HOST first");
}

console.log("=".repeat(60));
console.log("✅ Diagnostic test completed!");
console.log("=".repeat(60));

