// // const Wallet = require ("../models/walletModel");
// const { logTransaction } = require("../services/transactionLogger");
// const Wallet = require("../models/walletModel");
// const logger = require("../utilities/logger"); 
// const { authenticateNinePSB,createNairaWallet, getNairaWalletBalance } = require("../services/providers/ninePSBServices");
// const depositFundsService = require("../services/depositFundService");
// const withdrawFundsService = require("../services/withdrawFundService");
// const Transaction = require("../models/transactionModel");

// // 🔹 Create Wallet
// const createWallet = async (req, res) => {
//   try {
//     const { userId, currency, firstName, lastName, phoneNo, gender, dateOfBirth, address, bvn } = req.body;
//     if (!userId || !currency)
//       return res.status(400).json({ message: "User ID and currency required" });

//     let walletData;

//     if (currency.toUpperCase() === "NGN") {
//       walletData = await createNairaWallet({
//         userId,
//         firstName,
//         lastName,
//         phoneNo,
//         gender,
//         dateOfBirth,
//         address,
//         bvn,
//       });
//     } else {
//       return res.status(400).json({ message: "Only NGN supported for now" });
//     }

//     const wallet = new Wallet({
//       user_id: userId,
//       currency: walletData.currency,
//       accountNumber: walletData.account_number,
//       accountName: walletData.account_name,
//       provider: walletData.provider,
//       status: walletData.status,
//     });

//     await wallet.save();

//     return res.status(201).json({
//       message: "Wallet created successfully",
//       wallet,
//     });
//   } catch (error) {
//     logger.error("Error creating wallet:", error.message);
//     return res.status(500).json({ message: "Internal Server Error", error: error.message });
//   }
// };

// // 🔹 Get Wallet Balance (live from 9PSB)
// const getWalletBalance = async (req, res) => {

//    console.log("✅ req.user =", req.user);
//   try {
//     // const wallet = await Wallet.findOne({ user_id: req.user._id });
//     const wallet = await Wallet.findOne({ user_id: req.user.id });
//     if (!wallet) return res.status(404).json({ message: "Wallet not found" });

//     const liveBalance = await getNairaWalletBalance(wallet.accountNumber);

//     // (optional) update local record
//     wallet.balance = liveBalance;
//     await wallet.save();

//     return res.status(200).json({
//       message: "Wallet balance fetched successfully",
//       balance: liveBalance,
//       currency: wallet.currency,
//     });
//   } catch (err) {
//     logger.error(`❌ Error getting wallet balance: ${err.message}`);
//     res.status(500).json({ error: err.message });
//   }
// };

// // 🔹 Admin: Get wallet details directly from 9PSB (WaaS)
// // const getWallet = async (req, res) => {
// //   try {
// //     const { accountNumber } = req.body;

// //     if (!accountNumber) {
// //       logger.warn("⚠️ Missing accountNumber in request body");
// //       return res.status(400).json({
// //         success: false,
// //         message: "accountNumber is required",
// //       });
// //     }

// //     // 1️⃣ Authenticate with 9PSB to get access token
// //     const token = await authenticateNinePSB();

// //     // 2️⃣ Call the wallet enquiry endpoint
// //     const response = await axios.post(
// //       `${WAAS_BASE_URL}/wallet_enquiry`,
// //       { accountNo: accountNumber },
// //       {
// //         headers: {
// //           Authorization: `Bearer ${token}`,
// //           "Content-Type": "application/json",
// //         },
// //       }
// //     );

// //     // 3️⃣ Extract and format data
// //     const walletInfo = response.data?.data || {};
// //     logger.info(`✅ Wallet fetched for account ${accountNumber}`);

// //     return res.status(200).json({
// //       success: true,
// //       message: "Wallet retrieved successfully",
// //       data: {
// //         accountNumber: walletInfo.accountNumber,
// //         balance: walletInfo.balance,
// //         accountName: walletInfo.accountName,
// //         status: walletInfo.status || "ACTIVE",
// //         currency: walletInfo.currency || "NGN",
// //       },
// //     });
// //   } catch (error) {
// //     logger.error(`❌ Failed to fetch wallet: ${error.message}`, { stack: error.stack });
// //     return res.status(500).json({
// //       success: false,
// //       message: "Failed to retrieve wallet",
// //       error: error.response?.data || error.message,
// //     });
// //   }
// // };
// // 🔹 Admin: Get wallet details (test version)
// const getWallet = async (req, res) => {
//   try {
//     const { accountNumber } = req.body;

//     if (!accountNumber) {
//       return res.status(400).json({
//         success: false,
//         message: "accountNumber is required",
//       });
//     }

//     // Mock: Fetch wallet from your database instead of calling 9PSB API
//     const wallet = await Wallet.findOne({ accountNumber });

//     if (!wallet) {
//       return res.status(404).json({
//         success: false,
//         message: "Wallet not found",
//       });
//     }

