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

/**
 * Helper to fetch a user and throw a standard error if not found.
 */
async function checkUser(userId) {
    // Fetches user role for authorization checks and validates existence.
    const user = await User.findById(userId).select('role').lean(); 
    if (!user) {
        throw new TradeError("User not found.", 404);
    }
    return user;
}

/**
 * Helper to log trade events. (This is now redundant but kept for initial trade creation)
 */
function safeLog(trade, logEntry) {
    console.log(`[TRADE_LOG] Ref: ${trade.reference} - ${logEntry.message}`);
}
/**
 * Helper to resolve the provider-specific Wallet ID for a user and currency.
 */
// async function resolveUserWalletId(userId, currency) {
//     const wallet = await Wallet.findOne({ user_id: userId, currency: currency.toUpperCase() }).lean();
    
//     if (!wallet || !wallet.externalWalletId) {
//         throw new TradeError(`Wallet not found or missing provider ID for user ${userId} and currency ${currency}.`, 404);
//     }
//     return wallet.externalWalletId;
// }



// USED FOR CNGN TESTING 
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
/**
 * Helper to resolve the external crypto address for a user and currency.
 */
// async function resolveUserCryptoAddress(userId, currency) {
//     const wallet = await Wallet.findOne({ user_id: userId, currency: currency.toUpperCase() }).lean();
    
//     if (!wallet || !wallet.walletAddress) {
//         throw new TradeError(`Missing destination crypto address for user ${userId} and target currency ${currency}.`, 400);
//     }
//     return wallet.walletAddress;
// }

// USED FOR CNGN TESTING
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
// ----------------------------------------------------

/**
 * ❌ REMOVED: updateTradeStatusAndLog is replaced by updateTradeStatusAndLogSafe from tradeUpdater.js
 */
// async function updateTradeStatusAndLog(...) { /* ... */ }


/**
 * @name performEscrow
 * @description Isolates the external API call and handles immediate failure.
 * @throws {TradeError} If the provider API initiation fails.
 */
async function performEscrow(trade, sourceWalletId, masterCryptoAddress, actorId, ip, role) {
    const transferResult = await blockrader.transferFunds(
        sourceWalletId,
        blockrader.BLOCKRADER_MASTER_WALLET_UUID,
        trade.amountTarget,
        trade.currencyTarget,
        masterCryptoAddress
    );

    // CRITICAL CHECK
    if (!transferResult || !transferResult.data || !transferResult.data.id) {
        const errorMessage = `Failed to escrow funds. Provider response: ${JSON.stringify(transferResult)}`;
        console.error(errorMessage);
        
        // 🚀 REPLACED: updateTradeStatusAndLog -> updateTradeStatusAndLogSafe
        await updateTradeStatusAndLogSafe(
            trade._id,
            ALLOWED_STATES.FAILED,
            { 
                message: `Escrow attempt failed at provider API: ${errorMessage}`, 
                actor: null, // 'system' actor is now null (ObjectId)
                role: 'system', 
                ip 
            }
        );
        throw new TradeError("Failed to initiate escrow transfer: Provider API initiation failed.");
    }

    return transferResult;
}


