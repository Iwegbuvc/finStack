// FIXING THE ERROR:Cast to embedded failed for value \"{\n  message: 'Settlement failed during initiation
// const mongoose = require("mongoose");
// const P2PTrade = require("../models/p2pModel");
// const User = require("../models/userModel");
// const Wallet = require("../models/walletModel");
// const blockrader = require("./providers/blockrader");
// // 💡 NEW: Import OTP Utilities
// const { generateAndSendOtp, verifyOtp } = require('../utilities/otpUtils'); // Assuming otpUtils.js is in a '../utils' directory

// // Custom Error Class for clearer API responses
// class TradeError extends Error {
//     constructor(message, status = 400) {
//         super(message);
//         this.name = 'TradeError';
//         this.status = status;
//     }
// }


// // Basic state machine allowed transitions
// const ALLOWED_STATES = {
//     INIT: "PENDING_PAYMENT",
//     PAYMENT_CONFIRMED_BY_BUYER: "PAYMENT_CONFIRMED_BY_BUYER",
//     COMPLETED: "COMPLETED",
//     FAILED: "FAILED",
//     CANCELLED: "CANCELLED",
//     CANCELLED_REVERSED: "CANCELLED_REVERSED",
// };

// // --------- Helpers ----------

// /**
//  * Helper to fetch a user and throw a standard error if not found.
//  * @param {string} userId - The ID of the user to fetch.
//  * @returns {Promise<object>} The user document.
//  */
// async function checkUser(userId) {
//     // Fetches user role for authorization checks and validates existence.
//     const user = await User.findById(userId).select('role').lean(); 
//     if (!user) {
//         throw new TradeError("User not found.", 404);
//     }
//     return user;
// }

// /**
//  * Helper to log trade events.
//  */
// function safeLog(trade, logEntry) {
//     // This is a placeholder; you can enhance this with a proper logger.
//     console.log(`[TRADE_LOG] Ref: ${trade.reference} - ${logEntry.message}`);
// }
// /**
//  * Helper to resolve the provider-specific Wallet ID for a user and currency.
//  * @param {string} userId - The ID of the user (Buyer or Merchant).
//  * @param {string} currency - The currency code (e.g., 'cNGN').
//  * @returns {Promise<string>} The Blockrader Wallet ID (UUID).
//  */
// async function resolveUserWalletId(userId, currency) {
//     // 💡 CRITICAL FIX: Change 'userId' to 'user_id' to match the schema
//     const wallet = await Wallet.findOne({ user_id: userId, currency: currency.toUpperCase() }).lean();
    
//     if (!wallet || !wallet.externalWalletId) {
//         throw new TradeError(`Wallet not found or missing provider ID for user ${userId} and currency ${currency}.`, 404);
//     }
//     return wallet.externalWalletId;
// }

// /**
//  * Helper to resolve the external crypto address for a user and currency.
//  * @param {string} userId - The ID of the user (Buyer or Merchant).
//  * @param {string} currency - The currency code (e.g., 'cNGN').
//  * @returns {Promise<string>} The external blockchain address (e.g., 0x address).
//  */
// async function resolveUserCryptoAddress(userId, currency) {
//     // 💡 CRITICAL FIX: Change 'userId' to 'user_id' to match the schema
//     const wallet = await Wallet.findOne({ user_id: userId, currency: currency.toUpperCase() }).lean();
    
//     if (!wallet || !wallet.walletAddress) {
//         throw new TradeError(`Missing destination crypto address for user ${userId} and target currency ${currency}.`, 400);
//     }
//     return wallet.walletAddress;
// }
// // ----------------------------------------------------

// /**
//  * @name updateTradeStatusAndLog
//  * @description Atomically updates the trade status and logs the event.
//  * @param {Object} session - **REQUIRED FOR ATOMICITY** The Mongoose session object (optional).
//  */
// async function updateTradeStatusAndLog(tradeId, newStatus, logEntry, expectedStatus = null, session = null) {
//     const update = {
//         $set: { status: newStatus },
//         $push: { logs: { ...logEntry, time: new Date() } }
//     };

//     // Use findByIdAndUpdate for atomic status change
//     const query = { _id: tradeId };
//     if (expectedStatus) {
//         query.status = expectedStatus; // Optimistic locking on expected status
//     }
    
//     // 💡 CRITICAL: Include the session in the options if provided
//     const options = { new: true, lean: true };
//     if (session) {
//         options.session = session;
//     }

//     const updatedTrade = await P2PTrade.findOneAndUpdate(
//         query,
//         update,
//         options
//     );

//     if (!updatedTrade) {
//         if (expectedStatus) {
//             throw new TradeError(`Trade ${tradeId} is not in the expected status (${expectedStatus}). Current status prevents transition to ${newStatus}.`, 409);
//         }
//         throw new TradeError(`Trade ${tradeId} not found or status update failed.`, 404);
//     }

//     return updatedTrade;
// }

// /**
//  * @name performEscrow
//  * @description Isolates the external API call and handles immediate failure.
//  * @throws {TradeError} If the provider API initiation fails.
//  */
// async function performEscrow(trade, sourceWalletId, masterCryptoAddress, actorId, ip, role) {
//     // Perform the external provider call (escrow transfer).
//     const transferResult = await blockrader.transferFunds(
//         sourceWalletId, // Source: User/Merchant Wallet UUID
//         blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Destination: Master Wallet UUID
//         trade.amountTarget, // Escrow the target currency amount
//         trade.currencyTarget,
//         masterCryptoAddress // Pass the required Master Wallet 0x Address
//     );

