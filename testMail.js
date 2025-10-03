// testMail.js
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");

async function testMail() {
  try {
    // Setup client
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications["api-key"];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    // Define sender and receiver
    const sender = {
      email: process.env.BREVO_FROM_EMAIL,
      name: "FinStack Test",
    };

    const receivers = [{ email: "yourpersonalemail@gmail.com" }]; // change to your email

    // Send test email
    const response = await tranEmailApi.sendTransacEmail({
      sender,
      to: receivers,
      subject: "✅ Brevo SDK Test",
      htmlContent: "<h1>Hello from Brevo SDK 🎉</h1><p>If you see this, it works!</p>",
    });

    console.log("✅ Email sent successfully:", response);
  } catch (error) {
    console.error("❌ Brevo sendMail error:", error.response?.body || error.message);
  }
}

testMail();