//     // Return the wallet data directly
//     return res.status(200).json({
//       success: true,
//       message: "Wallet retrieved successfully (mock mode)",
//       data: wallet,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Failed to retrieve wallet",
//       error: error.message,
//     });
//   }
// };

// // 🔹 Admin: Get all wallets
// const getAllWallets = async (req, res) => {
//   try {
//     const wallets = await Wallet.find();
//     return res.status(200).json({
//       success: true,
//       message: "All wallets retrieved successfully",
//       data: wallets,
//     });
//   } catch (error) {
//     logger.error("❌ Error fetching all wallets:", error.message);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };


// // const depositFunds = async (req, res) => {
// //   try {
// //     const { accountNumber, amount } = req.body;
// //     const userId = req.user.id;

// //     if (!accountNumber || !amount) {
// //       return res.status(400).json({ success: false, message: "Account number and amount are required" });
// //     }

// //     // Call your service
// //     const result = await depositFundsService(accountNumber, amount);

// //     // Log transaction internally
// //     await Transaction.create({
// //       userId,
// //       walletId: result.walletId,
// //       type: "DEPOSIT",
// //       amount,
// //       status: "SUCCESS",
// //       reference: result.reference,
// //       metadata: { provider: result.provider },
// //     });

// //     logger.info(`✅ Deposit successful: ₦${amount} → ${accountNumber}`);

// //     return res.status(200).json({
// //       success: true,
// //       message: "Deposit successful",
// //       data: result,
// //     });
// //   } catch (error) {
// //     logger.error(`❌ Deposit error: ${error.message}`);
// //     return res.status(500).json({ success: false, message: error.message });
// //   }
// // };

// const depositFunds = async (req, res) => {
//   try {
//     const { accountNumber, amount } = req.body;
//     const userId = req.user.id;

//     if (!accountNumber || !amount) {
//       return res.status(400).json({ success: false, message: "Account number and amount are required" });
//     }

//     // ✅ Find the wallet using account number
//     const wallet = await Wallet.findOne({ accountNumber });
//     if (!wallet) {
//       return res.status(404).json({ success: false, message: "Wallet not found" });
//     }

//     // ✅ Call the deposit service
//     const result = await depositFundsService(accountNumber, amount);

//     // ✅ Log transaction internally
// await logTransaction({
//   userId,
//   walletId: wallet._id,
//   type: "DEPOSIT",
//   amount,
//   currency: wallet.currency,
//   status: result.success ? "COMPLETED" : "FAILED", 
//   reference: result.reference,
//   metadata: { provider: result.provider },
// });

//     logger.info(`✅ Deposit successful: ₦${amount} → ${accountNumber}`);

//     return res.status(200).json({
//       success: true,
//       message: "Deposit successful",
//       data: result,
//     });
//   } catch (error) {
//     logger.error(`❌ Deposit error: ${error.message}`);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };
// const withdrawFunds = async (req, res) => {
//   try {
//     const { accountNumber, destination, amount } = req.body;
//     const userId = req.user.id;

//     if (!accountNumber || !destination || !amount) {
//       return res.status(400).json({
//         success: false,
//         message: "Account number, destination, and amount are required",
//       });
//     }

//     //  pass destination too
//     const result = await withdrawFundsService(accountNumber, destination, amount);

//     // TODO: fetch wallet first before using wallet._id
//     const wallet = await Wallet.findOne({ accountNumber, user_id: userId });
//     if (!wallet) {
//       return res.status(404).json({ success: false, message: "Wallet not found" });
//     }

//     // ✅ Log transaction internally
//     await logTransaction({
//   userId,
//   walletId: wallet._id,
//   type: "WITHDRAWAL",
//   amount,
//   currency: wallet.currency,
//   status: result.success ? "COMPLETED" : "FAILED", // ✅ fix
//   reference: result.reference, // ✅ fix
//   metadata: { provider: result.provider, destination },
// });

//     return res.status(200).json({
//       success: true,
//       message: "Withdrawal successful",
//       data: result,
//     });
//   } catch (error) {
//     logger.error(`❌ Withdrawal error: ${error.message}`);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// module.exports = { createWallet, getWalletBalance, getWallet, getAllWallets, depositFunds, withdrawFunds };
// const User = require('../models/userModel'); // Required to fetch user email
// const withdrawFundsService = require('../services/withdrawFundService');
// const Wallet = require("../models/walletModel");
// const { generateAndSendOtp, verifyOtp } = require('../utilities/otpUtils')
// const axios = require("axios");
// const logger = require("../utilities/logger");
// const { logTransaction } = require("../utilities/logTransaction");

// const BLOCKRADER_BASE_URL = process.env.BLOCKRADER_BASE_URL;
// const BLOCKRADER_API_KEY = process.env.BLOCKRADER_API_KEY;
// const MASTER_WALLET_ID = process.env.COMPANY_ESCROW_ACCOUNT_ID;
// const isProduction = process.env.NODE_ENV === "production";

