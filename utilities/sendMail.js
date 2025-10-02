// utilities/sendMail.js
const SibApiV3Sdk = require("sib-api-v3-sdk");

const sendMail = async (to, subject, html) => {
  try {
    // Initialize client
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications["api-key"];
    apiKey.apiKey = process.env.BREVO_API_KEY; // put in Render env

    const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    // Sender must be from a verified domain in Brevo
    const sender = {
      email: process.env.EMAIL_ADDRESS, 
      name: "Finstack"
    };

    const receivers = [{ email: to }];

    await tranEmailApi.sendTransacEmail({
      sender,
      to: receivers,
      subject,
      htmlContent: html
    });

    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error("❌ Error sending email:", error.response?.body || error.message);
    throw error;
  }
};

module.exports = sendMail;
