const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_POR,
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
})


const sendMail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_ADDRESS,
            to,
            subject,
            html
        }

        await transporter.sendMail(mailOptions)
    } catch (error) {
        console.error('Error sending email:', error)
    }
}

module.exports = sendMail