// const createWallet = async (req, res) => {
//     try {
//         const {userId, email, name, currency} = req.body;
//         if (!userId || !email || !name || !currency) {
//             return res.status(400).json({ success: false, message: "User ID, email, name, and currency are required" });
//         }
//         const response = await axios.post(`${BLOCKRADER_BASE_URL}/wallets/${MASTER_WALLET_ID}/addresses`,
//           {
//              disableAutoSweep: true,
//             enableGaslessWithdraw: true,
//             metadata:{userId: userId, email: email},
//             name: `${name}'s Wallet`,
//           },
//           {
//           headers: {
//             "x-api-key": BLOCKRADER_API_KEY,
//             "Content-Type": "application/json",
//           }
//           });

//           const data = response.data;
//           
//           // 💡 DEBUG: Log the full response data structure to determine the correct key
//           console.log("Blockradar Response Data (Full):", JSON.stringify(data, null, 2));

//           // 💡 FIX: Use the 'id' field from the nested 'data' object as the unique account number.
//           // This 'id' is a unique identifier for the created address/account.
//           const walletSourceAccount = data.data && data.data.address; 

//           if (!walletSourceAccount) {
//               // The error is still helpful if data.data or data.data.id is truly missing
//               throw new Error("Blockradar response missing unique 'id' for source account.");
//           }

// // Save wallet in your MongoDB
//           const newWallet = new Wallet({
//             user_id: userId,
//             currency: currency,
//             // FIX: externalWalletId should also be set to this unique ID (data.data.id)
//             externalWalletId: data.data.id,
//             
//             // FIXED: Using data.data.id as the account number for withdrawals
//             accountNumber: walletSourceAccount, 
//             
//             accountName: `${name}'s Wallet`,
//             status: "ACTIVE",
//             balance: 0,
//           });

//           await newWallet.save();

//           return res.status(201).json({
//               success: true,
//               message: "Wallet created successfully",
//               // 💡 FIX: Use .toObject() to ensure all fields are included in the immediate response.
//               wallet: newWallet.toObject(),
//           });
//     } catch (error) {
//         // Enhance error logging for Axios responses
//         if (error.response) {
//             logger.error(`❌ Blockradar API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
//             // Propagate the provider's error message if available
//             return res.status(error.response.status).json({ success: false, message: error.response.data.message || "Blockradar API call failed." });
//         }
//         logger.error(`❌ Wallet creation error: ${error.message}`);
//         return res.status(500).json({ success: false, message: error.message });
//     }
// };

// /**
//  * Simulate or trigger a deposit (depending on environment)
//  */
// const depositFunds = async (req, res) => {
//   try {
//     const { walletId, amount, currency } = req.body;

//     if (!walletId || !amount || !currency) {
//       return res.status(400).json({
//         success: false,
//         message: "walletId, amount, and currency are required",
//       });
//     }

//     if (!isProduction) {
//       // 🧪 SANDBOX MODE — simulate deposit
//       const response = await axios.post(
//         `${BLOCKRADER_BASE_URL}/simulate/deposit`,
//         { amount, currency },
//         {
//           headers: {
//             "x-api-key": BLOCKRADER_API_KEY,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       logger.info(`🧪 Simulated deposit of ${amount} ${currency} for wallet ${walletId}`);

//       return res.status(200).json({
//         success: true,
//         message: "Deposit simulated successfully (sandbox mode)",
//         data: response.data,
//       });
//     }

//     // 🚀 PRODUCTION MODE — real deposits handled via webhook only
//     return res.status(400).json({
//       success: false,
//       message: "Manual deposits are not allowed in production. Wait for webhook event.",
//     });
//   } catch (error) {
//     logger.error(`❌ Deposit error: ${error.message}`);
//     return res.status(500).json({
//       success: false,
//       message: error.response?.data?.message || error.message,
//     });
//   }
// };

// const initiateWithdrawal = async (req, res) => {
//     try {
//         const { walletCurrency, destinationAccountNumber, amount } = req.body;
//         const userId = req.user.id; // Assuming userId is available via auth middleware

//         if (!walletCurrency || !destinationAccountNumber || !amount) {
//             return res.status(400).json({ success: false, message: "Required fields are missing" });
//         }
        
//         // 💡 DEBUG LOG: Log the authenticated user ID for debugging
//         logger.info(`Attempting withdrawal initiation for authenticated user ID: ${userId}`);

//         const user = await User.findById(userId);
//         
//         // 💡 FIX 1: Provide a more specific error if the User is not found.
//         if (!user) {
//             return res.status(404).json({ success: false, message: `Authenticated User ID ${userId} not found in User collection.` });
//         }
        
//         const wallet = await Wallet.findOne({ currency: walletCurrency, user_id: userId });

