// utilities/otp.util.js
const otpGenerator = require('otp-generator');
const OtpCode = require('../models/otpModels');
const logger = require('./logger'); // Your existing logger utility

// 💡 IMPORT YOUR EXISTING BREVO SENDING FUNCTION
const sendMail = require('./sendMail'); // Adjust the path if necessary, e.g., require('./sendMail')

// ----------------------------------------------------
// The sendEmail wrapper function is NO LONGER needed. 
// We will call sendMail directly within generateAndSendOtp.
// ----------------------------------------------------


// Generates, saves, and sends the OTP
const generateAndSendOtp = async (userId, action, email) => {
    try {
        // 1. Generate 6-digit numeric OTP
        const code = otpGenerator.generate(6, { 
            upperCaseAlphabets: false, 
            lowerCaseAlphabets: false, 
            specialChars: false 
        });

        // 2. Set expiration time (5 minutes)
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        // 3. Save to database
        // Delete any previous pending OTP for the same user/action first
        await OtpCode.deleteMany({ userId, action }); 
        await OtpCode.create({ userId, code, action, expiresAt });

        // 4. Send email using your existing Brevo sendMail function
        const emailSubject = `Your Finstack Withdrawal Verification Code`;
        const emailBody = `
            <p>Hello,</p>
            <p>You requested a withdrawal from your Finstack wallet. Please use the code below to complete your transaction:</p>
            <h2 style="color: #3f51b5; font-size: 24px;">${code}</h2>
            <p>This code is valid for 5 minutes. If you did not initiate this withdrawal, please ignore this email.</p>
            <p>Thank you,<br>The Finstack Team</p>
        `;
        
        // 💡 Direct call to your imported sendMail function:
        await sendMail(
            email,            // to
            emailSubject,     // subject
            emailBody         // htmlContent
        );

        logger.info(`📧 OTP Sent via Brevo to ${email} for action: ${action}`);
        return code;
    } catch (error) {
        logger.error(`❌ OTP Generation/Sending Error: ${error.message}`);
        // Re-throw the error to be caught by the controller
        throw new Error("Failed to generate and send OTP for withdrawal."); 
    }
};

// Verifies the user-provided OTP (NO CHANGE)
const verifyOtp = async (userId, code, action) => {
    const otpRecord = await OtpCode.findOne({ 
        userId, 
        code, 
        action,
        expiresAt: { $gt: Date.now() } 
    });

    if (!otpRecord) {
        return false; 
    }

    await OtpCode.deleteOne({ _id: otpRecord._id });
    
    return true;
};

module.exports = { generateAndSendOtp, verifyOtp };