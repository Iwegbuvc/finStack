const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { generateNewUserMail, generateVerificationSuccessMail, generateVerificationRequest, forgotPasswordMail, generatePasswordResetMail } = require('../utilities/mailGenerator');
const sendMail = require('../utilities/sendMail');

// Register New User
const registerUser = async (req, res) => {
    try {
        const {firstName, lastName, email, password, howYouHeardAboutUs} = req.body;
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if(existingUser){
            return res.status(400).json({message: 'User already exists'});
        }
        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Email Verification Code Generation
        const verification = jwt.sign( {email}, process.env.EMAIL_VERIFICATION_SECRET,{ expiresIn: '1h' });
        const html = generateNewUserMail(verification, firstName);
        // Create User
        const newUser = await User.create({firstName,lastName, email, password: hashedPassword, howYouHeardAboutUs,verificationCode: verification});
        // Send Verification Email        
        await sendMail(email, "Welcome to Finstack", html);
        return res.status(201).json({ message: 'User registered successfully', });

    } catch (error) {
         //Enhanced Duplicate Key Error Handling
        if (error.code === 11000) {
            // Get which field caused the duplicate
            const duplicateField = Object.keys(error.keyValue)[0];
            return res.status(400).json({ 
                message: `${duplicateField} already exists` 
            });
        }
        res.status(500).json({message: 'Server Error', error: error.message});
    }
}
// Verify Email
const verifyEmail = async (req, res) => {
  const { verificationCode } = req.params;
  if (!verificationCode) {
    return res.status(400).json({ message: "Verification token required" });
  }
  try {
    // Verify the token and extract email
    const decoded = jwt.verify(
      verificationCode,
      process.env.EMAIL_VERIFICATION_SECRET
    );

// Find user by verification code
    const user = await User.findOne({ verificationCode });
    if (!user || user.email !== decoded.email) {
      return res.status(401).json({ message: "Invalid or expired verification code" });
    }
// Check if already verified
    user.isVerified = true;
    user.verificationCode = null;
    await user.save();
// Send confirmation email
    const html = generateVerificationSuccessMail(user.firstName);
    await sendMail(user.email, "Email Verified - Finstack", html);
// Respond with success
    return res.status(200).json({ message: "Email verified successfully", user: { firstName: user.firstName, lastName: user.lastName, email: user.email, isVerified: user.isVerified } });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
// Resend Verification Code
const resendVerificationCode = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email required" });
  }
  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "Email already verified" });
    // Generate new verification code
    const verification_code = jwt.sign(
      { email },
      process.env.EMAIL_VERIFICATION_SECRET,
      { expiresIn: "1h" }
    );
    // Update user with new code
    user.verificationCode = verification_code;
    await user.save();
// Send verification email
    const html = generateVerificationRequest(user.firstName, verification_code);
    await sendMail(user.email, "Email Verification - Finstack", html);