//         // 💡 FIX 2: Provide a more specific error if the Wallet is not found.
//         if (!wallet) {
//             return res.status(404).json({ success: false, message: `Wallet in ${walletCurrency} not found for user ${userId}.` });
//         }
        
//         if (wallet.balance < amount) {
//             return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
//         }
//         
//         // 💡 Use the new utility to generate and send OTP
//         await generateAndSendOtp(userId, 'WITHDRAWAL', user.email);

//         return res.status(200).json({
//             success: true,
//             message: "Verification code sent to your email. Please check your inbox/spam folder.",
//         });

//     } catch (error) {
//         logger.error(`❌ Withdrawal initiation error: ${error.message}`);
//         // Send a user-friendly error message, usually just error.message from the util
//         return res.status(500).json({ success: false, message: error.message }); 
//     }
// };

// const completeWithdrawal = async (req, res) => {
//     try {
//         const { 
//             walletCurrency, 
//             destinationAccountNumber, 
//             amount, 
//             otpCode // 💡 NEW REQUIRED FIELD
//         } = req.body;
//         const userId = req.user.id;

//         if (!walletCurrency || !destinationAccountNumber || !amount || !otpCode) {
//             return res.status(400).json({
//                 success: false,
//                 message: "All withdrawal and verification details are required",
//             });
//         }
//         
//         // 💡 OTP Verification
//         const isVerified = await verifyOtp(userId, otpCode, 'WITHDRAWAL');

//         if (!isVerified) {
//              return res.status(401).json({ success: false, message: "Invalid or expired OTP." });
//         }

//         // Fetch Wallet and Re-Check Balance (Crucial for security)
//         const wallet = await Wallet.findOne({ currency: walletCurrency, user_id: userId });
//         if (!wallet) {
//             return res.status(404).json({ success: false, message: "Wallet not found" }); 
//         }
//         if (wallet.balance < amount) {
//              return res.status(400).json({ success: false, message: "Insufficient wallet balance (re-checked)" });
//         }

//         // Execute Withdrawal
//         // ✅ FIX CONFIRMED: wallet.accountNumber is now correctly populated with the UUID/ID.
//         const fromAccount = wallet.accountNumber;
//         const result = await withdrawFundsService(fromAccount, destinationAccountNumber, amount);

//         // Update Balance and Log
//         if (result.success) {
//             wallet.balance -= amount;
//             await wallet.save();
//         }

//         await logTransaction({
//             // ... transaction logging details ...
//             userId,
//             walletId: wallet._id,
//             type: "WITHDRAWAL",
//             amount,
//             currency: wallet.currency,
//             status: result.success ? "COMPLETED" : "FAILED",
//             reference: result.reference,
//             metadata: { provider: result.provider, destination: destinationAccountNumber },
//         });

//         return res.status(200).json({
//             success: true,
//             message: "Withdrawal successful",
//             data: result,
//         });

//     } catch (error) {
//         logger.error(`❌ Withdrawal completion error: ${error.message}`);
//         return res.status(500).json({ success: false, message: error.message });
//     }
// };


// /**
//  * MOCK FUNCTION: Adds funds directly to a user's wallet for testing purposes.
//  * This should ONLY be accessible in development environments and by admins.
//  */

// const addTestFunds = async (req, res) => {
//     // SECURITY CHECK: Ensure this function only runs outside of production
//     if (process.env.NODE_ENV === 'production') {
//         logger.warn(`Attempted to use /test/addFunds in PRODUCTION by user ${req.user.id}`);
//         return res.status(403).json({ success: false, message: "Access forbidden." });
//     }

//     try {
//         // 💡 UPDATE: Allow an optional testUserId for easier debugging in dev environments.
//         const { accountNumber, amount, testUserId } = req.body; 
//         
//         // Determine which user ID to use for the lookup: prefer the one from the body for testing, 
//         // otherwise fall back to the authenticated user ID (req.user.id).
//         const queryUserId = testUserId || req.user.id;

//         const parsedAmount = parseFloat(amount);

//         if (!accountNumber || !parsedAmount || parsedAmount <= 0) {
//             return res.status(400).json({ success: false, message: "Valid account number and positive amount required." });
//         }

//         // 💡 CRITICAL DEBUGGING LOG: Show which user ID is being used for the database query.
//         logger.info(`🔍 Attempting to fund account ${accountNumber} using User ID: ${queryUserId}. (Auth ID: ${req.user.id})`);


//         // 💡 FIX: Find the wallet by its unique accountNumber field and the resolved user ID.
//         const wallet = await Wallet.findOne({ accountNumber, user_id: queryUserId });

//         if (!wallet) {
//             return res.status(404).json({ success: false, message: `Wallet with account number ${accountNumber} not found for user ID ${queryUserId}.` });
//         }

//         // Safely update the balance
//         wallet.balance += parsedAmount;
//         await wallet.save();

//         logger.info(`💰 TEST FUNDS added: ${parsedAmount} ${wallet.currency} to wallet ${wallet._id} for user ${queryUserId}`);

