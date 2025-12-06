const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const BlacklistedToken = require('../models/blackListTokenModel');
const { generateNewUserMail, generateVerificationSuccessMail, generateVerificationRequest, forgotPasswordMail, generatePasswordResetMail } = require('../utilities/mailGenerator');
const sendMail = require('../utilities/sendMail');

// Register New User
const registerUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      howYouHeardAboutUs,
      role // include role
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Email Verification Code Generation
    const verification = jwt.sign(
      { email },
      process.env.EMAIL_VERIFICATION_SECRET,
      { expiresIn: "1h" }
    );

    const html = generateNewUserMail(verification, firstName);

    // ✅ Allow merchant role if explicitly sent
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      howYouHeardAboutUs,
      verificationCode: verification,
      role: role || "user" // <-- if no role, default to user
    });

    await sendMail(email, "Welcome to Finstack", html);
    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyValue)[0];
      return res.status(400).json({ message: `${duplicateField} already exists` });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
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
// USER LOGIN HANDLER
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
      secure: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging',
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
// Refresh Token Handler with Rotation
const handleRefreshToken = async (req, res) => {
    // 1. Check for Refresh Token in Cookies
    const cookies = req.cookies;
    if (!cookies?.refreshToken) {
        return res.status(401).json({ message: 'Unauthorized: Refresh Token Missing' });
    }
    const refreshToken = cookies.refreshToken; // This is the OLD/INCOMING refresh token

    // Optional: Clear the cookie now if you are using Refresh Token Rotation (best practice)
    // You can clear it here, but sending the new one will overwrite it anyway.
    // res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict', secure: true }); 

    // 2. Find the User with the Refresh Token in the Database
    try {
        // Find a user who has this specific token in their 'refreshToken' array
        const foundUser = await User.findOne({ refreshToken: refreshToken }).exec();

        // Check 2a: Was the token found in the database?
        if (!foundUser) {
            // This is the critical security check for a token used after logout/theft.
            return res.status(403).json({ message: 'Forbidden: Invalid Refresh Token' }); 
        }

        // 3. Verify the JWT Signature and Expiration
        jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET,
            async (err, decoded) => { // 👈 IMPORTANT: Changed the callback to 'async' 
                
                // Check 3a/3b: Signature failed or token ID doesn't match the user found in DB?
                if (err || foundUser._id.toString() !== decoded.id) {// Clear ALL refresh tokens for this user because this one was replayed or tampered with
                    console.error(`SECURITY ALERT: Token verification failed for user ID ${foundUser._id}. Wiping all tokens.`);
                    foundUser.refreshToken = [];
                    await foundUser.save();
                    
                    return res.status(403).json({ message: 'Forbidden: Token Verification Failed' });
                }

                // ----------------------------------------------------
                // 🚀 START OF YOUR NEW ROTATION LOGIC 🚀
                // ----------------------------------------------------
                
                // 4a. Generate a NEW Refresh Token
                const newRefreshToken = jwt.sign(
                    { id: foundUser._id, email: foundUser.email },
                    process.env.REFRESH_TOKEN_SECRET,
                    { expiresIn: "7d" } // New 7-day token
                );

                // 4b. Find and remove the OLD refresh token from the database array
                foundUser.refreshToken = foundUser.refreshToken.filter(
                    (token) => token !== refreshToken
                );
                
                // 4c. Add the NEW refresh token to the database array and save
                foundUser.refreshToken.push(newRefreshToken);
                await foundUser.save(); // 👈 This MUST be awaited!

                // 4d. Generate the new Access Token (short life)
                const newAccessToken = jwt.sign(
                    { id: foundUser._id, email: foundUser.email },
                    process.env.ACCESS_TOKEN_SECRET,
                    { expiresIn: '1h' }
                );

                // 5. Send the NEW Refresh Token in a cookie (and the new Access Token)
                res.cookie("refreshToken", newRefreshToken, {
                    httpOnly: true,
                    // Use ternary for production readiness (needs HTTPS in production)
                    secure: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging',
                    sameSite: "strict",
                    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                });

                res.status(200).json({ accessToken: newAccessToken });
                
                // ----------------------------------------------------
                // 🛑 END OF YOUR NEW ROTATION LOGIC 🛑
                // ----------------------------------------------------
            }
        );

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
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
    const hashedPassword = await bcrypt.hash(password, 12);

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
// Logout User
const logoutUser = async (req, res) => {
    const cookies = req.cookies;
    
    // 1. Access Token Blacklisting (Revokes AT instantly)
    const authHeader = req.headers.authorization || "";
    const accessToken = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    if (accessToken) {
        try {
            // Decode the token (no signature check needed, only expiration time)
            const decoded = jwt.decode(accessToken);
            
            if (decoded && decoded.exp) {
                // Blacklist the token until its natural expiration
                await BlacklistedToken.create({
                    token: accessToken,
                    // Convert JWT expiration (seconds) to JavaScript Date (milliseconds)
                    expiresAt: new Date(decoded.exp * 1000), 
                });
            }
        } catch (err) {
            console.error("Access Token Blacklist Error:", err);
            // Continue with RT cleanup even if AT blacklisting fails
        }
    }
    // 2. Refresh Token Cleanup (Revokes RT from DB and client)
    if (cookies?.refreshToken) {
        const refreshToken = cookies.refreshToken;
        
        try {
            // Remove the token from the user's document in the DB
            await User.updateOne(
                { refreshToken: refreshToken }, // Find user by token
                { $pull: { refreshToken: refreshToken } } // Remove the token
            );
        } catch (error) {
            console.error('Refresh Token DB Cleanup Error:', error);
            // Even if DB fails, proceed to clear the cookie
        }
    }
    // 3. Clear the Refresh Token Cookie on the client side (REQUIRED)
    res.clearCookie('refreshToken', { 
        httpOnly: true, 
        // IMPORTANT: Use the same settings used when the cookie was set
        secure: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging', 
        sameSite: 'strict' 
    });
    // 4. Send successful response
    return res.status(204).send(); // Standard practice for a successful logout/delete operation
};

module.exports = {registerUser, verifyEmail, resendVerificationCode, loginUser, handleRefreshToken, forgotPassword, resetPassword, logoutUser};