//     // CRITICAL CHECK: Check for successful API response structure (data.id)
//     if (!transferResult || !transferResult.data || !transferResult.data.id) {
//         const errorMessage = `Failed to escrow funds. Provider response: ${JSON.stringify(transferResult)}`;
//         console.error(errorMessage);
//         // We log the specific failure and throw a concise error
//         await updateTradeStatusAndLog(
//             trade._id,
//             ALLOWED_STATES.FAILED,
//             { message: `Escrow attempt failed at provider API: ${errorMessage}`, actor: 'system', role: 'system', ip }
//         );
//         throw new TradeError("Failed to initiate escrow transfer: Provider API initiation failed.");
//     }

//     return transferResult;
// }


// // --------- Service functions ----------
// module.exports = {
//     async initiateTrade(buyerId, merchantId, data, ip = null) {
//         await checkUser(buyerId);
//         await checkUser(merchantId);

//         // 1. Create initial DB record inside a transaction
//         const session = await mongoose.startSession();
//         session.startTransaction();
//         let trade;

//         try {
//             const tradeDoc = await P2PTrade.create(
//                 [
//                     {
//                         reference: `${data.reference || `REF_${Date.now()}`}`,
//                         userId: buyerId,
//                         merchantId,
//                         amountSource: data.amountSource,
//                         amountTarget: data.amountTarget,
//                         currencySource: data.currencySource,
//                         currencyTarget: data.currencyTarget,
//                         rate: data.rate || 1,
//                         provider: "BLOCKRADER",
//                         // UNIFIED FLOW: Always set status to INIT
//                         status: ALLOWED_STATES.INIT, 
//                         logs: []
//                     }
//                 ],
//                 { session }
//             );

//             trade = tradeDoc[0];
//             safeLog(trade, { message: "Trade created. Awaiting buyer payment.", actor: buyerId, role: "buyer", ip, time: new Date() });
            
//             await trade.save({ session });
//             await session.commitTransaction();

//         } catch (err) {
//             await session.abortTransaction();
//             throw err;
//         } finally {
//             session.endSession();
//         }

//         // REMOVED: All post-commit if/else logic for internal vs external flows.

//         return await P2PTrade.findById(trade._id).lean();
//     },

//     async confirmBuyerPayment(reference, buyerId, ip = null) {
//         if (!reference) throw new TradeError("Reference required");

//         const trade = await P2PTrade.findOne({ reference });
//         if (!trade) throw new TradeError("Trade not found", 404);

//         // --- ADDED GUARDS ---
//         if (trade.userId.toString() !== buyerId.toString()) {
//             throw new TradeError("Unauthorized: Only the buyer can confirm payment.", 403);
//         }
//         if (trade.status !== ALLOWED_STATES.INIT) {
//             throw new TradeError(`Cannot confirm payment. Trade is currently in status: ${trade.status}.`, 409);
//         }
//         // REMOVED: isInternalTrade check here, as this is the standard flow now.
//         // --- END GUARDS ---
        
//         // 🚨 IMPORTANT: Add payment verification logic here for on-platform crypto payments 
//         // (like cNGN) before proceeding to escrow!

//         // Now we need to escrow merchant's asset (target currency) into company escrow.
//         const merchantWalletId = await resolveUserWalletId(trade.merchantId, trade.currencyTarget);
//         const masterWalletCryptoAddress = blockrader.ESCROW_DESTINATION_ADDRESS;

//         if (!masterWalletCryptoAddress) {
//             throw new TradeError("FATAL: MASTER_WALLET_ADDRESS is missing in environment variables for escrow.");
//         }

//         // Call provider: move merchant asset -> company escrow (Master Wallet)
//         // This is a Child -> Master transfer (Escrow)
//         const transferResult = await blockrader.transferFunds(
//             merchantWalletId, // Source: Merchant Wallet UUID
//             blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Destination: Master Wallet UUID
//             trade.amountTarget,
//             trade.currencyTarget,
//             masterWalletCryptoAddress // Pass the required Master Wallet 0x Address
//         );

//         // ... [CRITICAL CHECK remains the same] ...
//         if (!transferResult || !transferResult.data || !transferResult.data.id) {
//             const errorMessage = `Failed to escrow merchant funds. Provider response: ${JSON.stringify(transferResult)}`;
//             console.error(errorMessage);
//             throw new TradeError("Failed to initiate merchant escrow: Provider API initiation failed.");
//         }

//         const txId = transferResult.data.id || transferResult.txId || "n/a";

//         // Update DB atomically (using helper which uses atomic findByIdAndUpdate)
//         const updatedTrade = await updateTradeStatusAndLog(
//             trade._id,
//             ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER,
//             {
//                 message: `Buyer confirmed payment; merchant asset escrow initiated (tx:${txId}). Awaiting provider confirmation.`,
//                 actor: buyerId,
//                 role: "buyer",
//                 ip,
//             },
//             ALLOWED_STATES.INIT // Ensure we are only updating from INIT state
//         );

//         return updatedTrade;
//     },

//     /**
//      * @name initiateMerchantPaymentConfirmation (NEW)
//      * @description Step 1: Sends an OTP to the merchant's email to authorize the fund release.
//      */
//     async initiateMerchantPaymentConfirmation(reference, merchantId, ip = null) {
//         if (!reference) throw new TradeError("Reference required");
//         let trade = await P2PTrade.findOne({ reference });
//         if (!trade) throw new TradeError("Trade not found", 404);