//         return res.status(200).json({
//             success: true,
//             message: `Successfully added ${parsedAmount} ${wallet.currency} for testing.`,
//             newBalance: wallet.balance,
//             walletAccount: wallet.accountNumber, // Provide confirmation
//         });

//     } catch (error) {
//         logger.error(`❌ Test fund addition error: ${error.message}`);
//         return res.status(500).json({ success: false, message: "Failed to add test funds." });
//     }
// };


// module.exports = { createWallet, depositFunds, initiateWithdrawal, completeWithdrawal, addTestFunds };
// const User = require('../models/userModel'); // Required to fetch user email
// const withdrawFundsService = require('../services/withdrawFundService');
// const ninePsbService = require('../services/providers/ninePSBServices'); // 💡 NEW: Import 9PSB Service
// const Wallet = require("../models/walletModel");
// const { generateAndSendOtp, verifyOtp } = require('../utilities/otpUtils')
// const axios = require("axios");
// const logger = require("../utilities/logger");
// const { logTransaction } = require("../utilities/logTransaction");

// const BLOCKRADER_BASE_URL = process.env.BLOCKRADER_BASE_URL;
// const BLOCKRADER_API_KEY = process.env.BLOCKRADER_API_KEY;
// const MASTER_WALLET_ID = process.env.COMPANY_ESCROW_ACCOUNT_ID;
// const isProduction = process.env.NODE_ENV === "production";

// /**
//  * Creates a wallet based on the requested currency:
//  * - Blockradar for non-NGN currencies (crypto/stablecoin).
//  * - 9PSB for NGN (Naira).
//  */
// const createWallet = async (req, res) => {
//     try {
//         // userId, email, name, and currency are mandatory
//         const { userId, email, name, currency } = req.body; 
        
//         if (!userId || !email || !name || !currency) {
//             return res.status(400).json({ success: false, message: "User ID, email, name, and currency are required" });
//         }

//         let walletSourceAccount; // The final account number to save
//         let externalWalletId;   // The external ID/reference to save
//         let provider;           // Which provider created the wallet
//         let responseData;

//         // Check if currency is Naira (NGN)
//         if (currency.toUpperCase() === 'NGN' || currency.toUpperCase() === 'NAIRA') {
            
//             // ----------------------------------------------------
//             // 1. 9PSB WALLET CREATION (REQUIRES FULL KYC DATA)
//             // ----------------------------------------------------
//             provider = '9PSB';

//             // Fetch the user's full profile to get required KYC data
//             const user = await User.findById(userId); 
            
//             // Crucial check: 9PSB requires full KYC data
//             if (!user || !user.kyc || !user.kyc.bvn || !user.kyc.dateOfBirth || !user.kyc.gender || !user.address || !user.phoneNo) {
//                  return res.status(400).json({ 
//                      success: false, 
//                      message: "Full KYC data (BVN, Gender, DOB, Address, Phone No) must be saved in the User profile before creating an NGN wallet." 
//                  });
//              }

//              // Map user model data to 9PSB payload
//              const ninePsbPayload = {
//                  lastName: user.lastName, 
//                  otherNames: user.firstName, // 9PSB uses otherNames for first name
//                  phoneNo: user.phoneNo,
//                  gender: user.kyc.gender, 
//                  // Assuming dateOfBirth is already in 'dd/MM/yyyy' format in the user model
//                  dateOfBirth: user.kyc.dateOfBirth, 
//                  address: user.address,
//                  bvn: user.kyc.bvn,
//                  nationalIdentityNo: user.kyc.nin,
//                  transactionTrackingRef: `TX-NGN-${Date.now()}-${userId.slice(-4)}`
//              };

//              // Call 9PSB service
//              const ninePsbResponse = await ninePsbService.createNairaWallet(ninePsbPayload);
//              responseData = ninePsbResponse;

//              // Map 9PSB response data to internal fields
//              walletSourceAccount = ninePsbResponse.data.account_number; // The 9PSB bank account number
//              externalWalletId = ninePsbResponse.data.account_number;    // Use account number as the external ID
             
//         } else {
//             // ----------------------------------------------------
//             // 2. BLOCKRADER WALLET CREATION (CRYPTO/STABLECOIN)
//             // ----------------------------------------------------
//             provider = 'BLOCKRADER';
            
//             const response = await axios.post(`${BLOCKRADER_BASE_URL}/wallets/${MASTER_WALLET_ID}/addresses`,
//                 {
//                     disableAutoSweep: true,
//                     enableGaslessWithdraw: true,
//                     metadata:{userId: userId, email: email},
//                     name: `${name}'s Wallet`,
//                 },
//                 {
//                 headers: {
//                     "x-api-key": BLOCKRADER_API_KEY,
//                     "Content-Type": "application/json",
//                 }
//             });

//             responseData = response.data;
            