// --------- Service functions ----------
module.exports = {
    async initiateTrade(buyerId, merchantId, data, ip = null) {
        await checkUser(buyerId);
        await checkUser(merchantId);

        // 1. Create initial DB record inside a transaction
        const session = await mongoose.startSession();
        session.startTransaction();
        let trade;

        try {
            const tradeDoc = await P2PTrade.create(
                [
                    {
                        reference: `${data.reference || `REF_${Date.now()}`}`,
                        userId: buyerId,
                        merchantId,
                        amountSource: data.amountSource,
                        amountTarget: data.amountTarget,
                        currencySource: data.currencySource,
                        currencyTarget: data.currencyTarget,
                        rate: data.rate || 1,
                        provider: "BLOCKRADER",
                        status: ALLOWED_STATES.INIT, 
                        logs: []
                    }
                ],
                { session }
            );

            trade = tradeDoc[0];
            // NOTE: Initial log still uses old helper as trade object doesn't have _id yet
            safeLog(trade, { message: "Trade created. Awaiting buyer payment.", actor: buyerId, role: "buyer", ip, time: new Date() });
            
            await trade.save({ session });
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

        // --- GUARDS ---
        if (trade.userId.toString() !== buyerId.toString()) {
            throw new TradeError("Unauthorized: Only the buyer can confirm payment.", 403);
        }
        if (trade.status !== ALLOWED_STATES.INIT) {
            throw new TradeError(`Cannot confirm payment. Trade is currently in status: ${trade.status}.`, 409);
        }
        // --- END GUARDS ---
        
        const merchantWalletId = await resolveUserWalletId(trade.merchantId, trade.currencyTarget);
        const masterWalletCryptoAddress = blockrader.ESCROW_DESTINATION_ADDRESS;

        if (!masterWalletCryptoAddress) {
            throw new TradeError("FATAL: MASTER_WALLET_ADDRESS is missing in environment variables for escrow.");
        }

        const transferResult = await blockrader.transferFunds(
            merchantWalletId,
            blockrader.BLOCKRADER_MASTER_WALLET_UUID,
            trade.amountTarget,
            trade.currencyTarget,
            masterWalletCryptoAddress
        );

        if (!transferResult || !transferResult.data || !transferResult.data.id) {
            const errorMessage = `Failed to escrow merchant funds. Provider response: ${JSON.stringify(transferResult)}`;
            console.error(errorMessage);
            throw new TradeError("Failed to initiate merchant escrow: Provider API initiation failed.");
        }

        const txId = transferResult.data.id || transferResult.txId || "n/a";

        // 🚀 REPLACED: updateTradeStatusAndLog -> updateTradeStatusAndLogSafe
        const updatedTrade = await updateTradeStatusAndLogSafe(
            trade._id,
            ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER,
            {
                message: `Buyer confirmed payment; merchant asset escrow initiated (tx:${txId}). Awaiting provider confirmation.`,
                actor: buyerId,
                role: "buyer",
                ip,
            },
            ALLOWED_STATES.INIT // Ensure we are only updating from INIT state
        );

        return updatedTrade;
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

        let trade = await P2PTrade.findOne({ reference });
        if (!trade) throw new TradeError("Trade not found", 404);

        // --- GUARDS ---
        if (trade.merchantId.toString() !== merchantId.toString()) {
            throw new TradeError("Unauthorized: Only the merchant can confirm payment.", 403);
        }

        const expectedStatus = ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER; 

        if (trade.status !== expectedStatus) {
            throw new TradeError(`Cannot confirm/settle. Trade is in status: ${trade.status}. Expected status: ${expectedStatus}.`, 409);
        }
        // --- END GUARDS ---
        
        // 🔑 OTP Verification
        const isVerified = await verifyOtp(merchantId, otpCode, 'P2P_SETTLEMENT');
        
        if (!isVerified) {
            throw new TradeError("Invalid or expired OTP.", 401); 
        }
        // -----------------------------

        let transferResult = null;

        try {
            // 1. Perform external settlement (Master -> Buyer)
            const buyerDestinationId = await resolveUserWalletId(trade.userId, trade.currencyTarget);
            const buyerCryptoAddress = await resolveUserCryptoAddress(trade.userId, trade.currencyTarget);

            transferResult = await blockrader.transferFunds(
                blockrader.BLOCKRADER_MASTER_WALLET_UUID,
                buyerDestinationId,
                trade.amountTarget,
                trade.currencyTarget,
                buyerCryptoAddress
            );

            // 2. Resolve Transaction ID robustly
            const txId = transferResult?.data?.id || transferResult?.txId || transferResult?.id || "n/a";
            
            // 3. CRITICAL CHECK
            if (!transferResult) {
                const errorMessage = `Failed to release escrowed asset to recipient. Provider response: ${JSON.stringify(transferResult)}`;
                console.error(errorMessage);
                throw new TradeError("Settlement transfer initiation failed at provider, missing required data.");
            }
            
            // 4. Start Mongoose Session for Atomic DB Update
            const session = await mongoose.startSession();
            session.startTransaction();
            let updatedTrade;

            try {
                // 🚀 REPLACED: updateTradeStatusAndLog -> updateTradeStatusAndLogSafe
                updatedTrade = await updateTradeStatusAndLogSafe(
                    trade._id,
                    ALLOWED_STATES.COMPLETED,
                    {
                        message: `External settlement initiated (tx:${txId}). Awaiting webhook confirmation.`,
                        actor: merchantId,
                        role: "merchant",
                        ip,
                    },
                    expectedStatus,
                    session // Session is passed as the last argument
                );
                
                await session.commitTransaction();

            } catch (dbError) {
                await session.abortTransaction();
                console.error("CRITICAL: Settlement DB update failed after successful external transfer.", dbError);
                throw new TradeError("Database update failed after successful external transfer initiation.");
            } finally {
                session.endSession();
            }

            return updatedTrade;

        } catch (error) {
            if (trade) {
                // 🚀 REPLACED: updateTradeStatusAndLog -> updateTradeStatusAndLogSafe
                await updateTradeStatusAndLogSafe(
                    trade._id,
                    ALLOWED_STATES.FAILED,
                    {
                        // Sanitized error message
                        message: `Settlement failed during initiation: ${String(error?.message || error).trim()}`,
                        actor: null, // 'system' actor is now null (ObjectId)
                        role: 'system',
                        ip,
                    }
                );
            }
            throw error;
        }
    },

    async cancelTrade(reference, userId, ip = null) {
        if (!reference) throw new TradeError("Reference required");
        let trade = await P2PTrade.findOne({ reference });
        if (!trade) throw new TradeError("Trade not found", 404);

        const user = await checkUser(userId);
        const isAdminUser = user.role === "admin";

        if (trade.userId.toString() !== userId.toString() && !isAdminUser) {
            throw new TradeError("Not authorized to cancel this trade", 403);
        }

        if ([ALLOWED_STATES.COMPLETED, ALLOWED_STATES.CANCELLED_REVERSED, ALLOWED_STATES.FAILED].includes(trade.status)) {
            throw new TradeError(`Cannot cancel a trade in status: ${trade.status}`, 409);
        }

        let reversalType = null;
        let sourceCurrency = null;
        let sourceDestinationId = null;
        let sourceCryptoAddress = null;
        let sourceAmount = null;

        try {
            // 1. Determine reversal details
            if (trade.status === ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER) {
                sourceCurrency = trade.currencyTarget;
                sourceAmount = trade.amountTarget;
                sourceDestinationId = await resolveUserWalletId(trade.merchantId, sourceCurrency);
                sourceCryptoAddress = await resolveUserCryptoAddress(trade.merchantId, sourceCurrency);
                reversalType = 'Escrow (Merchant)';
            }
            
            // 2. Perform external reversal
            if (reversalType) {
                const transferResult = await blockrader.transferFunds(
                    blockrader.BLOCKRADER_MASTER_WALLET_UUID, 
                    sourceDestinationId, 
                    sourceAmount,
                    sourceCurrency,
                    sourceCryptoAddress 
                );

                const txId = transferResult?.data?.id || transferResult?.txId || transferResult?.id || "n/a";

                if (!transferResult) {
                    const errorMessage = `${reversalType} reversal failed at provider. Provider response: ${JSON.stringify(transferResult)}`;
                    console.error(errorMessage);
                    throw new TradeError(`Escrow reversal failed at provider for ${reversalType}, missing required data.`);
                }

                // 3. Start Mongoose Session for Atomic DB Update
                const session = await mongoose.startSession();
                session.startTransaction();
                let updatedTrade;

                try {
                    // 🚀 REPLACED: updateTradeStatusAndLog -> updateTradeStatusAndLogSafe
                    updatedTrade = await updateTradeStatusAndLogSafe(
                        trade._id,
                        ALLOWED_STATES.CANCELLED_REVERSED,
                        {
                            message: `${reversalType} reversed (tx:${txId}).`,
                            actor: userId,
                            role: isAdminUser ? 'admin' : 'requester',
                            ip,
                        },
                        trade.status, 
                        session 
                    );
                    
                    await session.commitTransaction();
                    return updatedTrade;
                } catch (dbError) {
                    await session.abortTransaction();
                    console.error("CRITICAL: Reversal DB update failed after successful external reversal.", dbError);
                    throw new TradeError("Database update failed after successful external reversal initiation.");
                } finally {
                    session.endSession();
                }
            }

            // Fallthrough: Generic cancel if no reversal was needed (only if status is INIT)
            // 🚀 REPLACED: updateTradeStatusAndLog -> updateTradeStatusAndLogSafe
            return await updateTradeStatusAndLogSafe(
                trade._id,
                ALLOWED_STATES.CANCELLED,
                {
                    message: "Trade cancelled (no reversal needed/possible).",
                    actor: userId,
                    role: isAdminUser ? 'admin' : 'requester',
                    ip,
                },
                trade.status
            );

        } catch (error) {
            // If reversal fails, we mark the trade as FAILED and log the error.
            // 🚀 REPLACED: updateTradeStatusAndLog -> updateTradeStatusAndLogSafe
            await updateTradeStatusAndLogSafe(
                trade._id,
                ALLOWED_STATES.FAILED,
                {
                    message: `Cancellation/Reversal failed: ${String(error?.message || error).trim()}`,
                    actor: null, // 'system' actor is now null (ObjectId)
                    role: 'system',
                    ip,
                }
            );
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