import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const SMTP_HOST = process.env.SMTP_HOST || "mail.galaxyitt.com.ng";
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;

console.log("=".repeat(70));
console.log("🔍 SMTP SERVER CONNECTION TEST");
console.log("=".repeat(70));
console.log();
console.log("Configuration:");
console.log("  Host:", SMTP_HOST);
console.log("  User:", SMTP_USER || "❌ NOT SET");
console.log("  From:", EMAIL_FROM);
console.log();

// Test configurations to try
const testConfigs = [
  { port: 587, secure: false, name: "Port 587 (STARTTLS)" },
  { port: 465, secure: true, name: "Port 465 (SSL/TLS)" },
  { port: 25, secure: false, name: "Port 25 (Standard SMTP)" },
  { port: 2525, secure: false, name: "Port 2525 (Alternative)" },
];

async function testConnection(config) {
  console.log(`\n📡 Testing: ${config.name}`);
  console.log(`   Port: ${config.port}, Secure: ${config.secure}`);
  console.log("   Attempting connection...");

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: config.port,
    secure: config.secure,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: "SSLv3",
    },
    connectionTimeout: 15000, // 15 seconds
    greetingTimeout: 15000,
    socketTimeout: 15000,
    debug: true, // Enable debug output
    logger: true, // Enable logging
  });

  try {
    // Test 1: Verify connection
    console.log("   Step 1: Verifying SMTP connection...");
    await transporter.verify();
    console.log("   ✅ Connection verified successfully!");
    
    // Test 2: Send test email
    console.log("   Step 2: Sending test email...");
    const testInfo = await transporter.sendMail({
      from: EMAIL_FROM,
      to: "iabdulkarim@galaxyitt.com.ng",
      subject: "SMTP Connection Test",
      text: `This is a test email sent from ${SMTP_HOST} on port ${config.port}`,
      html: `<p>This is a <b>test email</b> sent from <code>${SMTP_HOST}</code> on port <code>${config.port}</code></p>`,
    });
    
    console.log("   ✅ Test email sent successfully!");
    console.log("   Message ID:", testInfo.messageId);
    console.log("   Response:", testInfo.response);
    
    return { success: true, config, info: testInfo };
  } catch (error) {
    console.log("   ❌ Connection failed!");
    console.log("   Error Code:", error.code || "UNKNOWN");
    console.log("   Error Message:", error.message);
    
    if (error.command) {
      console.log("   Failed Command:", error.command);
    }
    
    // Provide specific guidance based on error
    if (error.code === "ETIMEDOUT") {
      console.log("   💡 Server is not responding - may be unreachable or firewall blocked");
    } else if (error.code === "ECONNREFUSED") {
      console.log("   💡 Connection refused - port may be closed or wrong");
    } else if (error.code === "EAUTH") {
      console.log("   💡 Authentication failed - check username/password");
    } else if (error.code === "ECONNRESET") {
      console.log("   💡 Connection reset - server may require different settings");
    } else if (error.code === "ENOTFOUND") {
      console.log("   💡 Hostname not found - check SMTP_HOST");
    }
    
    return { success: false, config, error };
  }
}

async function runTests() {
  if (!SMTP_USER || !SMTP_PASS) {
    console.log("❌ SMTP_USER or SMTP_PASS not set in .env file");
    console.log("   Please check your .env configuration");
    return;
  }

  const results = [];
  
  for (const config of testConfigs) {
    const result = await testConnection(config);
    results.push(result);
    
    // If one works, we can stop
    if (result.success) {
      console.log("\n" + "=".repeat(70));
      console.log("✅ SUCCESS! Working configuration found:");
      console.log(`   Port: ${result.config.port}`);
      console.log(`   Secure: ${result.config.secure}`);
      console.log("=".repeat(70));
      break;
    }
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(70));
  
  const successful = results.find(r => r.success);
  if (successful) {
    console.log("✅ Working Configuration:");
    console.log(`   Port: ${successful.config.port}`);
    console.log(`   Secure: ${successful.config.secure}`);
    console.log(`   Update your .env with:`);
    console.log(`   SMTP_PORT=${successful.config.port}`);
    console.log(`   SMTP_SECURE=${successful.config.secure}`);
  } else {
    console.log("❌ No working configuration found");
    console.log("\n💡 Troubleshooting suggestions:");
    console.log("   1. Verify SMTP_HOST is correct: " + SMTP_HOST);
    console.log("   2. Check if server requires VPN or specific network");
    console.log("   3. Contact your email provider for correct SMTP settings");
    console.log("   4. Check firewall rules for outbound SMTP ports");
    console.log("   5. Verify SMTP_USER and SMTP_PASS are correct");
  }
  console.log("=".repeat(70));
}

runTests().catch(console.error);