//             // 💡 FIX: Use the 'address' field for the account number
//             walletSourceAccount = responseData.data && responseData.data.address; 
//             // 💡 FIX: Use the unique 'id' field as the external wallet ID
//             externalWalletId = responseData.data && responseData.data.id; 

//             if (!walletSourceAccount || !externalWalletId) {
//                 throw new Error("Blockradar response missing required 'address' or 'id' for source account.");
//             }
//         }

//         // 3. SAVE WALLET IN MONGODB (Unified Logic)
//         const newWallet = new Wallet({
//             user_id: userId,
//             currency: currency.toUpperCase(),
//             externalWalletId: externalWalletId,
//             accountNumber: walletSourceAccount, 
//             accountName: `${name}'s Wallet`,
//             provider: provider, // Save which provider was used
//             status: "ACTIVE",
//             balance: 0,
//         });

//         await newWallet.save();

//         return res.status(201).json({
//             success: true,
//             message: `${currency.toUpperCase()} Wallet created successfully by ${provider}`,
//             wallet: newWallet.toObject(),
//             providerResponse: responseData // Optionally return provider response for debugging
//         });
        
//     } catch (error) {
//         // Enhance error logging for Axios responses
//         if (error.response) {
//             logger.error(`❌ API Error (${provider || 'Unknown'} - ${error.response.status}): ${JSON.stringify(error.response.data)}`);
//             // Propagate the provider's error message if available
//             return res.status(error.response.status).json({ success: false, message: error.response.data.message || `${provider || 'API'} call failed.` });
//         }
//         logger.error(`❌ Wallet creation error: ${error.message}`);
//         return res.status(500).json({ success: false, message: error.message });
//     }
// };

// /**
//  * Simulate or trigger a deposit (depending on environment)
//  */
// const depositFunds = async (req, res) => {
//  try {
//    const { walletId, amount, currency } = req.body;

//    if (!walletId || !amount || !currency) {
//      return res.status(400).json({
//        success: false,
//        message: "walletId, amount, and currency are required",
//      });
//    }

//    if (!isProduction) {
//      // 🧪 SANDBOX MODE — simulate deposit
//      const response = await axios.post(
//        `${BLOCKRADER_BASE_URL}/simulate/deposit`,
//        { amount, currency },
//        {
//          headers: {
//            "x-api-key": BLOCKRADER_API_KEY,
//            "Content-Type": "application/json",
//          },
//        }
//      );

//      logger.info(`🧪 Simulated deposit of ${amount} ${currency} for wallet ${walletId}`);

//      return res.status(200).json({
//        success: true,
//        message: "Deposit simulated successfully (sandbox mode)",
//        data: response.data,
//      });
//    }

//    // 🚀 PRODUCTION MODE — real deposits handled via webhook only
//    return res.status(400).json({
//      success: false,
//      message: "Manual deposits are not allowed in production. Wait for webhook event.",
//    });
//  } catch (error) {
//    logger.error(`❌ Deposit error: ${error.message}`);
//    return res.status(500).json({
//      success: false,
//      message: error.response?.data?.message || error.message,
//    });
//  }
// };

// const initiateWithdrawal = async (req, res) => {
//     try {
//         const { walletCurrency, destinationAccountNumber, amount } = req.body;
//         const userId = req.user.id; // Assuming userId is available via auth middleware

//         if (!walletCurrency || !destinationAccountNumber || !amount) {
//             return res.status(400).json({ success: false, message: "Required fields are missing" });
//         }
        
//         // 💡 DEBUG LOG: Log the authenticated user ID for debugging
//         logger.info(`Attempting withdrawal initiation for authenticated user ID: ${userId}`);

//         const user = await User.findById(userId);
        
//         // 💡 FIX 1: Provide a more specific error if the User is not found.
//         if (!user) {
//             return res.status(404).json({ success: false, message: `Authenticated User ID ${userId} not found in User collection.` });
//         }
        
//         const wallet = await Wallet.findOne({ currency: walletCurrency, user_id: userId });

//         // 💡 FIX 2: Provide a more specific error if the Wallet is not found.
//         if (!wallet) {
//             return res.status(404).json({ success: false, message: `Wallet in ${walletCurrency} not found for user ${userId}.` });
//         }
        
//         if (wallet.balance < amount) {
//             return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
//         }
        
//         // 💡 Use the new utility to generate and send OTP
//         await generateAndSendOtp(userId, 'WITHDRAWAL', user.email);

//         return res.status(200).json({
//             success: true,
//             message: "Verification code sent to your email. Please check your inbox/spam folder.",
//         });

//     } catch (error) {
//         logger.error(`❌ Withdrawal initiation error: ${error.message}`);
//         // Send a user-friendly error message, usually just error.message from the util
//         return res.status(500).json({ success: false, message: error.message }); 
//     }
// };

// const completeWithdrawal = async (req, res) => {
//     try {
//         const { 
//             walletCurrency, 
//             destinationAccountNumber, 
//             amount, 
//             otpCode // 💡 NEW REQUIRED FIELD
//         } = req.body;
//         const userId = req.user.id;

