const User = require('../models/userModel');
// const Kyc = require('../models/kycModel'); // Kyc model is no longer directly used here
const withdrawFundsService = require('../services/withdrawFundService');
// const ninePsbService = require('../services/providers/ninePSBServices'); 
const Wallet = require("../models/walletModel");
const { generateAndSendOtp, verifyOtp } = require('../utilities/otpUtils')
const axios = require("axios");
const logger = require("../utilities/logger");
const { logTransaction } = require("../utilities/logTransaction");

const BLOCKRADER_BASE_URL = process.env.BLOCKRADER_BASE_URL;
const BLOCKRADER_API_KEY = process.env.BLOCKRADER_API_KEY;
const MASTER_WALLET_ID = process.env.COMPANY_ESCROW_ACCOUNT_ID;
const isProduction = process.env.NODE_ENV === "production";

/**
 * Creates a wallet based on the requested currency:
 * - Blockradar for non-NGN currencies (crypto/stablecoin).
 * - 9PSB for NGN (Naira).
 */
// const createWallet = async (req, res) => {
//     try {
//         // userId, email, name, and currency are mandatory
//         const { userId, email, name, currency } = req.body; 
//         
//         if (!userId || !email || !name || !currency) {
//             return res.status(400).json({ success: false, message: "User ID, email, name, and currency are required" });
//         }

//         let walletSourceAccount; // The final account number to save
//         let externalWalletId;   // The external ID/reference to save
//         let provider;           // Which provider created the wallet
//         let responseData;

//         // Check if currency is Naira (NGN)
//         if (currency.toUpperCase() === 'NGN' || currency.toUpperCase() === 'NAIRA') {
//             
//             // ----------------------------------------------------
//             // 1. 9PSB WALLET CREATION (REQUIRES FULL KYC DATA)
//             // ----------------------------------------------------
//             provider = '9PSB';

//             let ninePsbPayload;

//             try {
//                 // 💡 CRITICAL FIX: Use the Kyc static method to fetch decrypted and APPROVED data.
//                 ninePsbPayload = await Kyc.getVerifiedDataFor9PSB(userId); 

//                 // Map fields returned by the static method to 9PSB's required payload
//                 // The static method returns dateOfBirth as a Date object, so we format it.
//                 // The static method returns gender as 0/1, which 9PSB expects.
//                 // The static method returns bvn, nin, and email decrypted from the User record.

//                 ninePsbPayload.otherNames = ninePsbPayload.firstname;
//                 ninePsbPayload.phoneNo = ninePsbPayload.phone_number; 
//                 ninePsbPayload.dateOfBirth = ninePsbPayload.dateOfBirth.toISOString().split('T')[0]; // Format to YYYY-MM-DD
//                 delete ninePsbPayload.firstname;
//                 delete ninePsbPayload.phone_number;
                
//                 ninePsbPayload.transactionTrackingRef = `TX-NGN-${Date.now()}-${userId.slice(-4)}`;

//             } catch (kycError) {
//                 // This catches the "KYC record not found or is not APPROVED." error
//                 return res.status(403).json({ 
//                     success: false, 
//                     message: `NGN account creation requires approved KYC data: ${kycError.message}` 
//                 });
//             }
//         
//             // Call 9PSB service
//             const ninePsbResponse = await ninePsbService.createNairaWallet(ninePsbPayload);
//             responseData = ninePsbResponse;

//             // Map 9PSB response data to internal fields
//             walletSourceAccount = ninePsbResponse.data.account_number; // The 9PSB bank account number
//             externalWalletId = ninePsbResponse.data.account_number;    // Use account number as the external ID
//             
//         } else {
//             // ----------------------------------------------------
//             // 2. BLOCKRADER WALLET CREATION (CRYPTO/STABLECOIN)
//             // ----------------------------------------------------
//             provider = 'BLOCKRADER';
//             
//             const response = await axios.post(`${BLOCKRADER_BASE_URL}/wallets/${MASTER_WALLET_ID}/addresses`,
//                 {
//                     disableAutoSweep: true,
//                     enableGaslessWithdraw: true,
//                     metadata:{userId: userId, email: email},
//                     name: `${name}'s Wallet`,
//                 },
//                 {
//                 headers: {
//                     "x-api-key": BLOCKRADER_API_KEY,
//                     "Content-Type": "application/json",
//                 }
//             });

//             responseData = response.data;
//             
//             // 💡 FIX: Use the 'address' field for the account number
//             walletSourceAccount = responseData.data && responseData.data.address; 
//             // 💡 FIX: Use the unique 'id' field as the external wallet ID
//             externalWalletId = responseData.data && responseData.data.id; 

//             if (!walletSourceAccount || !externalWalletId) {
//                 throw new Error("Blockradar response missing required 'address' or 'id' for source account.");
//             }
//         }

//         // 3. SAVE WALLET IN MONGODB (Unified Logic)
//         const newWallet = new Wallet({
//             user_id: userId,
//             currency: currency.toUpperCase(),
//             externalWalletId: externalWalletId,
//             accountNumber: walletSourceAccount, 
//             accountName: `${name}'s Wallet`,
//             provider: provider, // Save which provider was used
//             status: "ACTIVE",
//             balance: 0,
//         });

//         await newWallet.save();

//         return res.status(201).json({
//             success: true,
//             message: `${currency.toUpperCase()} Wallet created successfully by ${provider}`,
//             wallet: newWallet.toObject(),
//             providerResponse: responseData // Optionally return provider response for debugging
//         });
//         
//     } catch (error) {
//         // Enhance error logging for Axios responses
//         if (error.response) {
//             logger.error(`❌ API Error (${provider || 'Unknown'} - ${error.response.status}): ${JSON.stringify(error.response.data)}`);
//             // Propagate the provider's error message if available
//             return res.status(error.response.status).json({ success: false, message: error.response.data.message || `${provider || 'API'} call failed.` });
//         }
//         logger.error(`❌ Wallet creation error: ${error.message}`);
//         return res.status(500).json({ success: false, message: error.message });
//     }
// };