//         // --- GUARDS ---
//         if (trade.merchantId.toString() !== merchantId.toString()) {
//             throw new TradeError("Unauthorized: Only the merchant can initiate confirmation.", 403);
//         }
        
//         // Use the expected status for external settlement
//         const expectedStatus = ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER;

//         if (trade.status !== expectedStatus) {
//             throw new TradeError(`Cannot initiate confirmation. Trade is in status: ${trade.status}. Expected status: ${expectedStatus}.`, 409);
//         }
//         // --- END GUARDS ---
        
//         // 1. Fetch Merchant Email 
//         const merchantUser = await User.findById(merchantId).select('email').lean();
//         if (!merchantUser) {
//             throw new TradeError("Merchant user not found.", 404);
//         }

//         // 2. Generate and Send OTP (Using 'P2P_SETTLEMENT' as the action type)
//         await generateAndSendOtp(merchantId, 'P2P_SETTLEMENT', merchantUser.email); 

//         return { message: "Verification code sent to merchant's email. Awaiting OTP confirmation." };
//     },

//     /**
//      * confirmMerchantPayment (MODIFIED)
//      * - This triggers the release from escrow to the rightful recipient AFTER OTP verification.
//      */
//     async confirmMerchantPayment(reference, merchantId, otpCode, ip = null) { // 💡 SIGNATURE CHANGE: otpCode added
//         if (!reference || !otpCode) throw new TradeError("Reference and OTP code required"); // 💡 REQUIRED FIELD CHECK ADDED

//         let trade = await P2PTrade.findOne({ reference });
//         if (!trade) throw new TradeError("Trade not found", 404);

//         // --- ADDED GUARDS ---
//         if (trade.merchantId.toString() !== merchantId.toString()) {
//             throw new TradeError("Unauthorized: Only the merchant can confirm payment.", 403);
//         }

//         // UNIFIED FLOW: Expected status is always PAYMENT_CONFIRMED_BY_BUYER
//         const expectedStatus = ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER; 

//         if (trade.status !== expectedStatus) {
//             throw new TradeError(`Cannot confirm/settle. Trade is in status: ${trade.status}. Expected status: ${expectedStatus}.`, 409);
//         }
//         // --- END GUARDS ---
        
//         // 🔑 NEW STEP: OTP Verification
//         const isVerified = await verifyOtp(merchantId, otpCode, 'P2P_SETTLEMENT');
        
//         if (!isVerified) {
//             // Throw a 401 error, which handleServiceError will map appropriately.
//             throw new TradeError("Invalid or expired OTP.", 401); 
//         }
//         // -----------------------------

//         let transferResult = null;

//         try {
//             // 1. Perform external settlement (Master -> Buyer) - This is the ONLY flow now
//             const buyerDestinationId = await resolveUserWalletId(trade.userId, trade.currencyTarget);
//             const buyerCryptoAddress = await resolveUserCryptoAddress(trade.userId, trade.currencyTarget);

//             transferResult = await blockrader.transferFunds(
//                 blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Source: Master Wallet UUID (escrow)
//                 buyerDestinationId, // Destination: Buyer UUID
//                 trade.amountTarget,
//                 trade.currencyTarget,
//                 buyerCryptoAddress // Pass the required 0x destination address
//             );

//             // ... [CRITICAL CHECK remains the same] ...
//             if (!transferResult || !transferResult.data || !transferResult.data.id) {
//                 const errorMessage = `Failed to release escrowed asset to recipient. Provider response: ${JSON.stringify(transferResult)}`;
//                 console.error(errorMessage);
//                 throw new TradeError("Settlement transfer initiation failed at provider.");
//             }

//             const txId = transferResult.data.id || transferResult.txId || "n/a";
            
//             // 2. Start Mongoose Session for Atomic DB Update
//             const session = await mongoose.startSession();
//             session.startTransaction();
//             let updatedTrade;

//             try {
//                 // CRITICAL FIX: Update to COMPLETED status within the transaction
//                 updatedTrade = await updateTradeStatusAndLog(
//                     trade._id,
//                     ALLOWED_STATES.COMPLETED,
//                     {
//                         message: `External settlement initiated (tx:${txId}). Awaiting webhook confirmation.`,
//                         actor: merchantId,
//                         role: "merchant",
//                         ip,
//                     },
//                     expectedStatus, // Ensure we are only updating from the correct pre-settlement status
//                     session // 💡 PASS THE SESSION
//                 );
                
//                 // 3. Commit the transaction if successful
//                 await session.commitTransaction();

//             } catch (dbError) {
//                 // ... [error handling] ...
//                 await session.abortTransaction();
//                 console.error("CRITICAL: Settlement DB update failed after successful external transfer.", dbError);
//                 throw new TradeError("Database update failed after successful external transfer initiation.");
//             } finally {
//                 session.endSession();
//             }

//             return updatedTrade;

//         } catch (error) {
//             // If API call fails, we still want to log it and mark the trade as FAILED
//             if (trade) {
//                 await updateTradeStatusAndLog(
//                     trade._id,
//                     ALLOWED_STATES.FAILED,
//                     {
//                         // ✅ APPLIED FIX: Use the robust way to stringify error to prevent Mongoose CastError.
//                         message: `Settlement failed during initiation: ${String(error?.message || error).trim()}`,
//                         actor: 'system',
//                         role: 'system',
//                         ip,
//                     }
//                 );
//             }
//             throw error; // Re-throw the original error
//         }
//     },

//     async cancelTrade(reference, userId, ip = null) {
//         if (!reference) throw new TradeError("Reference required");
//         let trade = await P2PTrade.findOne({ reference });
//         if (!trade) throw new TradeError("Trade not found", 404);

