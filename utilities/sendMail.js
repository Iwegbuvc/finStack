// // utilities/sendMail.js
// const nodemailer = require("nodemailer");

// const transporter = nodemailer.createTransport({
//   host: "smtp-relay.brevo.com",
//   port: 587,
//   secure: false, // use true if port is 465
//   auth: {
//     user: "986536001@smtp-brevo.com", // your Brevo SMTP login
//     pass: "9bxVNFOZPwUpajzs", // your Brevo SMTP password
//   },
// });

// const sendMail = async (to, subject, html) => {
//   try {
//     const info = await transporter.sendMail({
//       from: '"FinStack" <hello@usefinstack.co>', // must be verified domain/email
//       to,
//       subject,
//       html,
//     });

//     console.log("✅ Email sent:", info.messageId);
//   } catch (error) {
//     console.error("❌ Error sending email:", error);
//   }
// };

// module.exports = sendMail;
// utilities/sendMail.js
const SibApiV3Sdk = require("sib-api-v3-sdk");

const sendMail = async (to, subject, htmlContent) => {
  try {
    // Initialize Brevo client
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications["api-key"];
    apiKey.apiKey = process.env.BREVO_API_KEY; // Set in Render env

    const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    const sender = {
      email: process.env.BREVO_FROM_EMAIL, // must be from your verified Brevo domain
      name: "FinStack",
    };

    const receivers = [{ email: to }];

    // Send the email
    const response = await tranEmailApi.sendTransacEmail({
      sender,
      to: receivers,
      subject,
      htmlContent,
    });

    console.log("✅ Email sent successfully:", response.messageId);
  } catch (error) {
    console.error("❌ Error sending email:", error.response?.body || error.message);
    throw error;
  }
};

module.exports = sendMail;
