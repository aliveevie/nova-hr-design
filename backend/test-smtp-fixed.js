import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const SMTP_HOST = "mail.galaxyitt.com.ng";
const SMTP_PORT = 465;
const SMTP_SECURE = true; // Port 465 requires SSL/TLS
const SMTP_USER = "hr-noreply@galaxyitt.com.ng";
const SMTP_PASS = process.env.SMTP_PASS; // From .env
const EMAIL_FROM = "hr-noreply@galaxyitt.com.ng";

console.log("=".repeat(70));
console.log("🔧 TESTING FIXED SMTP CONFIGURATION");
console.log("=".repeat(70));
console.log();
console.log("Configuration:");
console.log("  Host:", SMTP_HOST);
console.log("  Port:", SMTP_PORT);
console.log("  Secure:", SMTP_SECURE, "(SSL/TLS required for port 465)");
console.log("  User:", SMTP_USER);
console.log("  Password:", SMTP_PASS ? "✅ SET" : "❌ NOT SET");
console.log("  From:", EMAIL_FROM);
console.log();

if (!SMTP_PASS) {
  console.log("❌ ERROR: SMTP_PASS not found in .env file");
  console.log("   Please ensure SMTP_PASS is set in backend/.env");
  process.exit(1);
}

console.log("📡 Creating SMTP transporter...");
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Accept self-signed certificates if needed
    ciphers: "SSLv3",
  },
  connectionTimeout: 20000, // 20 seconds
  greetingTimeout: 20000,
  socketTimeout: 20000,
  debug: true,
  logger: true,
});

console.log("🔍 Step 1: Verifying SMTP connection...");
try {
  await transporter.verify();
  console.log("✅ SMTP connection verified successfully!");
  console.log();
  
  console.log("📧 Step 2: Sending test email...");
  const testInfo = await transporter.sendMail({
    from: EMAIL_FROM,
    to: "iabdulkarim@galaxyitt.com.ng",
    subject: "SMTP Test - GalaxyITT HR System",
    text: "This is a test email from the GalaxyITT HR System SMTP server.",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #2563eb;">SMTP Test Email</h2>
        <p>This is a <strong>test email</strong> from the <strong>GalaxyITT HR System</strong>.</p>
        <p>If you receive this email, the SMTP configuration is working correctly!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Sent from: ${SMTP_HOST}:${SMTP_PORT} (SSL/TLS)
        </p>
      </div>
    `,
  });
  
  console.log("✅ Test email sent successfully!");
  console.log("   Message ID:", testInfo.messageId);
  console.log("   Response:", testInfo.response);
  console.log();
  console.log("=".repeat(70));
  console.log("✅ SUCCESS! Email configuration is working!");
  console.log("=".repeat(70));
  console.log();
  console.log("📝 Update your .env file with these settings:");
  console.log("   SMTP_HOST=mail.galaxyitt.com.ng");
  console.log("   SMTP_PORT=465");
  console.log("   SMTP_SECURE=true");
  console.log("   SMTP_USER=hr-noreply@galaxyitt.com.ng");
  console.log("   SMTP_PASS=<your-password>");
  console.log("   EMAIL_FROM=hr-noreply@galaxyitt.com.ng");
  
} catch (error) {
  console.log("❌ Error occurred!");
  console.log("   Error Code:", error.code || "UNKNOWN");
  console.log("   Error Message:", error.message);
  
  if (error.command) {
    console.log("   Failed Command:", error.command);
  }
  
  if (error.response) {
    console.log("   Server Response:", error.response);
  }
  
  console.log();
  console.log("💡 Troubleshooting:");
  if (error.code === "ETIMEDOUT") {
    console.log("   - Server is not responding");
    console.log("   - Check if firewall is blocking port 465");
    console.log("   - Verify server is accessible from your network");
  } else if (error.code === "EAUTH") {
    console.log("   - Authentication failed");
    console.log("   - Verify SMTP_USER and SMTP_PASS are correct");
  } else if (error.code === "ECONNREFUSED") {
    console.log("   - Connection refused");
    console.log("   - Port 465 may be blocked or wrong");
  } else if (error.code === "ESOCKET") {
    console.log("   - Socket error");
    console.log("   - Check network connectivity");
  }
  
  console.log();
  console.log("=".repeat(70));
  console.log("❌ Email configuration test failed");
  console.log("=".repeat(70));
  process.exit(1);
}

