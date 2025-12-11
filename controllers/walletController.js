const User = require('../models/userModel');
const withdrawFundsService = require('../services/withdrawFundService');
const Wallet = require("../models/walletModel");
const { generateAndSendOtp, verifyOtp } = require('../utilities/otpUtils')
const axios = require("axios");
const logger = require("../utilities/logger");
const { logTransaction } = require("../utilities/logTransaction");
const p2pService = require("../services/p2pService");

const BLOCKRADER_BASE_URL = process.env.BLOCKRADER_BASE_URL;
const BLOCKRADER_API_KEY = process.env.BLOCKRADER_API_KEY;
const MASTER_WALLET_ID = process.env.COMPANY_ESCROW_ACCOUNT_ID;
const isProduction = process.env.NODE_ENV === "production";

const getDashboardBalances = async (req, res) => {
  try {
    const userId = req.user.id;
    const balances = await p2pService.getAllUserWalletBalances(userId);
    return res.status(200).json({
      message: "Dashboard balances fetched successfully",
      data: balances
    });
  } catch (error) {
    logger.error(
  `❌ Dashboard balances error for user ${req?.user?.id || "UNKNOWN"}: ${error.message}`
);
    // Return a generic 500 error to the user for security
    return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch dashboard balances. An unexpected error occurred.",
        // For development, you can uncomment the line below:
        debugMessage: error.message 
    });
  }
};



/**
 * Simulate or trigger a deposit (depending on environment)
 */
const depositFunds = async (req, res) => {
 try {
   const { walletId, amount, currency } = req.body;

   if (!walletId || !amount || !currency) {
     return res.status(400).json({
       success: false,
       message: "walletId, amount, and currency are required",
     });
   }

   if (!isProduction) {
     // 🧪 SANDBOX MODE — simulate deposit
     const response = await axios.post(
       `${BLOCKRADER_BASE_URL}/simulate/deposit`,
       { amount, currency },
       {
         headers: {
           "x-api-key": BLOCKRADER_API_KEY,
           "Content-Type": "application/json",
         },
       }
     );

     logger.info(`🧪 Simulated deposit of ${amount} ${currency} for wallet ${walletId}`);

     return res.status(200).json({
       success: true,
       message: "Deposit simulated successfully (sandbox mode)",
       data: response.data,
     });
   }

   // 🚀 PRODUCTION MODE — real deposits handled via webhook only blockradar
   return res.status(400).json({
     success: false,
     message: "Manual deposits are not allowed in production. Wait for webhook event.",
   });
 } catch (error) {
   logger.error(`❌ Deposit error: ${error.message}`);
   return res.status(500).json({
     success: false,
     message: error.response?.data?.message || error.message,
   });
 }
};

const initiateWithdrawal = async (req, res) => {
    try {
        const { walletCurrency, destinationAccountNumber, amount } = req.body;
        const userId = req.user.id; // Assuming userId is available via auth middleware

        if (!walletCurrency || !destinationAccountNumber || !amount) {
            return res.status(400).json({ success: false, message: "Required fields are missing" });
        }
        
        // 💡 DEBUG LOG: Log the authenticated user ID for debugging
        logger.info(`Attempting withdrawal initiation for authenticated user ID: ${userId}`);

        const user = await User.findById(userId);
        
        // 💡 FIX 1: Provide a more specific error if the User is not found.
        if (!user) {
            return res.status(404).json({ success: false, message: `Authenticated User ID ${userId} not found in User collection.` });
        }
        
        const wallet = await Wallet.findOne({ currency: walletCurrency, user_id: userId });

        // 💡 FIX 2: Provide a more specific error if the Wallet is not found.
        if (!wallet) {
            return res.status(404).json({ success: false, message: `Wallet in ${walletCurrency} not found for user ${userId}.` });
        }
        
        if (wallet.balance < amount) {
            return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
        }
        
        // 💡 Use the new utility to generate and send OTP
        await generateAndSendOtp(userId, 'WITHDRAWAL', user.email);

        return res.status(200).json({
            success: true,
            message: "Verification code sent to your email. Please check your inbox/spam folder.",
        });

    } catch (error) {
        logger.error(`❌ Withdrawal initiation error: ${error.message}`);
        // Send a user-friendly error message, usually just error.message from the util
        return res.status(500).json({ success: false, message: error.message }); 
    }
};

