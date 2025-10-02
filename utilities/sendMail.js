// const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: process.env.PORT_MAIL,
//   auth: {
//     user: process.env.EMAIL_ADDRESS,
//     pass: process.env.EMAIL_PASSWORD
//   },
//   tls: {
//     rejectUnauthorized: false
//   }
// })


// const sendMail = async (to, subject, html) => {
//     try {
//         const mailOptions = {
//             from: process.env.EMAIL_ADDRESS,
//             to,
//             subject,
//             html
//         }

//         await transporter.sendMail(mailOptions)
//     } catch (error) {
//         console.error('Error sending email:', error)
//     }
// }

// module.exports = sendMail

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendMail(to, subject, html) {
  try {
    const info = await transporter.sendMail({
      from: `"Finstack" <iwegbuvictor020@gmail.com>`, // sender
      to, // recipient
      subject,
      html,
    });
    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
}

module.exports = sendMail;


