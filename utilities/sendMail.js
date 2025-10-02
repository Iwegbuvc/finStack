const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // should be smtp.gmail.com
  port: process.env.SMTP_PORT, // should be 587
  secure: false, // use STARTTLS (true = 465, false = 587)
  auth: {
    user: process.env.EMAIL_ADDRESS,   // your Gmail
    pass: process.env.EMAIL_PASSWORD,  // your Gmail App Password
  },
  tls: {
    rejectUnauthorized: false, // allow self-signed certs (avoid SSL issues on Render)
  },
});

const sendMail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_ADDRESS,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = sendMail;