//         // Authorization check
//         const user = await checkUser(userId);
//         const isAdminUser = user.role === "admin";

//         if (trade.userId.toString() !== userId.toString() && !isAdminUser) {
//             throw new TradeError("Not authorized to cancel this trade", 403);
//         }

//         // Prevent cancelling after completion or reversal
//         if ([ALLOWED_STATES.COMPLETED, ALLOWED_STATES.CANCELLED_REVERSED, ALLOWED_STATES.FAILED].includes(trade.status)) {
//             throw new TradeError(`Cannot cancel a trade in status: ${trade.status}`, 409);
//         }

//         // REMOVED: const internal = isInternalTrade(trade);
//         let reversalType = null;
//         let sourceCurrency = null;
//         let sourceDestinationId = null;
//         let sourceCryptoAddress = null;
//         let sourceAmount = null;

//         try {
//             // 1. Determine reversal details: ONLY check for the single active escrow state
//             if (trade.status === ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER) {
//                 // We reverse the escrowed asset (currencyTarget) back to the Merchant
//                 sourceCurrency = trade.currencyTarget;
//                 sourceAmount = trade.amountTarget;
//                 sourceDestinationId = await resolveUserWalletId(trade.merchantId, sourceCurrency);
//                 sourceCryptoAddress = await resolveUserCryptoAddress(trade.merchantId, sourceCurrency);
//                 reversalType = 'External Escrow (Merchant)';
//             }
            
//             // REMOVED: The old 'ESCROWED_WAIT_MERCHANT' reversal check.

//             // 2. Perform external reversal (Master -> Original Owner)
//             if (reversalType) {
//                 // ... [transferFunds call and checks remains the same] ...

//                 const transferResult = await blockrader.transferFunds(
//                     blockrader.BLOCKRADER_MASTER_WALLET_UUID, 
//                     sourceDestinationId, 
//                     sourceAmount,
//                     sourceCurrency,
//                     sourceCryptoAddress 
//                 );

//                 if (!transferResult || !transferResult.data || !transferResult.data.id) {
//                     const errorMessage = `${reversalType} reversal failed at provider. Provider response: ${JSON.stringify(transferResult)}`;
//                     console.error(errorMessage);
//                     throw new TradeError(`Escrow reversal failed at provider for ${reversalType}.`);
//                 }

//                 const txId = transferResult.data.id || transferResult.txId || "n/a";

//                 // 3. Start Mongoose Session for Atomic DB Update
//                 const session = await mongoose.startSession();
//                 session.startTransaction();
//                 let updatedTrade;

//                 try {
//                     // Atomic status update to CANCELLED_REVERSED
//                     updatedTrade = await updateTradeStatusAndLog(
//                         trade._id,
//                         ALLOWED_STATES.CANCELLED_REVERSED,
//                         {
//                             message: `${reversalType} reversed (tx:${txId}).`,
//                             actor: userId,
//                             role: isAdminUser ? 'admin' : 'requester',
//                             ip,
//                         },
//                         trade.status, 
//                         session 
//                     );
                    
//                     // 4. Commit the transaction
//                     await session.commitTransaction();
//                     return updatedTrade;
//                 } catch (dbError) {
//                     // ... [error handling] ...
//                     await session.abortTransaction();
//                     console.error("CRITICAL: Reversal DB update failed after successful external reversal.", dbError);
//                     throw new TradeError("Database update failed after successful external reversal initiation.");
//                 } finally {
//                     session.endSession();
//                 }

//             }

//             // Fallthrough: Generic cancel if no reversal was needed (only if status is INIT)
//             return await updateTradeStatusAndLog(
//                 trade._id,
//                 ALLOWED_STATES.CANCELLED,
//                 {
//                     message: "Trade cancelled (no reversal needed/possible).",
//                     actor: userId,
//                     role: isAdminUser ? 'admin' : 'requester',
//                     ip,
//                 },
//                 trade.status
//             );

//         } catch (error) {
//             // If reversal fails, we mark the trade as FAILED and log the error.
//             await updateTradeStatusAndLog(
//                 trade._id,
//                 ALLOWED_STATES.FAILED,
//                 {
//                     // ✅ APPLIED FIX: Use the robust way to stringify error to prevent Mongoose CastError.
//                     message: `Cancellation/Reversal failed: ${String(error?.message || error).trim()}`,
//                     actor: 'system',
//                     role: 'system',
//                     ip,
//                 }
//             );
//             throw error; // Re-throw the original error
//         }
//     },

//     // ... [Utility functions remain the same] ...
//     async getTradeByReference(reference) {
//         return await P2PTrade.findOne({ reference }).populate("userId", "firstName email role").populate("merchantId", "firstName email role").lean();
//     },

//     async listTrades(filter = {}, page = 1, pageSize = 20) {
//         const q = {};
//         if (filter.status) q.status = filter.status;
//         if (filter.userId) q.userId = filter.userId;
//         if (filter.merchantId) q.merchantId = filter.merchantId;

//         const [trades, total] = await Promise.all([
//             P2PTrade.find(q).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
//             P2PTrade.countDocuments(q)
//         ]);

//         return { trades, total, page, pageSize };
//     }
// };