// Respond with success
    return res.status(200).json({ message: "Verification code resent successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
// User Login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
// Check required fields
    if (!email || !password) {
      return res.status(400).json({ message: "Enter required fields" });
    }
// Find user by email
    const foundUser = await User.findOne({ email });
    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }
    // Compare password
    const passwordMatch = await bcrypt.compare(password, foundUser.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    // Check if email is verified
    if (!foundUser.isVerified) {
      return res.status(400).json({ message: "Email not verified" });
    }
    // Generate access 
    const accessToken = jwt.sign(
      { id: foundUser._id, email: foundUser.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );
// Generate refresh token
    const newRefreshToken = jwt.sign(
      { id: foundUser._id, email: foundUser.email },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );
    // Store refresh token in DB
    foundUser.refreshToken.push(newRefreshToken);
    await foundUser.save();
    // Send refresh token in cookie (secure in production)
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: false, // change to true if using https
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    // Exclude sensitive fields
    const { password: p, refreshToken, verificationCode, resetPasswordToken, ...safeUser } = foundUser.toObject();
// Respond with user data and access token
    return res.status(200).json({
      message: "User login successful",
      user: { ...safeUser, accessToken },
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
// forgot password
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Enter your email" });
  }

  try {
    const foundUser = await User.findOne({ email });
    if (!foundUser) {
      return res.status(404).json({ message: "User does not exist" });
    }

    // Generate reset token (JWT)
    const resetToken = jwt.sign(
      { email: foundUser.email },
      process.env.PASSWORD_RESET_TOKEN,
      { expiresIn: "1h" }
    );

    // Save token in DB
    foundUser.resetPasswordToken = resetToken;
    await foundUser.save();

    // Send email
    const html = forgotPasswordMail(foundUser.firstName, resetToken);
    await sendMail(foundUser.email, "Reset Your Password - Finstack", html);

    return res
      .status(200)
      .json({ message: "Reset password link sent successfully", email });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// Reset Password
const resetPassword = async (req, res) => {
  const { resetToken, password } = req.body;

  if (!resetToken || !password) {
    return res.status(400).json({
      message: "Enter required fields",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(resetToken, process.env.PASSWORD_RESET_TOKEN);

    // Find user by token
    const foundUser = await User.findOne({ 
      email: decoded.email, 
      resetPasswordToken: resetToken 
    });

    if (!foundUser) {
      return res.status(401).json({ message: "Invalid or expired reset token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prevent reusing old password
    const isSamePassword = await bcrypt.compare(password, foundUser.password);
    if (isSamePassword) {
      return res.status(400).json({ message: "New password cannot be the same as the old password" });
    }

    // Update password & clear reset token
    foundUser.password = hashedPassword;
    foundUser.resetPasswordToken = null;
    await foundUser.save();

    // Send confirmation email
    const html = generatePasswordResetMail(foundUser.firstName);
    await sendMail(foundUser.email, "Password Reset - Finstack", html);

    return res.status(200).json({
      message: "Password reset successfully",
    });

  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



module.exports = {registerUser, verifyEmail, resendVerificationCode, loginUser, forgotPassword, resetPassword};


// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
// const User = require("../models/userModel");
// const { generateOTP } = require("../utilities/otpGenerator");
// const { sendVerificationEmail } = require("../utilities/sendVerificationEmail");


// // 📌 REGISTER with OTP
// const registerUser = async (req, res) => {
//   try {
//     const { firstName, lastName, email, password, phoneNumber } = req.body;

//     const existingUser = await User.findOne({ email });
//     if (existingUser && existingUser.isVerified) {
//       return res.status(400).json({ message: "User already registered, proceed to login" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const otp = generateOTP();

//     const user = await User.findOneAndUpdate(
//       { email },
//       {
//         firstName,
//         lastName,
//         email,
//         password: hashedPassword,
//         phoneNumber,
//         otp,
//         otpExpires: Date.now() + parseInt(process.env.OTP_EXPIRES_IN) // 10 mins
//       },
//       { new: true, upsert: true }
//     );

//     await sendVerificationEmail(user.email, otp, user.firstName);

//     return res.status(201).json({ message: "OTP sent to your email. Verify to continue." });
//   } catch (error) {
//     return res.status(500).json({ message: "Server error", error: error.message });
//   }
// };


// // 📌 VERIFY OTP for account activation
// const verifyAccount = async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: "User not found" });
//     if (user.isVerified) return res.status(400).json({ message: "Account already verified" });

//     // if (user.otp !== otp || user.otpExpires < Date.now()) {
//     //   return res.status(400).json({ message: "Invalid or expired OTP" });
//     // }
//     if (!user.otp || !user.otpExpires || user.otp !== otp || user.otpExpires < Date.now()) {
//   return res.status(400).json({ message: "Invalid or expired OTP" });
// }


//     user.isVerified = true;
//     user.otp = null;
//     user.otpExpires = null;
//     await user.save();

//     const token = jwt.sign({ id: user._id, email: user.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });

//     return res.status(200).json({ message: "Account verified successfully", token, user });
//   } catch (error) {
//     return res.status(500).json({ message: "Server error", error: error.message });
//   }
// };


// // 📌 RESEND OTP
// const resendOtp = async (req, res) => {
//   try {
//     const { email } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: "User not found" });
//     if (user.isVerified) return res.status(400).json({ message: "Account already verified" });

//     const otp = generateOTP();
//     user.otp = otp;
//     user.otpExpires = Date.now() + parseInt(process.env.OTP_EXPIRES_IN);
//     await user.save();

//     await sendVerificationEmail(user.email, otp, user.firstName);

//     return res.status(200).json({ message: "New OTP sent to your email" });
//   } catch (error) {
//     return res.status(500).json({ message: "Server error", error: error.message });
//   }
// };


// // 📌 LOGIN (only if verified)
// const loginUser = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     if (!user.isVerified) {
//       return res.status(400).json({ message: "Please verify your account with OTP before logging in" });
//     }

//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) return res.status(400).json({ message: "Invalid credentials" });

//     const token = jwt.sign({ id: user._id, email: user.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });

//     // return res.status(200).json({ message: "Login successful", token, user });
//     const { password: _, ...userData } = user.toObject();
// return res.status(200).json({ message: "Login successful", token, user: userData });

//   } catch (error) {
//     return res.status(500).json({ message: "Server error", error: error.message });
//   }
// };


// // 📌 FORGOT PASSWORD (send OTP)
// const forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const otp = generateOTP();
//     user.otp = otp;
//     user.otpExpires = Date.now() + parseInt(process.env.OTP_EXPIRES_IN);
//     await user.save();

//     await sendVerificationEmail(user.email, otp, user.firstName);

//     return res.status(200).json({ message: "Password reset OTP sent to your email" });
//   } catch (error) {
//     return res.status(500).json({ message: "Server error", error: error.message });
//   }
// };


// // 📌 RESET PASSWORD (verify OTP, then update)
// const resetPassword = async (req, res) => {
//   try {
//     const { email, otp, newPassword } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     if (user.otp !== otp || user.otpExpires < Date.now()) {
//       return res.status(400).json({ message: "Invalid or expired OTP" });
//     }

//     const hashedPassword = await bcrypt.hash(newPassword, 10);
//     user.password = hashedPassword;
//     user.otp = null;
//     user.otpExpires = null;
//     await user.save();

//     return res.status(200).json({ message: "Password reset successful" });
//   } catch (error) {
//     return res.status(500).json({ message: "Server error", error: error.message });
//   }
// };


// module.exports = {
//   registerUser,
//   verifyAccount,
//   resendOtp,
//   loginUser,
//   forgotPassword,
//   resetPassword,
// };
