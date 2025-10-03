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

// // module.exports = sendMail;
// // utilities/sendMail.js
// const SibApiV3Sdk = require("sib-api-v3-sdk");

// const sendMail = async (to, subject, htmlContent) => {
//   try {
//     // Initialize Brevo client
//     const defaultClient = SibApiV3Sdk.ApiClient.instance;
//     const apiKey = defaultClient.authentications["api-key"];
//     apiKey.apiKey = process.env.BREVO_API_KEY; // Set in Render env

//     const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

//     const sender = {
//       email: process.env.BREVO_FROM_EMAIL, // must be from your verified Brevo domain
//       name: "FinStack",
//     };

//     const receivers = [{ email: to }];

//     // Send the email
//     const response = await tranEmailApi.sendTransacEmail({
//       sender,
//       to: receivers,
//       subject,
//       htmlContent,
//     });

//     console.log("✅ Email sent successfully:", response.messageId);
//   } catch (error) {
//     console.error("❌ Error sending email:", error.response?.body || error.message);
//     throw error;
//   }
// };

// module.exports = sendMail;
// utilities/sendMail.js

const {
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys
} = require('@getbrevo/brevo');

const transactionalEmailsApi = new TransactionalEmailsApi();

// set the API key (make sure BREVO_API_KEY is the xkeysib-... API key)
transactionalEmailsApi.setApiKey(
  TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

/**
 * sendMail - send an email via Brevo SDK
 * @param {string} to - recipient email
 * @param {string} subject - email subject
 * @param {string} htmlContent - html body
 * @param {string} [toName] - optional recipient name
 */
async function sendMail(to, subject, htmlContent, toName = '') {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not set in environment');
  }
  if (!process.env.BREVO_FROM_EMAIL) {
    throw new Error('BREVO_FROM_EMAIL is not set in environment');
  }

  try {
    const payload = {
      sender: {
        email: process.env.BREVO_FROM_EMAIL,
        name: 'FinStack'
      },
      to: [{ email: to}],
      subject,
      htmlContent,
      textContent: (htmlContent || '').replace(/<[^>]+>/g, '') // optional fallback plain text
    };

    const result = await transactionalEmailsApi.sendTransacEmail(payload);

    // the SDK normally returns an object with `body.messageId`
    const messageId = result?.body?.messageId ?? result?.messageId ?? JSON.stringify(result);
    console.log('✅ Email sent! Message ID:', messageId);

    return result;
  }  catch (err) {
  console.error(
    '❌ Brevo sendMail error:',
    err?.response?.body ?? err?.response ?? err?.message ?? err
  );
  throw err;
}
}

module.exports = sendMail;