//         if (!walletCurrency || !destinationAccountNumber || !amount || !otpCode) {
//             return res.status(400).json({
//                 success: false,
//                 message: "All withdrawal and verification details are required",
//             });
//         }
        
//         // 💡 OTP Verification
//         const isVerified = await verifyOtp(userId, otpCode, 'WITHDRAWAL');

//         if (!isVerified) {
//              return res.status(401).json({ success: false, message: "Invalid or expired OTP." });
//         }

//         // Fetch Wallet and Re-Check Balance (Crucial for security)
//         const wallet = await Wallet.findOne({ currency: walletCurrency, user_id: userId });
//         if (!wallet) {
//             return res.status(404).json({ success: false, message: "Wallet not found" }); 
//         }
//         if (wallet.balance < amount) {
//              return res.status(400).json({ success: false, message: "Insufficient wallet balance (re-checked)" });
//         }

//         // Execute Withdrawal
//         // ✅ FIX CONFIRMED: wallet.accountNumber is now correctly populated with the UUID/ID.
//         const fromAccount = wallet.accountNumber;
//         const result = await withdrawFundsService(fromAccount, destinationAccountNumber, amount);

//         // Update Balance and Log
//         if (result.success) {
//             wallet.balance -= amount;
//             await wallet.save();
//         }

//         await logTransaction({
//             // ... transaction logging details ...
//             userId,
//             walletId: wallet._id,
//             type: "WITHDRAWAL",
//             amount,
//             currency: wallet.currency,
//             status: result.success ? "COMPLETED" : "FAILED",
//             reference: result.reference,
//             metadata: { provider: result.provider, destination: destinationAccountNumber },
//         });

//         return res.status(200).json({
//             success: true,
//             message: "Withdrawal successful",
//             data: result,
//         });

//     } catch (error) {
//         logger.error(`❌ Withdrawal completion error: ${error.message}`);
//         return res.status(500).json({ success: false, message: error.message });
//     }
// };


// /**
//  * MOCK FUNCTION: Adds funds directly to a user's wallet for testing purposes.
//  * This should ONLY be accessible in development environments and by admins.
//  */

// const addTestFunds = async (req, res) => {
//     // SECURITY CHECK: Ensure this function only runs outside of production
//     if (process.env.NODE_ENV === 'production') {
//         logger.warn(`Attempted to use /test/addFunds in PRODUCTION by user ${req.user.id}`);
//         return res.status(403).json({ success: false, message: "Access forbidden." });
//     }

//     try {
//         // 💡 UPDATE: Allow an optional testUserId for easier debugging in dev environments.
//         const { accountNumber, amount, testUserId } = req.body; 
        
//         // Determine which user ID to use for the lookup: prefer the one from the body for testing, 
//         // otherwise fall back to the authenticated user ID (req.user.id).
//         const queryUserId = testUserId || req.user.id;

//         const parsedAmount = parseFloat(amount);

//         if (!accountNumber || !parsedAmount || parsedAmount <= 0) {
//             return res.status(400).json({ success: false, message: "Valid account number and positive amount required." });
//         }

//         // 💡 CRITICAL DEBUGGING LOG: Show which user ID is being used for the database query.
//         logger.info(`🔍 Attempting to fund account ${accountNumber} using User ID: ${queryUserId}. (Auth ID: ${req.user.id})`);


//         // 💡 FIX: Find the wallet by its unique accountNumber field and the resolved user ID.
//         const wallet = await Wallet.findOne({ accountNumber, user_id: queryUserId });

//         if (!wallet) {
//             return res.status(404).json({ success: false, message: `Wallet with account number ${accountNumber} not found for user ID ${queryUserId}.` });
//         }

//         // Safely update the balance
//         wallet.balance += parsedAmount;
//         await wallet.save();

//         logger.info(`💰 TEST FUNDS added: ${parsedAmount} ${wallet.currency} to wallet ${wallet._id} for user ${queryUserId}`);

//         return res.status(200).json({
//             success: true,
//             message: `Successfully added ${parsedAmount} ${wallet.currency} for testing.`,
//             newBalance: wallet.balance,
//             walletAccount: wallet.accountNumber, // Provide confirmation
//         });

//     } catch (error) {
//         logger.error(`❌ Test fund addition error: ${error.message}`);
//         return res.status(500).json({ success: false, message: "Failed to add test funds." });
//     }
// };

// module.exports = { createWallet, depositFunds, initiateWithdrawal, completeWithdrawal, addTestFunds };

