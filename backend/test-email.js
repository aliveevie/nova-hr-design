import dotenv from "dotenv";
dotenv.config();

// Import after dotenv config
const { sendEmployeeWelcomeWithLogin } = await import("./src/services/email.service.js");

// Test email sending
const testEmail = async () => {
  console.log("Testing email with Ethereal (Nodemailer test service)...");
  console.log("Using Ethereal for testing - emails will be captured, not delivered\n");

  try {
    const result = await sendEmployeeWelcomeWithLogin(
      "iabdulkarim@galaxyitt.com.ng",
      "Test Employee",
      "Software Developer",
      "IT",
      "TempPass123!@#",
      process.env.FRONTEND_URL || "http://localhost:8080"
    );
    
    if (result.success) {
      console.log("✅ Email sent successfully!");
      if (result.previewUrl) {
        console.log(`\n📧 Preview your email at: ${result.previewUrl}`);
        console.log("(This is an Ethereal test email - it was not actually delivered)");
      }
    } else {
      console.log("❌ Email sending failed");
    }
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};

testEmail();