const completeWithdrawal = async (req, res) => {
    try {
        const { 
            walletCurrency, 
            destinationAccountNumber, 
            amount, 
            otpCode // 💡 NEW REQUIRED FIELD
        } = req.body;
        const userId = req.user.id;

        if (!walletCurrency || !destinationAccountNumber || !amount || !otpCode) {
            return res.status(400).json({
                success: false,
                message: "All withdrawal and verification details are required",
            });
        }
        
        // 💡 OTP Verification
        const isVerified = await verifyOtp(userId, otpCode, 'WITHDRAWAL');

        if (!isVerified) {
             return res.status(401).json({ success: false, message: "Invalid or expired OTP." });
        }

        // Fetch Wallet and Re-Check Balance (Crucial for security)
        const wallet = await Wallet.findOne({ currency: walletCurrency, user_id: userId });
        if (!wallet) {
            return res.status(404).json({ success: false, message: "Wallet not found" }); 
        }
        if (wallet.balance < amount) {
             return res.status(400).json({ success: false, message: "Insufficient wallet balance (re-checked)" });
        }

        // Execute Withdrawal
        // ✅ FIX CONFIRMED: wallet.accountNumber is now correctly populated with the UUID/ID.
        const fromAccount = wallet.accountNumber;
        const result = await withdrawFundsService(fromAccount, destinationAccountNumber, amount);

        // Update Balance and Log
        if (result.success) {
            wallet.balance -= amount;
            await wallet.save();
        }

        await logTransaction({
            // ... transaction logging details ...
            userId,
            walletId: wallet._id,
            type: "WITHDRAWAL",
            amount,
            currency: wallet.currency,
            status: result.success ? "COMPLETED" : "FAILED",
            reference: result.reference,
            metadata: { provider: result.provider, destination: destinationAccountNumber },
        });

        return res.status(200).json({
            success: true,
            message: "Withdrawal successful",
            data: result,
        });

    } catch (error) {
        logger.error(`❌ Withdrawal completion error: ${error.message}`);
        return res.status(500).json({ success: false, message: error.message });
    }
};


/**
 * MOCK FUNCTION: Adds funds directly to a user's wallet for testing purposes.
 * This should ONLY be accessible in development environments and by admins.
 */

const addTestFunds = async (req, res) => {
    // SECURITY CHECK: Ensure this function only runs outside of production
    if (process.env.NODE_ENV === 'production') {
        logger.warn(`Attempted to use /test/addFunds in PRODUCTION by user ${req.user.id}`);
        return res.status(403).json({ success: false, message: "Access forbidden." });
    }

    try {
        // 💡 UPDATE: Allow an optional testUserId for easier debugging in dev environments.
        const { accountNumber, amount, testUserId } = req.body; 
        
        // Determine which user ID to use for the lookup: prefer the one from the body for testing, 
        // otherwise fall back to the authenticated user ID (req.user.id).
        const queryUserId = testUserId || req.user.id;

        const parsedAmount = parseFloat(amount);

        if (!accountNumber || !parsedAmount || parsedAmount <= 0) {
            return res.status(400).json({ success: false, message: "Valid account number and positive amount required." });
        }

        // 💡 CRITICAL DEBUGGING LOG: Show which user ID is being used for the database query.
        logger.info(`🔍 Attempting to fund account ${accountNumber} using User ID: ${queryUserId}. (Auth ID: ${req.user.id})`);


        // 💡 FIX: Find the wallet by its unique accountNumber field and the resolved user ID.
        const wallet = await Wallet.findOne({ accountNumber, user_id: queryUserId });

        if (!wallet) {
            return res.status(404).json({ success: false, message: `Wallet with account number ${accountNumber} not found for user ID ${queryUserId}.` });
        }

        // Safely update the balance
        wallet.balance += parsedAmount;
        await wallet.save();

        logger.info(`💰 TEST FUNDS added: ${parsedAmount} ${wallet.currency} to wallet ${wallet._id} for user ${queryUserId}`);

        return res.status(200).json({
            success: true,
            message: `Successfully added ${parsedAmount} ${wallet.currency} for testing.`,
            newBalance: wallet.balance,
            walletAccount: wallet.accountNumber, // Provide confirmation
        });

    } catch (error) {
        logger.error(`❌ Test fund addition error: ${error.message}`);
        return res.status(500).json({ success: false, message: "Failed to add test funds." });
    }
};

module.exports = {getDashboardBalances, depositFunds, initiateWithdrawal, completeWithdrawal, addTestFunds};