const User = require('../models/userModel'); // Required to fetch user email
const Kyc = require('../models/kycModel'); // 💡 NEW: Import Kyc Model
const withdrawFundsService = require('../services/withdrawFundService');
const ninePsbService = require('../services/providers/ninePSBServices'); 
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
const createWallet = async (req, res) => {
    try {
        // userId, email, name, and currency are mandatory
        const { userId, email, name, currency } = req.body; 
        
        if (!userId || !email || !name || !currency) {
            return res.status(400).json({ success: false, message: "User ID, email, name, and currency are required" });
        }

        let walletSourceAccount; // The final account number to save
        let externalWalletId;   // The external ID/reference to save
        let provider;           // Which provider created the wallet
        let responseData;

        // Check if currency is Naira (NGN)
        if (currency.toUpperCase() === 'NGN' || currency.toUpperCase() === 'NAIRA') {
            
            // ----------------------------------------------------
            // 1. 9PSB WALLET CREATION (REQUIRES FULL KYC DATA)
            // ----------------------------------------------------
            provider = '9PSB';

            let ninePsbPayload;

            try {
                // 💡 CRITICAL FIX: Use the Kyc static method to fetch decrypted and APPROVED data.
                ninePsbPayload = await Kyc.getVerifiedDataFor9PSB(userId); 

                // Map fields returned by the static method to 9PSB's required payload
                // The static method returns dateOfBirth as a Date object, so we format it.
                // The static method returns gender as 0/1, which 9PSB expects.
                // The static method returns bvn, nin, and email decrypted from the User record.

                ninePsbPayload.otherNames = ninePsbPayload.firstname;
                ninePsbPayload.phoneNo = ninePsbPayload.phone_number; 
                ninePsbPayload.dateOfBirth = ninePsbPayload.dateOfBirth.toISOString().split('T')[0]; // Format to YYYY-MM-DD
                delete ninePsbPayload.firstname;
                delete ninePsbPayload.phone_number;
                
                ninePsbPayload.transactionTrackingRef = `TX-NGN-${Date.now()}-${userId.slice(-4)}`;

            } catch (kycError) {
                // This catches the "KYC record not found or is not APPROVED." error
                return res.status(403).json({ 
                    success: false, 
                    message: `NGN account creation requires approved KYC data: ${kycError.message}` 
                });
            }
        
            // Call 9PSB service
            const ninePsbResponse = await ninePsbService.createNairaWallet(ninePsbPayload);
            responseData = ninePsbResponse;

            // Map 9PSB response data to internal fields
            walletSourceAccount = ninePsbResponse.data.account_number; // The 9PSB bank account number
            externalWalletId = ninePsbResponse.data.account_number;    // Use account number as the external ID
            
        } else {
            // ----------------------------------------------------
            // 2. BLOCKRADER WALLET CREATION (CRYPTO/STABLECOIN)
            // ----------------------------------------------------
            provider = 'BLOCKRADER';
            
            const response = await axios.post(`${BLOCKRADER_BASE_URL}/wallets/${MASTER_WALLET_ID}/addresses`,
                {
                    disableAutoSweep: true,
                    enableGaslessWithdraw: true,
                    metadata:{userId: userId, email: email},
                    name: `${name}'s Wallet`,
                },
                {
                headers: {
                    "x-api-key": BLOCKRADER_API_KEY,
                    "Content-Type": "application/json",
                }
            });

            responseData = response.data;
            
            // 💡 FIX: Use the 'address' field for the account number
            walletSourceAccount = responseData.data && responseData.data.address; 
            // 💡 FIX: Use the unique 'id' field as the external wallet ID
            externalWalletId = responseData.data && responseData.data.id; 

            if (!walletSourceAccount || !externalWalletId) {
                throw new Error("Blockradar response missing required 'address' or 'id' for source account.");
            }
        }

        // 3. SAVE WALLET IN MONGODB (Unified Logic)
        const newWallet = new Wallet({
            user_id: userId,
            currency: currency.toUpperCase(),
            externalWalletId: externalWalletId,
            accountNumber: walletSourceAccount, 
            accountName: `${name}'s Wallet`,
            provider: provider, // Save which provider was used
            status: "ACTIVE",
            balance: 0,
        });

        await newWallet.save();

        return res.status(201).json({
            success: true,
            message: `${currency.toUpperCase()} Wallet created successfully by ${provider}`,
            wallet: newWallet.toObject(),
            providerResponse: responseData // Optionally return provider response for debugging
        });
        
    } catch (error) {
        // Enhance error logging for Axios responses
        if (error.response) {
            logger.error(`❌ API Error (${provider || 'Unknown'} - ${error.response.status}): ${JSON.stringify(error.response.data)}`);
            // Propagate the provider's error message if available
            return res.status(error.response.status).json({ success: false, message: error.response.data.message || `${provider || 'API'} call failed.` });
        }
        logger.error(`❌ Wallet creation error: ${error.message}`);
        return res.status(500).json({ success: false, message: error.message });
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

   // 🚀 PRODUCTION MODE — real deposits handled via webhook only
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

module.exports = { createWallet, depositFunds, initiateWithdrawal, completeWithdrawal, addTestFunds };