/**
 * @name depositFunds
 * @description Triggers a deposit/credit to a user's wallet (NGN uses 9PSB service).
 * This endpoint is secured by the Admin token.
 */
// const depositFundsNinepsb = async (req, res) => {
//     try {
//         const { accountNumber, amount } = req.body;
//         const parsedAmount = parseFloat(amount);

//         if (!accountNumber || !parsedAmount || parsedAmount <= 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: "accountNumber and a positive amount are required",
//             });
//         }

//         // 1️⃣ Find the local wallet document
//         const wallet = await Wallet.findOne({ accountNumber });

//         if (!wallet || wallet.currency.toUpperCase() !== 'NGN') {
//             return res.status(404).json({
//                 success: false,
//                 message: `NGN Wallet with account number ${accountNumber} not found.`,
//             });
//         }

//         // -------------------------------------------------------------------
//         // STEP 1: GET PRE-DEPOSIT BALANCE
//         // -------------------------------------------------------------------
//         let preDepositBalance = null;
//         try {
//             const preDepositBalanceData = await ninePsbService.getNairaWalletBalance(accountNumber);
//             preDepositBalance = parseFloat(preDepositBalanceData.data.availableBalance);
//             logger.info(`Pre-Deposit 9PSB Balance for ${accountNumber}: ${preDepositBalance}`);
//         } catch (error) {
//             logger.warn(`Could not fetch pre-deposit balance for ${accountNumber}: ${error.message}. Proceeding with deposit.`);
//         }

//         // -------------------------------------------------------------------
//         // STEP 2: DEPOSIT FUNDS
//         // -------------------------------------------------------------------
//         const depositResult = await ninePsbService.depositFunds(accountNumber, parsedAmount);

//         // Use the depositResult directly (no apiResponse key)
//         const ninePsbResult = depositResult;
//         const generatedTxId = depositResult.data?.transactionId || `WAAS${Date.now()}`;

//         // 3️⃣ Check for paradoxical success
//         const isParadoxicalSuccess = (
//             ninePsbResult.success === false &&
//             ninePsbResult.message === "Approved by Financial Institution"
//         );

//         // 4️⃣ Combined success check
//         const isSuccess = ninePsbResult.success === true ||
//                           ninePsbResult.data?.responseCode === "00" ||
//                           ninePsbResult.message?.toUpperCase().includes("APPROVED") ||
//                           isParadoxicalSuccess;

//         if (!isSuccess) {
//             return res.status(500).json({
//                 success: false,
//                 message: ninePsbResult.message || "NGN Deposit failed at the service level.",
//             });
//         }

//         if (isParadoxicalSuccess) {
//             logger.warn(`⚠️ 9PSB Paradox: Deposit approved despite 'success: false'. Proceeding with DB update.`);
//         }

//         // -------------------------------------------------------------------
//         // STEP 3: UPDATE LOCAL WALLET BALANCE
//         // -------------------------------------------------------------------
//         wallet.balance += parsedAmount;
//         await wallet.save();

//         // -------------------------------------------------------------------
//         // STEP 4: GET POST-DEPOSIT BALANCE FROM 9PSB (confirmation)
//         // -------------------------------------------------------------------
//         let externalPostDepositBalance = null;
//         try {
//             const postDepositBalanceData = await ninePsbService.getNairaWalletBalance(accountNumber);
//             externalPostDepositBalance = parseFloat(postDepositBalanceData.data.availableBalance);
//             logger.info(`Post-Deposit EXTERNAL 9PSB Balance for ${accountNumber}: ${externalPostDepositBalance}`);

//             if (preDepositBalance !== null && externalPostDepositBalance === preDepositBalance + parsedAmount) {
//                 logger.info(`✅ Deposit Confirmed: Balance is ${externalPostDepositBalance}`);
//             }
//         } catch (balanceError) {
//             logger.error(`❌ Post-Deposit Balance Enquiry failed: ${balanceError.message}. Relying on local DB update.`);
//         }

//         // -------------------------------------------------------------------
//         // STEP 5: Determine final transaction reference
//         // -------------------------------------------------------------------
//         const finalReference = ninePsbResult.data?.reference ||
//                                ninePsbResult.transactionId ||
//                                generatedTxId;

//        // -------------------------------------------------------------------
// // STEP 6: Log transaction with live balance
// // -------------------------------------------------------------------
// await logTransaction({
//     userId: wallet.user_id,
//     walletId: wallet._id,
//     type: "DEPOSIT",
//     amount: parsedAmount,
//     currency: "NGN",
//     status: "COMPLETED",
//     reference: finalReference,
//     metadata: { 
//         provider: "9PSB",
//         externalBalance: externalPostDepositBalance // ✅ include live balance
//     },
// });

//         // -------------------------------------------------------------------
//         // STEP 7: Respond to client
//         // -------------------------------------------------------------------
//         return res.status(200).json({
//             success: true,
//             message: "NGN Deposit successful and confirmed.",
//             txId: finalReference,
//             localNewBalance: wallet.balance,
//             externalOldBalance: preDepositBalance,
//             externalNewBalance: externalPostDepositBalance,
//             depositAmount: parsedAmount
//         });

//     } catch (error) {
//         logger.error(`❌ Deposit error: ${error.message}`);
//         return res.status(500).json({
//             success: false,
//             message: error.message,
//         });
//     }
// };

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

module.exports = {depositFunds, initiateWithdrawal, completeWithdrawal, addTestFunds};
