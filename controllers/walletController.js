const User = require('../models/userModel');
const Wallet = require("../models/walletModel");
const { generateAndSendOtp, verifyOtp } = require('../utilities/otpUtils')
const axios = require("axios");
const logger = require("../utilities/logger");
const p2pService = require("../services/p2pService");
// 🆕 NEW IMPORTS
const { createWithdrawalRequest } = require('../services/withdrawalInterService'); 
const { initiateCryptoTransfer } = require('../services/cryptoTransServicePc'); 
const Transaction = require("../models/transactionModel"); // Needed for the non-atomic update
const { withdrawFromBlockrader } = require('../services/providers/blockrader');
const BLOCKRADER_BASE_URL = process.env.BLOCKRADER_BASE_URL;
const BLOCKRADER_API_KEY = process.env.BLOCKRADER_API_KEY;
const isProduction = process.env.NODE_ENV === "production";
const CRYPTO_NETWORK = process.env.PAYCREST_CRYPTO_NETWORK || "POLYGON";


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



// Initiate: sends OTP only
// const initiateWithdrawal = async (req, res) => {
//   try {
//     const { walletCurrency, destinationAccountNumber, amount } = req.body;
//     const userId = req.user.id;

//     if (!walletCurrency || !destinationAccountNumber || !amount) {
//       return res.status(400).json({ success: false, message: "Required fields are missing" });
//     }

//     logger.info(`Initiating withdrawal OTP for user ${userId}`);

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ success: false, message: "User not found" });

//     const wallet = await Wallet.findOne({ currency: walletCurrency, user_id: userId });
//     if (!wallet) return res.status(404).json({ success: false, message: "Wallet not found" });

//     if (wallet.balance < amount) {
//       return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
//     }

//     await generateAndSendOtp(userId, "WITHDRAWAL", user.email);

//     return res.status(200).json({
//       success: true,
//       message: "Verification code sent to your email. Please check your inbox/spam folder.",
//     });
//   } catch (error) {
//     logger.error("initiateWithdrawal error:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// Complete: verify OTP, create withdrawal request (deduct amount+fee) and call provider
// const completeWithdrawal = async (req, res) => {
//   try {
//     const { walletCurrency, destinationAccountNumber, amount, otpCode } = req.body;
//     const userId = req.user.id;

//     if (!walletCurrency || !destinationAccountNumber || !amount || !otpCode) {
//       return res.status(400).json({ success: false, message: "All withdrawal details required" });
//     }

//     // verify OTP
//     const isVerified = await verifyOtp(userId, otpCode, "WITHDRAWAL");
//     if (!isVerified) return res.status(401).json({ success: false, message: "Invalid or expired OTP." });

//     // call service to create withdrawal, this will deduct amount+fee and call provider
//     const idempotencyKey = `withdraw-${userId}-${Date.now()}`;