// FIXING THE ERROR:AVOIDIG HAVING AN EMPTY LOG MESSAGE IN THE DB
const mongoose = require("mongoose");
const P2PTrade = require("../models/p2pModel");
const User = require("../models/userModel");
const Wallet = require("../models/walletModel");
const blockrader = require("./providers/blockrader");
const { generateAndSendOtp, verifyOtp } = require('../utilities/otpUtils'); 
const { updateTradeStatusAndLogSafe } = require('../utilities/tradeUpdater');
const MerchantAd = require("../models/merchantModel");
const logger = require("../utilities/logger");
const { getCache, setCache, redisClient } = require('../utilities/redis');
const FeeConfig = require('../models/feeConfigModel');
const CACHE_TTL = Number(process.env.BALANCE_CACHE_TTL_SECONDS || 30);


// Custom Error Class for clearer API responses
class TradeError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.name = 'TradeError';
        this.status = status;
    }
}

// Basic state machine allowed transitions
const ALLOWED_STATES = {
    INIT: "PENDING_PAYMENT",
    PAYMENT_CONFIRMED_BY_BUYER: "PAYMENT_CONFIRMED_BY_BUYER",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    CANCELLED: "CANCELLED",
    CANCELLED_REVERSED: "CANCELLED_REVERSED",
};

// --------- Helpers ----------

/** Helper to fetch a user and throw a standard error if not found.*/
async function checkUser(userId) {
    // Fetches user role for authorization checks and validates existence.
    const user = await User.findById(userId).select('role').lean(); 
    if (!user) {
        throw new TradeError("User not found.", 404);
    }
    return user;
}

/** Helper to log trade events. (This is now redundant but kept for initial trade creation)*/
function safeLog(trade, logEntry) {
    console.log(`[TRADE_LOG] Ref: ${trade.reference} - ${logEntry.message}`);
}

/** Helper to resolve the provider-specific Wallet ID for a user and currency. */ 
async function resolveUserWalletId(userId, currency) {
    // 1. Keep the ObjectId explicit cast for stability
    const userObjectId = new mongoose.Types.ObjectId(userId); 
    
    // 2. Normalize the currency string to match the Mongoose Model enum (e.g., "cNGN" or "USDC")
    const currencyValue = currency.toLowerCase() === 'cngn' ? 'cNGN' : currency.toUpperCase();
    
    const wallet = await Wallet.findOne({
        user_id: userObjectId, 
        currency: currencyValue, 
        walletType: "USER",        // 3. Ensure it's a user wallet
        provider: "BLOCKRADAR",    // 3. Ensure it's the Blockrader provider
        status: "ACTIVE",          // 3. Ensure the wallet is active
    }).lean();

    if (!wallet || !wallet.externalWalletId) {
        throw new TradeError(`Wallet not found or missing provider ID for user ${userId} and currency ${currency}.`, 404);
    }
    return wallet.externalWalletId;
}

/* Helper to resolve the external crypto address for a user and currency. */
async function resolveUserCryptoAddress(userId, currency) {
    // 1. Keep the ObjectId explicit cast for stability
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // 2. Normalize the currency string to match the Mongoose Model enum
    const currencyValue = currency.toLowerCase() === 'cngn' ? 'cNGN' : currency.toUpperCase();

    const wallet = await Wallet.findOne({
        user_id: userObjectId, 
        currency: currencyValue,
        walletType: "USER",        // 3. Ensure it's a user wallet
        provider: "BLOCKRADAR",    // 3. Ensure it's the Blockrader provider
        status: "ACTIVE",          // 3. Ensure the wallet is active
    }).lean();

    if (!wallet || !wallet.walletAddress) {
        throw new TradeError(`Missing destination crypto address for user ${userId} and target currency ${currency}.`, 400);
    }
    return wallet.walletAddress;
}

// NEW helper to calculate fees and gross escrow amount
// async function calculatePercentageFee(currencyTarget, amountTarget) {
//   const feeConfig = await FeeConfig.findOne({ currency: currencyTarget }).lean();

//   if (!feeConfig) {
//     throw new TradeError(`Fee config missing for ${currencyTarget}`, 500);
//   }

//   const feePercentage = Number(feeConfig.feePercentage);
//   const feeAmount = Number(((amountTarget * feePercentage) / 100).toFixed(6));
//   const buyerReceives = Number((amountTarget - feeAmount).toFixed(6));

//   if (buyerReceives <= 0) {
//     throw new TradeError("Fee exceeds trade amount", 400);
//   }

//   return {
//     feePercentage,
//     feeAmount,
//     buyerReceives
//   };
// }

