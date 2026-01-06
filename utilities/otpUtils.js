const otpGenerator = require('otp-generator');
const OtpCode = require('../models/otpModels');
const logger = require('./logger'); // Your existing logger utility

// 💡 IMPORT YOUR EXISTING BREVO SENDING FUNCTION
const sendMail = require('./sendMail'); // Adjust the path if necessary

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

        // 4. Determine Email Content based on Action (NEW LOGIC)
        let emailSubject = `Your Finstack Verification Code`;
        let transactionType = 'transaction';
        let contextMessage = 'Please use the code below to complete your action:';
        
        // Use a switch statement to customize content
        switch (action) {
            case 'WITHDRAWAL':
                transactionType = 'withdrawal';
                emailSubject = `Your Finstack Withdrawal Verification Code`;
                contextMessage = 'You requested a withdrawal from your Finstack wallet. Please use the code below to complete your transaction:';
                break;
            case 'P2P_SETTLEMENT':
                transactionType = 'P2P Trade Settlement';
                emailSubject = `Finstack P2P Settlement Confirmation Code`;
                contextMessage = 'You are confirming the receipt of external payment for a P2P trade. Use the code below to release the escrowed asset:';
                break;
            // Add other actions (e.g., 'LOGIN', 'PASSWORD_RESET') as needed
            default:
                // Default messages for unknown actions
                break;
        }

        const emailBody = `
            <p>Hello,</p>
            <p>${contextMessage}</p>
            <h2 style="color: #3f51b5; font-size: 24px;">${code}</h2>
            <p>This code is valid for 5 minutes. If you did not initiate this ${transactionType}, please ignore this email.</p>
            <p>Thank you,<br>The Finstack Team</p>
        `;
        
        // 5. Send email
        await sendMail(
            email,            // to
            emailSubject,     // subject
            emailBody         // htmlContent
        );

        logger.info(`📧 OTP Sent via Brevo to ${email} for action: ${action}`);
        return code;
    } catch (error) {
        // Ensure the error message includes the action type for better debugging
        logger.error(`❌ OTP Generation/Sending Error for ${action}: ${error.message}`);
        // Re-throw the error with a dynamic message
        throw new Error(`Failed to generate and send OTP for ${action}.`); 
    }
};

// Verifies the user-provided OTP (NO CHANGE)
// ✅ FIXED SIGNATURE (matches your service usage)
const verifyOtp = async (userId, action, code) => {
    const normalizedCode = String(code).trim();

    const otpRecord = await OtpCode.findOne({ 
        userId,
        action,
        code: normalizedCode,
        expiresAt: { $gt: Date.now() }
    });

    if (!otpRecord) {
        return false;
    }

    // Single-use OTP
    await OtpCode.deleteOne({ _id: otpRecord._id });

    return true;
};


module.exports = { generateAndSendOtp, verifyOtp };