//     const result = await createWithdrawalRequest({
//       userId,
//       currency: walletCurrency,
//       amount: Number(amount),
//       externalAddress: destinationAccountNumber,
//       idempotencyKey
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Withdrawal initiated. Awaiting provider confirmation.",
//       data: { transaction: result.transaction, providerResult: result.providerResult }
//     });
//   } catch (error) {
//     logger.error("completeWithdrawal error:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// IMPLEMENT PAYCREST WITHDRAWAL LOGIC
const initiateWithdrawal = async (req, res) => {
  try {
    const { walletCurrency, amount } = req.body; // Removed destinationAccountNumber/bank details for security reasons in the initiation step

    if (!walletCurrency || !amount) {
      return res.status(400).json({ success: false, message: "Required fields are missing" });
    }

    logger.info(`Initiating withdrawal OTP for user ${req.user.id}`);

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const wallet = await Wallet.findOne({ currency: walletCurrency, user_id: req.user.id });
    if (!wallet) return res.status(404).json({ success: false, message: "Wallet not found" });

    // Perform preliminary balance check before sending OTP
    if (wallet.balance < amount) {
      return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
    }

    await generateAndSendOtp(req.user.id, "WITHDRAWAL", user.email);

    return res.status(200).json({
      success: true,
      message: "Verification code sent to your email. Please check your inbox/spam folder.",
    });
  } catch (error) {
    logger.error("initiateWithdrawal error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2️⃣ STEP 2: COMPLETION (OTP Verification, Paycrest Order, Fund Lock)
const submitPaycrestWithdrawal = async (req, res) => {
  try {
    // 1. Collect all required inputs, including OTP and all Paycrest fiat details
    const { 
      walletCurrency, 
      amount, 
      otpCode,
      destinationAccountNumber, 
      institutionCode,          
      accountName               
    } = req.body;
    
    const userId = req.user.id;

    if (!walletCurrency || !destinationAccountNumber || !amount || !otpCode || !institutionCode || !accountName) {
      return res.status(400).json({ success: false, message: "All withdrawal and recipient details required" });
    }

    // 2. Verify OTP
    const isVerified = await verifyOtp(userId, otpCode, "WITHDRAWAL");
    if (!isVerified) return res.status(401).json({ success: false, message: "Invalid or expired OTP." });

    // 3. Call service to create Paycrest order and deduct user funds (atomic transaction)
    const idempotencyKey = `pc-wdr-${userId}-${Date.now()}`;
    
    // The result object needs to be updated after the crypto transfer if it happens
    let cryptoTransferResult = {};
    let transaction; // Declare transaction here for scope

    const result = await createWithdrawalRequest({
      userId,
      currency: walletCurrency,
      amount: Number(amount),
      externalAddress: destinationAccountNumber,
      institutionCode, 
      accountName,
      idempotencyKey
    });
    
    transaction = result.transaction; // Get the initial transaction object

    // 4. CRITICAL STEP: INITIATE ON-CHAIN CRYPTO TRANSFER (ONLY if a new order was created)
    if (!result.alreadyExists) {
        logger.info(`Starting crypto transfer for Paycrest Order ID: ${result.paycrestOrderId}`);

        cryptoTransferResult = await initiateCryptoTransfer({
            userId: userId, 
            token: walletCurrency,
            receiveAddress: result.paycrestReceiveAddress,
            amount: result.cryptoAmountToSend,
            reference: transaction.reference,
        });
        
        // 5. Update the transaction with the on-chain hash and set status
        transaction = await Transaction.findByIdAndUpdate(transaction._id, { 
            $set: { 
                status: "CRYPTO_TRANSFER_SENT", // Funds are locked, crypto is sent
                "metadata.cryptoTxHash": cryptoTransferResult.transactionHash,
                "metadata.cryptoProviderRef": cryptoTransferResult.providerReference
            } 
        }, { new: true }); // Get the updated document
    }

    // 6. Return Paycrest details to caller 
    const responseMessage = result.alreadyExists 
      ? "Withdrawal order already created. Check transaction status."
      : "Withdrawal initiated! Funds locked, crypto transfer sent to Paycrest. Awaiting fiat confirmation.";

    return res.status(200).json({
      success: true,
      message: responseMessage,
      data: { 
          transaction: transaction, // Return the final, updated transaction
          paycrestOrderId: result.paycrestOrderId, 
          paycrestReceiveAddress: result.paycrestReceiveAddress,
          cryptoAmountToSend: result.cryptoAmountToSend,
          cryptoTransfer: cryptoTransferResult // Will be empty if alreadyExists is true
      }
    });

  } catch (error) {
    logger.error("submitPaycrestWithdrawal error:", error);
    const statusCode = error.message.includes("Insufficient balance") ? 400 : 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

// 3️⃣ STEP 3: Handle direct crypto withdrawal (no fiat off-ramp)
const submitCryptoWithdrawal = async (req, res) => {
    try {
        // 1. Collect all required inputs
        const {
            walletCurrency,
            amount,
            otpCode,
            externalCryptoAddress // The destination wallet address
        } = req.body;

        const userId = req.user.id;

        if (!walletCurrency || !externalCryptoAddress || !amount || !otpCode) {
            return res.status(400).json({ success: false, message: "All withdrawal and recipient details required" });
        }

        // 2. Verify OTP
        const isVerified = await verifyOtp(userId, otpCode, "WITHDRAWAL");
        if (!isVerified) return res.status(401).json({ success: false, message: "Invalid or expired OTP." });

        // 3. Find the user's wallet to get the source address ID
        const wallet = await Wallet.findOne({ currency: walletCurrency, user_id: userId });
        if (!wallet) return res.status(404).json({ success: false, message: "Wallet not found for this currency." });

        // CRITICAL CHECK: Ensure sufficient balance (re-check after OTP for safety)
        if (wallet.balance < amount) {
             return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
        }
        
        // 4. Generate Idempotency Key
        const idempotencyKey = `crypto-wdr-${userId}-${Date.now()}`;
        
        // --- ATOMIC TRANSACTION START (In a production system, wrap 5 & 6 in a single DB transaction) ---

        // 5. Create a PENDING transaction record
        let newTransaction = await Transaction.create({
            user_id: userId,
            type: 'WITHDRAWAL',
            currency: walletCurrency,
            amount: Number(amount),
            fee: 0, // Adjust as necessary
            status: 'PENDING_PROVIDER', 
            reference: idempotencyKey,
            metadata: {
                destination: externalCryptoAddress,
                sourceWalletId: wallet._id.toString(),
                provider: 'BLOCKRADER_CRYPTO',
            }
        });

        // 6. Deduct from wallet balance
        // NOTE: This must be done atomically with step 5 in a production setup (using DB sessions/locks)
        wallet.balance -= Number(amount);
        await wallet.save();
        
        logger.info(`Funds deducted. Calling Blockrader for Transaction ID: ${newTransaction._id}`);

        // 7. Call the Blockrader service function
        // wallet.address_id is assumed to be the Blockrader Child Address ID (sourceAddressId)
        const providerResponse = await withdrawFromBlockrader(
            wallet.address_id, 
            externalCryptoAddress,
            Number(amount),
            walletCurrency,
            idempotencyKey,
            newTransaction.reference 
        );

        // 8. Update the transaction with provider details
        newTransaction = await Transaction.findByIdAndUpdate(newTransaction._id, {
            $set: {
                status: providerResponse.data?.status || "SENT_TO_PROVIDER", 
                provider_ref: providerResponse.data?.id, // Blockrader Withdrawal ID
                "metadata.blockraderHash": providerResponse.data?.hash, 
            }
        }, { new: true });

        // 9. Return success response
        return res.status(200).json({
            success: true,
            message: "Crypto withdrawal successfully initiated with Blockrader.",
            data: {
                transaction: newTransaction,
                providerResult: providerResponse.data,
            }
        });

    } catch (error) {
        logger.error("submitCryptoWithdrawal error:", error);
        
        // IMPORTANT: In a failure state, a mechanism to REVERSE the wallet balance deduction is required.
        
        const statusCode = error.message.includes("Insufficient") ? 400 : 500;
        return res.status(statusCode).json({ success: false, message: error.message });
    }
};


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

module.exports = {getDashboardBalances, depositFunds, initiateWithdrawal, submitPaycrestWithdrawal,submitCryptoWithdrawal, addTestFunds};