// --------- Service functions ----------
module.exports = {
    
async getAllUserWalletBalances(userId) {
    const cacheKey = `balances:${userId}`;

    // 1. Try to load from cache
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    // 2. Load wallets from DB
    const wallets = await Wallet.find({
        user_id: userId,
        provider: "BLOCKRADAR",
        status: "ACTIVE",
        walletType: "USER"
    }).lean();

    if (!wallets || wallets.length === 0) {
        await setCache(cacheKey, [], CACHE_TTL);
        return [];
    }

    const results = [];

    for (const w of wallets) {
        logger.info(`Fetching balance for wallet: ${w.currency} / ID: ${w.externalWalletId}`); 
        try {
         const bal = await blockrader.getWalletBalance(w.externalWalletId, w.currency);
         logger.info(`Successfully fetched balance for ${w.currency}.`);
            results.push({
                currency: w.currency,
                walletAddress: w.walletAddress,
                externalWalletId: w.externalWalletId,
                balance: {
                    available: bal?.available ?? 0,
                    locked: bal?.locked ?? 0,
                    total: bal?.total ?? 0,
                }
            });
        } catch (err) {
            logger.error(`❌ Blockrader balance fetch failed for ${w.currency}: ${err.message}`);
            results.push({
                currency: w.currency,
                error: true,
                balance: { available: 0, locked: 0, total: 0 }
            });
        }
    }
    // 3. Save into Redis cache
    await setCache(cacheKey, results, CACHE_TTL);
    return results;
},

// 
async initiateTrade(buyerId, merchantAd, data, ip = null) {
  await checkUser(buyerId);
  await checkUser(merchantAd.userId);

  // 1️⃣ Validate time limit
  if (!data.timeLimit || isNaN(data.timeLimit)) {
    throw new Error("Merchant ad timeLimit is missing or invalid");
  }

  const expiresAt = new Date(Date.now() + Number(data.timeLimit) * 60 * 1000);

  // ---------- LIMIT & UNIT VALIDATION ----------
  const fiatAmount = Number(data.amountSource);

  if (fiatAmount < merchantAd.minLimit) {
    throw new TradeError("Amount below minimum trade limit");
  }

  if (fiatAmount > merchantAd.maxLimit) {
    throw new TradeError("Amount exceeds maximum trade limit");
  }

  // 2️⃣ Convert fiat → crypto (listing price)
  const cryptoAmount = fiatAmount / merchantAd.price;

  // 3️⃣ Liquidity check
  if (cryptoAmount > merchantAd.availableAmount) {
    throw new TradeError("Insufficient ad liquidity");
  }

  // ==============================
  // 🔥 CRYPTO-BASED PLATFORM FEE
  // ==============================
  const platformFeeCrypto = merchantAd.platformFeeCrypto;

  if (!platformFeeCrypto || platformFeeCrypto <= 0) {
    throw new TradeError("Platform fee not configured for this ad");
  }

  if (platformFeeCrypto >= cryptoAmount) {
    throw new TradeError("Platform fee exceeds or equals trade amount");
  }

  const netCryptoAmount = cryptoAmount - platformFeeCrypto;

  // 5️⃣ Reference
  const reference = data.reference || `P2P-${Date.now()}`;

  // ---------- TRANSACTION ----------
  const session = await mongoose.startSession();
  session.startTransaction();

  let trade;

  try {
    // 6️⃣ Atomic liquidity deduction
    const adUpdateResult = await MerchantAd.findOneAndUpdate(
      {
        _id: merchantAd._id,
        availableAmount: { $gte: cryptoAmount }
      },
      {
        $inc: { availableAmount: -cryptoAmount }
      },
      { new: true, session }
    );

    if (!adUpdateResult) {
      throw new Error("Insufficient liquidity or merchant ad not found.");
    }

    // 7️⃣ Create trade (LOCK VALUES)
    const tradeDoc = await P2PTrade.create(
      [{
        reference,
        userId: buyerId,
        merchantId: merchantAd.userId,
        merchantAdId: merchantAd._id,

        side: merchantAd.type === "SELL" ? "BUY" : "SELL",

        amountFiat: fiatAmount,

        amountCrypto: cryptoAmount,          // 🔒 GROSS
        platformFeeCrypto,                  // 🔒 PLATFORM FEE
        netCryptoAmount,                    // 🔒 NET TO RECEIVER

        marketRate: merchantAd.rawPrice,
        listingRate: merchantAd.price,

        currencySource: data.currencySource,
        currencyTarget: data.currencyTarget,

        provider: "BLOCKRADAR",
        status: ALLOWED_STATES.INIT,
        expiresAt
      }],
      { session }
    );

    trade = tradeDoc[0];

    // 8️⃣ Initial audit log
    safeLog(trade, {
      message: "Trade created. Awaiting buyer payment.",
      actor: buyerId,
      role: "buyer",
      ip,
      time: new Date()
    });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  return await P2PTrade.findById(trade._id).lean();
},

   async confirmBuyerPayment(reference, buyerId, ip = null) {
  if (!reference) throw new TradeError("Reference required");

  const trade = await P2PTrade.findOne({ reference });
  if (!trade) throw new TradeError("Trade not found", 404);

  // Only buyer can confirm payment
  if (trade.userId.toString() !== buyerId.toString()) {
    throw new TradeError("Only the buyer can confirm payment", 403);
  }

  // Status guard
  if (trade.status !== ALLOWED_STATES.INIT) {
    throw new TradeError(
      `Cannot confirm payment in status: ${trade.status}`,
      409
    );
  }

  /**
   * 🔑 CRITICAL FIX
   * Determine who ACTUALLY owns the crypto being escrowed
   *
   * BUY  → Merchant is selling crypto → Merchant escrows
   * SELL → User is selling crypto     → User escrows
   */
  const escrowSourceUserId =
    trade.side === "BUY" ? trade.merchantId : trade.userId;

  const sourceWalletId = await resolveUserWalletId(
    escrowSourceUserId,
    trade.currencyTarget
  );

  // Escrow FULL GROSS amount (fees are handled at settlement)
  const escrowAmount = trade.amountCrypto;

  let escrowTxId = null;

  try {
    // =========================
    // 1️⃣ EXTERNAL ESCROW
    // =========================
 const transferResult = await blockrader.withdrawExternal(
  sourceWalletId,                         // 1. sourceAddressId
  blockrader.ESCROW_DESTINATION_ADDRESS,  // 2. toCryptoAddress (The 0x... address)
  escrowAmount,                           // 3. amount
  trade.currencyTarget,                   // 4. currency (e.g., "USDC")
  `${trade.reference}-ESCROW`             // 5. idempotencyKey
);

    if (!transferResult) {
      throw new TradeError("Escrow transfer failed at provider");
    }

    escrowTxId =
      transferResult?.data?.id ||
      transferResult?.txId ||
      transferResult?.id ||
      "n/a";

    // =========================
    // 2️⃣ ATOMIC DB UPDATE
    // =========================
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const updatedTrade = await updateTradeStatusAndLogSafe(
        trade._id,
        ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER,
        {
          message: `Buyer confirmed payment. Crypto escrowed (tx: ${escrowTxId}).`,
          actor: buyerId,
          role: "buyer",
          ip
        },
        trade.status,
        session
      );

      await session.commitTransaction();

      // Optional cache invalidation
      await redisClient.del(`balances:${escrowSourceUserId}`);

      return updatedTrade;
    } catch (dbError) {
      await session.abortTransaction();

      // 🔥 IMPORTANT: Provider succeeded but DB failed
      console.error(
        `CRITICAL: Escrow sent but DB update failed. EscrowTx=${escrowTxId}, Trade=${trade.reference}`
      );

      throw new TradeError(
        "Payment confirmed but database update failed. Manual reconciliation required.",
        500
      );
    } finally {
      session.endSession();
    }
  } catch (error) {
    // =========================
    // 3️⃣ FAIL-SAFE LOGGING
    // =========================
    await updateTradeStatusAndLogSafe(
      trade._id,
      ALLOWED_STATES.FAILED,
      {
        message: `confirmBuyerPayment failed: ${error.message}`,
        role: "system",
        ip
      }
    );

    throw error;
  }
},

    async initiateMerchantPaymentConfirmation(reference, merchantId, ip = null) {
        if (!reference) throw new TradeError("Reference required");
        let trade = await P2PTrade.findOne({ reference });
        if (!trade) throw new TradeError("Trade not found", 404);

        // --- GUARDS ---
        if (trade.merchantId.toString() !== merchantId.toString()) {
            throw new TradeError("Unauthorized: Only the merchant can initiate confirmation.", 403);
        }
        
        const expectedStatus = ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER;

        if (trade.status !== expectedStatus) {
            throw new TradeError(`Cannot initiate confirmation. Trade is in status: ${trade.status}. Expected status: ${expectedStatus}.`, 409);
        }
        // --- END GUARDS ---
        
        const merchantUser = await User.findById(merchantId).select('email').lean();
        if (!merchantUser) {
            throw new TradeError("Merchant user not found.", 404);
        }

        await generateAndSendOtp(merchantId, 'P2P_SETTLEMENT', merchantUser.email); 

        return { message: "Verification code sent to merchant's email. Awaiting OTP confirmation." };
    },

   async confirmMerchantPayment(reference, merchantId, otpCode, ip = null) {
    if (!reference || !otpCode) throw new TradeError("Reference and OTP code required");

    const trade = await P2PTrade.findOne({ reference });
    if (!trade) throw new TradeError("Trade not found", 404);

    // --- GUARDS ---
    if (trade.merchantId.toString() !== merchantId.toString()) {
        throw new TradeError("Unauthorized: Only the merchant can confirm payment.", 403);
    }

    const expectedStatus = ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER;
    if (trade.status !== expectedStatus) {
        throw new TradeError(
            `Cannot confirm/settle. Trade is in status: ${trade.status}. Expected status: ${expectedStatus}.`,
            409
        );
    }
    // --- END GUARDS ---

    // 🔑 OTP Verification
    const isVerified = await verifyOtp(merchantId, otpCode, 'P2P_SETTLEMENT');
    if (!isVerified) throw new TradeError("Invalid or expired OTP.", 401);

    // Determine recipient based on trade side
    const recipientAddress =
        trade.side === 'BUY'
            ? await resolveUserCryptoAddress(trade.userId, trade.currencyTarget)      // Buyer receives crypto
            : await resolveUserCryptoAddress(trade.merchantId, trade.currencyTarget); // Merchant receives crypto

    try {
        // 1️⃣ External settlement: Master Wallet -> Recipient (net amount only)
     const transferResult = await blockrader.transferFunds(
    blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Source (Master)
    null,                                     // Destination ID (Not used for Master flows)
    trade.netCryptoAmount,                    // Amount
    trade.currencyTarget,                     // Currency (e.g., USDC)
    recipientAddress,                         // The 0x... address of the recipient
    `${trade.reference}-SETTLEMENT`           // Reference
);

        if (!transferResult || !transferResult.data?.id) {
            const errorMessage = `Failed to release escrowed asset. Provider response: ${JSON.stringify(transferResult)}`;
            console.error(errorMessage);
            throw new TradeError("Settlement transfer initiation failed at provider.");
        }

        const txId = transferResult.data.id || transferResult.txId || "n/a";

        // 2️⃣ Atomic DB update
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const settlementMessage = `Settlement initiated (tx:${txId}). Gross Escrow: ${trade.amountCrypto}. Net to recipient: ${trade.netCryptoAmount}. Platform Fee Retained: ${trade.platformFeeCrypto}. Awaiting webhook confirmation.`;

            const updatedTrade = await updateTradeStatusAndLogSafe(
                trade._id,
                ALLOWED_STATES.COMPLETED,
                {
                    message: settlementMessage,
                    actor: merchantId,
                    role: "merchant",
                    ip,
                },
                expectedStatus,
                session
            );

            await session.commitTransaction();

            // Invalidate cache
            if (trade.side === 'BUY') {
                await redisClient.del(`balances:${trade.userId}`);
            } else {
                await redisClient.del(`balances:${trade.merchantId}`);
            }

            return updatedTrade;
        } catch (dbError) {
            await session.abortTransaction();
            console.error("CRITICAL: Settlement DB update failed after external transfer.", dbError);
            throw new TradeError("Database update failed after settlement initiation.");
        } finally {
            session.endSession();
        }
    } catch (error) {
        // Fail-safe logging
        await updateTradeStatusAndLogSafe(
            trade._id,
            ALLOWED_STATES.FAILED,
            {
                message: `Settlement failed: ${String(error?.message || error)}`,
                actor: null,
                role: 'system',
                ip,
            }
        );
        throw error;
    }
},

async cancelTrade(reference, userId, ip = null) {
    if (!reference) throw new TradeError("Reference required");

    const trade = await P2PTrade.findOne({ reference });
    if (!trade) throw new TradeError("Trade not found", 404);

    const user = await checkUser(userId);
    const isAdmin = user.role === "admin";
    const isBuyer = trade.userId.toString() === userId.toString();
    const isMerchant = trade.merchantId.toString() === userId.toString();

    // ----------------------------
    // 1️⃣ Authorization check
    // Buyer or Admin can cancel anytime.
    // Merchant can only cancel after trade expires.
    // ----------------------------
    if (isMerchant && !isAdmin) {
        const isExpired = new Date() > new Date(trade.expiresAt);
        if (!isExpired) {
            throw new TradeError("Merchant cannot cancel while trade is active. Wait for expiration or open a dispute.", 403);
        }
    } else if (!isBuyer && !isAdmin) {
        throw new TradeError("Not authorized to cancel this trade", 403);
    }

    // ----------------------------
    // 2️⃣ Terminal states
    // ----------------------------
    const terminalStates = [
        ALLOWED_STATES.COMPLETED,
        ALLOWED_STATES.CANCELLED,
        ALLOWED_STATES.CANCELLED_REVERSED,
        ALLOWED_STATES.FAILED
    ];
    if (terminalStates.includes(trade.status)) {
        throw new TradeError(`Trade is already in a final state: ${trade.status}`, 409);
    }

    const requiresEscrowReversal = trade.status === ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER;
    let reversalTxId = null;

    try {
        // ----------------------------
        // 3️⃣ Handle Escrow Reversal
        // - Scenario B (User sells)
        // - Full gross amount
        // ----------------------------
        if (requiresEscrowReversal) {
            const refundRecipientId = trade.side === 'BUY' ? trade.merchantId : trade.userId;
            const sourceCurrency = trade.currencyTarget;

            // Full gross escrow includes platform fee
            const refundAmount = trade.amountCrypto;

            const destinationWalletId = await resolveUserWalletId(refundRecipientId, sourceCurrency);
            const destinationAddress = await resolveUserCryptoAddress(refundRecipientId, sourceCurrency);

            const transferResult = await blockrader.transferFunds(
                blockrader.BLOCKRADER_MASTER_WALLET_UUID,
                destinationWalletId,
                refundAmount,
                sourceCurrency,
                destinationAddress,
                `${trade.reference}-REVERSAL`
            );

            if (!transferResult) throw new TradeError("Escrow reversal failed at provider");
            reversalTxId = transferResult?.data?.id || transferResult?.txId || "n/a";
        }

        // ----------------------------
        // 4️⃣ Atomic DB operations
        // ----------------------------
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // Restore merchant ad liquidity
            await MerchantAd.findByIdAndUpdate(
                trade.merchantAdId,
                { $inc: { availableAmount: trade.amountCrypto } },
                { session }
            );

            const newStatus = requiresEscrowReversal ? ALLOWED_STATES.CANCELLED_REVERSED : ALLOWED_STATES.CANCELLED;

            const updatedTrade = await updateTradeStatusAndLogSafe(
                trade._id,
                newStatus,
                {
                    message: `Cancelled by ${isAdmin ? 'Admin' : isBuyer ? 'Buyer' : 'Merchant'}. ${reversalTxId ? `Escrow reversed (tx: ${reversalTxId})` : ''}`,
                    actor: userId,
                    role: isAdmin ? "admin" : isBuyer ? "buyer" : "merchant",
                    ip
                },
                trade.status,
                session
            );

            await session.commitTransaction();

            // Invalidate caches for both buyer and merchant
            await redisClient.del(`balances:${trade.merchantId}`);
            await redisClient.del(`balances:${trade.userId}`);

            return updatedTrade;
        } catch (dbError) {
            await session.abortTransaction();
            console.error(`DATABASE CRASH after reversal sent: ${reversalTxId}. Manual sync may be required for trade ${trade.reference}`);
            throw dbError;
        } finally {
            session.endSession();
        }
    } catch (error) {
        // ----------------------------
        // 5️⃣ Fail-safe
        // ----------------------------
        await updateTradeStatusAndLogSafe(trade._id, ALLOWED_STATES.FAILED, {
            message: `Cancellation failed: ${error.message}`,
            role: "system",
            actor: null,
            ip
        });
        throw error;
    }
},
    async getTradeByReference(reference) {
        return await P2PTrade.findOne({ reference }).populate("userId", "firstName email role").populate("merchantId", "firstName email role").lean();
    },

    async listTrades(filter = {}, page = 1, pageSize = 20) {
        const q = {};
        if (filter.status) q.status = filter.status;
        if (filter.userId) q.userId = filter.userId;
        if (filter.merchantId) q.merchantId = filter.merchantId;

        const [trades, total] = await Promise.all([
            P2PTrade.find(q).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
            P2PTrade.countDocuments(q)
        ]);

        return { trades, total, page, pageSize };
    }
};  