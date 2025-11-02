// // ANOTHER ANGLE lates
// const mongoose = require("mongoose");
// const P2PTrade = require("../models/p2pModel");
// const User = require("../models/userModel");
// const Wallet = require("../models/walletModel");
// const blockrader = require("./providers/blockrader"); 

// const SUPPORTED_ON_PLATFORM = ["NGN", "USD"]; // currencies we hold internally for buyer payout
// const SUPPORTED_SOURCE_CURRENCIES = ["NGN", "USD", "GHS", "XAF", "XOF", "RMB"]; // currencies buyer can pay with
// // --------- Helpers ----------
// /**
//  * @name resolveUserWalletId
//  * @description Looks up the Blockrader Address ID (externalWalletId - the UUID) 
//  * for a given user and currency.
//  * @param {String} userId - MongoDB ID of the user (Buyer or Merchant)
//  * @param {String} currency - The currency (e.g., 'USD')
//  * @returns {String | null} The Blockrader Address ID (externalWalletId) or null.
//  */
// async function resolveUserWalletId(userId, currency) {
//     const userWallet = await Wallet.findOne({ user_id: userId, currency: currency }).lean();
//     
//     if (!userWallet || !userWallet.externalWalletId) {
//         // FIX: Use template literals (backticks)
//         console.error(`Wallet not found for user ${userId} and currency ${currency}, or externalWalletId (UUID) is missing.`);
//         return null; 
//     }
//     
//     // externalWalletId is the Blockrader Address ID (UUID)
//     return userWallet.externalWalletId; 
// }

// /**
//  * @name resolveUserCryptoAddress
//  * @description Looks up the crypto address (account_number - the 0x...) 
//  * for a given user and currency. This address is required by Blockrader API 
//  * for the 'address' field during transfers.
//  * @param {String} userId - MongoDB ID of the user
//  * @param {String} currency - The currency (e.g., 'USD')
//  * @returns {String | null} The Wallet's crypto address (account_number) or null.
//  */
// async function resolveUserCryptoAddress(userId, currency) {
//     const userWallet = await Wallet.findOne({ user_id: userId, currency: currency }).lean();

//     if (!userWallet || !userWallet.accountNumber) {
//         // FIX: Use template literals (backticks)
//         console.error(`Wallet not found for user ${userId} and currency ${currency}, or accountNumber (0x address) is missing.`);
//         return null; 
//     }

//     // accountNumber is the Crypto Address (0x...)
//     return userWallet.accountNumber; 
// }


// async function checkUserExists(userId) {
//   const user = await User.findById(userId).lean();
//   if (!user) throw new Error("User not found");
//   return user;
// }

// async function isAdmin(userId) {
//   const u = await User.findById(userId).lean();
//   return u && u.role === "admin";
// }

// function isInternalTrade(trade) {
//   // "Internal" means buyer is using NGN or USD on-platform (we have internal wallets)
//   return SUPPORTED_ON_PLATFORM.includes(trade.currencySource);
// }

// function safeLog(trade, entry) {
//   // ensure logs array exists
//   trade.logs = trade.logs || [];
//   trade.logs.push({
//     ...entry,
//     time: entry.time || new Date()
//   });
// }

// // Basic state machine allowed transitions (enforced where needed)
// const ALLOWED_STATES = {
//   INIT: "PENDING_PAYMENT",
//   ESCROWED_WAIT_MERCHANT: "ESCROWED_AWAITING_MERCHANT_TRANSFER",
//   PAYMENT_CONFIRMED_BY_BUYER: "PAYMENT_CONFIRMED_BY_BUYER",
//   COMPLETED: "COMPLETED",
//   FAILED: "FAILED",
//   CANCELLED: "CANCELLED",
//   CANCELLED_REVERSED: "CANCELLED_REVERSED",
// };

// // --------- Service functions ----------
// module.exports = {
//   /**
//    * initiateTrade
//    * - creates trade and, for internal trades, attempts to immediately escrow buyer funds
//    */
//   async initiateTrade(buyerId, merchantId, data, ip = null) {
//     // Basic validations...

//     // Create initial DB record inside a mongoose session so DB write is atomic.
//     const session = await mongoose.startSession();
//     session.startTransaction();
//     try {
//       const tradeDoc = await P2PTrade.create(
//         [
//           {
//             reference: data.reference || `REF_${Date.now()}`,
//             userId: buyerId,
//             merchantId,
//             amountSource: data.amountSource,
//             amountTarget: data.amountTarget,
//             currencySource: data.currencySource,
//             currencyTarget: data.currencyTarget,
//             rate: data.rate || 1,
//             provider: "BLOCKRADER",
//             status: ALLOWED_STATES.INIT,
//             logs: []
//           }
//         ],
//         { session }
//       );

//       const trade = tradeDoc[0];

//       safeLog(trade, { message: "Trade created", actor: buyerId, role: "buyer", ip, time: new Date() });

//       // If buyer is using an internal (supported) currency, immediately move buyer funds to company escrow.
//       if (isInternalTrade(trade)) {
//         // Resolve the buyer wallet UUID (Address ID) for the SOURCE
//         const buyerSourceId = await resolveUserWalletId(buyerId, trade.currencySource);
//         if (!buyerSourceId) {
//           throw new Error("Buyer does not have a wallet for currencySource");
//         }

//         // Destination for escrow is the Master Wallet. We pass the Master Wallet's 0x address.
//         const masterWalletCryptoAddress = blockrader.ESCROW_DESTINATION_ADDRESS;
//         if (!masterWalletCryptoAddress) {
//             throw new Error("FATAL: MASTER_WALLET_ADDRESS is missing in environment variables for escrow.");
//         }


//         // Perform the external provider call (escrow transfer).
//         // This is a Child -> Master transfer (Escrow)
//         const transferResult = await blockrader.transferFunds(
//           buyerSourceId, // Source: User Wallet UUID
//           blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Destination: Master Wallet UUID
//           trade.amountSource,
//           trade.currencySource,
//           masterWalletCryptoAddress // Pass the required Master Wallet 0x Address
//         );

//         // --- FIX 1 (InitiateTrade): Check for successful API response structure (data.id) ---
//         if (!transferResult || !transferResult.data || !transferResult.data.id) {
//             // FIX: Use template literals (backticks)
//             const errorMessage = `Failed to escrow buyer funds. Provider response: ${JSON.stringify(transferResult)}`;
//             console.error(errorMessage);
//             throw new Error("Failed to escrow buyer funds: Provider API initiation failed.");
//         }
//         // --- End Fix 1 ---
//         
//         const txId = transferResult.data.id || transferResult.txId || "n/a"; // Use the internal ID or a fallback

//         // update trade status + logs
//         trade.status = ALLOWED_STATES.ESCROWED_WAIT_MERCHANT;
//         safeLog(trade, {
//           // FIX: Use template literals (backticks)
//           message: `Buyer funds escrowed (${trade.amountSource} ${trade.currencySource}) tx:${txId}`,
//           actor: buyerId,
//           role: "buyer",
//           ip,
//           time: new Date()
//         });

//         // persist change
//         await trade.save({ session });
//       } else {
//         // External fiat: buyer will pay off-platform; we wait for buyer confirmation
//         safeLog(trade, { message: "External trade initiated (awaiting buyer payment)", actor: buyerId, role: "buyer", ip });
//         await trade.save({ session });
//       }

//       await session.commitTransaction();
//       session.endSession();

//       // return fresh trade from db (lean)
//       return await P2PTrade.findById(trade._id).lean();
//     } catch (err) {
//       await session.abortTransaction();
//       session.endSession();
//       // If we called an external transfer and it partially succeeded, consider implementing compensating logic here
//       throw err;
//     }
//   },

//   /**
//    * confirmBuyerPayment
//    * - Used when buyer paid off-platform (external fiat) and clicks "I've paid".
//    */
//   async confirmBuyerPayment(reference, buyerId, ip = null) {
//     if (!reference) throw new Error("reference required");
//     const trade = await P2PTrade.findOne({ reference });
//     if (!trade) throw new Error("Trade not found");

//     // Guard: cannot be used for internal trades
//     if (isInternalTrade(trade)) {
//       throw new Error("This flow is for external fiat payments only");
//     }

//     // Ensure correct actor and state...

//     // Now we need to escrow merchant's asset (target currency) into company escrow.
//     // Merchant must have an internal wallet for currencyTarget.
//     
//     // Get the merchant's wallet UUID (Address ID) for the SOURCE
//     const merchantWalletId = await resolveUserWalletId(trade.merchantId, trade.currencyTarget);
//     if (!merchantWalletId) {
//       throw new Error("Merchant does not have a wallet for the target currency (Address ID missing in DB)");
//     }

//     // Destination for escrow is the Master Wallet. We pass the Master Wallet's 0x address.
//     const masterWalletCryptoAddress = blockrader.ESCROW_DESTINATION_ADDRESS;
//     if (!masterWalletCryptoAddress) {
//         throw new Error("FATAL: MASTER_WALLET_ADDRESS is missing in environment variables for escrow.");
//     }
//     
//     // Call provider: move merchant asset -> company escrow (so buyer's external payment can be matched)
//     // This is a Child -> Master transfer (Escrow)
//     const transferResult = await blockrader.transferFunds(
//       merchantWalletId, // Source: Merchant Wallet UUID
//       blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Destination: Master Wallet UUID
//       trade.amountTarget,
//       trade.currencyTarget,
//       masterWalletCryptoAddress // Pass the required Master Wallet 0x Address
//     );

//     // --- FIX 1 (ConfirmBuyerPayment): Check for successful API response structure (data.id) ---
//     if (!transferResult || !transferResult.data || !transferResult.data.id) {
//       // FIX: Use template literals (backticks)
//       const errorMessage = `Failed to escrow merchant funds. Provider response: ${JSON.stringify(transferResult)}`;
//       console.error(errorMessage);
//       throw new Error("Failed to escrow merchant funds: Provider API initiation failed.");
//     }
//     // --- End Fix 1 ---
//     
//     const txId = transferResult.data.id || transferResult.txId || "n/a"; // Use the internal ID or a fallback

//     // Update DB...
//     trade.status = ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER;
//     safeLog(trade, {
//       // FIX: Use template literals (backticks)
//       message: `Buyer confirmed external payment; merchant asset escrowed (tx:${txId})`,
//       actor: buyerId,
//       role: "buyer",
//       ip,
//       time: new Date()
//     });
//     // Immediate save to prevent webhook race condition
//     await trade.save();

//     return trade.toObject();
//   },

//   /**
//    * confirmMerchantPayment
//    * - This triggers the release from escrow to the rightful recipient.
//    */
//   async confirmMerchantPayment(reference, merchantId, ip = null) {
//     if (!reference) throw new Error("reference required");
//     const trade = await P2PTrade.findOne({ reference });
//     if (!trade) throw new Error("Trade not found");

//     // Authorization...

//     const internal = isInternalTrade(trade);

//     // Validate expected status...

//     let transferResult = null;
//     let transferFailed = false;
//     let txId = "n/a";

//     // Settlement: release appropriate funds from escrow
//     if (internal) {
//       // Internal settlement logic remains largely the same...
//       // ...
//     } else {
//       // External: merchant's asset already escrowed (amountTarget) -> release it to buyer's wallet
//       
//       // 1. Get Buyer's UUID (Destination ID)
//       const buyerDestinationId = await resolveUserWalletId(trade.userId, trade.currencyTarget);
//       if (!buyerDestinationId) throw new Error("Buyer missing destination Address ID for target currency");

//       // 2. Get Buyer's Crypto Address (REQUIRED for Blockrader's 'address' field)
//       const buyerCryptoAddress = await resolveUserCryptoAddress(trade.userId, trade.currencyTarget);
//       if (!buyerCryptoAddress) throw new Error("Buyer missing destination crypto address for target currency");

//       // Pass the required 0x destination address. Source is the Master Wallet.
//       // This is a Master -> Child transfer (Settlement)
//       transferResult = await blockrader.transferFunds(
//         blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Source: Master Wallet UUID
//         buyerDestinationId, // Destination: Buyer UUID (used for routing)
//         trade.amountTarget,
//         trade.currencyTarget,
//         buyerCryptoAddress // Pass the required 0x destination address
//       );

//       // --- CRITICAL FIX 1: Check for successful API response structure (data.id) ---
//       // This is the check that was failing because the API returned PENDING status initially.
//       if (!transferResult || !transferResult.data || !transferResult.data.id) {
//         // FIX: Use template literals (backticks)
//         const errorMessage = `Failed to release escrowed asset to buyer (External settlement). Provider response: ${JSON.stringify(transferResult)}`;
//         console.error(errorMessage);
//         transferFailed = true;
//       }
//       // --- End Critical Fix 1 ---
//       
//       if (!transferFailed) {
//         txId = transferResult.data.id || transferResult.txId || "n/a";
//         safeLog(trade, {
//           // FIX: Use template literals (backticks)
//           message: `External settlement initiated to buyer (tx:${txId}). Awaiting webhook confirmation.`,
//           actor: merchantId,
//           role: "merchant",
//           ip,
//           time: new Date()
//         });
//       }
//     }
//     
//     // --- CRITICAL FIX 2: Immediate save to COMPLETED status to beat the webhook ---
//     // We mark the trade as COMPLETED immediately upon successful initiation of the transfer.
//     // The webhook only confirms the underlying transaction is final.
//     trade.status = ALLOWED_STATES.COMPLETED;
//     trade.updatedAt = new Date();
//     await trade.save();
//     // --- End Critical Fix 2 ---

//     if (transferFailed) {
//         // If the initiation failed (e.g., Blockrader API was down), we throw the error AFTER saving the COMPLETED status 
//         // in case the webhook still arrives and finds the trade completed.
//         // NOTE: The webhook handler now contains logic to revert the status if a 'transfer.failed' event is received.
//         throw new Error("Settlement transfer initiation failed at provider.");
//     }


//     return trade.toObject();
//   },

//   /**
//    * cancelTrade
//    * - Attempt safe cancellation and reversal when permissible.
//    */
//   async cancelTrade(reference, userId, ip = null) {
//     // ... Authorization and guards ...
//     if (!reference) throw new Error("reference required");
//     const trade = await P2PTrade.findOne({ reference });
//     if (!trade) throw new Error("Trade not found");

//     // Authorization...
//     if (trade.userId.toString() !== userId.toString() && !(await isAdmin(userId))) {
//       throw new Error("Not authorized to cancel this trade");
//     }

//     // Prevent cancelling after completion
//     if (trade.status === ALLOWED_STATES.COMPLETED) {
//       throw new Error("Cannot cancel a completed trade");
//     }

//     const internal = isInternalTrade(trade);
//     let reversalSuccess = false;

//     // If funds were escrowed, attempt reversal
//     if (trade.status === ALLOWED_STATES.ESCROWED_WAIT_MERCHANT && internal) {
//       // Reverse buyer funds from escrow back to buyer
//       
//       // 1. Get Buyer's UUID (Destination ID)
//       const buyerDestinationId = await resolveUserWalletId(trade.userId, trade.currencySource);
//       if (!buyerDestinationId) {
//         // Can't reverse: log and set flagged
//         trade.logs.push({ message: "Escrow reversal failed - buyer wallet missing (Destination ID)", actor: userId, role: "system", ip, time: new Date() });
//         trade.status = ALLOWED_STATES.FAILED;
//         await trade.save();
//         throw new Error("Escrow reversal failed: buyer destination address ID missing");
//       }

//       // 2. Get Buyer's Crypto Address (REQUIRED for Blockrader's 'address' field)
//       const buyerCryptoAddress = await resolveUserCryptoAddress(trade.userId, trade.currencySource);
//       if (!buyerCryptoAddress) {
//         trade.status = ALLOWED_STATES.FAILED;
//         await trade.save();
//         throw new Error("Escrow reversal failed: buyer crypto address missing");
//       }

//       // Pass the required 0x destination address. Source is the Master Wallet.
//       // This is a Master -> Child transfer (Reversal)
//       const transferResult = await blockrader.transferFunds(
//         blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Source: Master Wallet UUID
//         buyerDestinationId, // Destination: Buyer UUID (used for routing)
//         trade.amountSource,
//         trade.currencySource,
//         buyerCryptoAddress // Pass the required 0x address
//       );

//       // --- FIX 1 (CancelTrade Internal): Check for successful API response structure (data.id) ---
//       if (!transferResult || !transferResult.data || !transferResult.data.id) {
//         // FIX: Use template literals (backticks)
//         const errorMessage = `Internal Escrow reversal failed at provider. Provider response: ${JSON.stringify(transferResult)}`;
//         console.error(errorMessage);
//         trade.logs.push({ message: "Escrow reversal failed at provider", actor: userId, role: "system", ip, time: new Date() });
//         trade.status = ALLOWED_STATES.FAILED;
//         await trade.save();
//         throw new Error("Escrow reversal failed at provider");
//       }
//       // --- End Fix 1 ---
//       
//       const txId = transferResult.data.id || transferResult.txId || "n/a";
//       trade.status = ALLOWED_STATES.CANCELLED_REVERSED;
//       // FIX: Use template literals (backticks)
//       safeLog(trade, { message: `Internal escrow reversed (tx:${txId})`, actor: userId, role: "buyer", ip, time: new Date() });
//       reversalSuccess = true;
//     }

//     // If merchant escrowed for external case (PAYMENT_CONFIRMED_BY_BUYER), reverse merchant escrow
//     if (trade.status === ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER && !internal) {
//       
//       // 1. Get Merchant's UUID (Destination ID)
//       const merchantDestinationId = await resolveUserWalletId(trade.merchantId, trade.currencyTarget);
//       if (!merchantDestinationId) {
//         trade.status = ALLOWED_STATES.FAILED;
//         await trade.save();
//         throw new Error("Merchant destination Address ID missing for reversal");
//       }
//       
//       // 2. Get Merchant's Crypto Address (REQUIRED for Blockrader's 'address' field)
//       const merchantCryptoAddress = await resolveUserCryptoAddress(trade.merchantId, trade.currencyTarget);
//       if (!merchantCryptoAddress) {
//         trade.status = ALLOWED_STATES.FAILED;
//         await trade.save();
//         throw new Error("Merchant crypto address missing for reversal");
//       }

//       // Pass the required 0x destination address. Source is the Master Wallet.
//       // This is a Master -> Child transfer (Reversal)
//       const transferResult = await blockrader.transferFunds(
//         blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Source: Master Wallet UUID
//         merchantDestinationId, // Destination: Merchant UUID (used for routing)
//         trade.amountTarget,
//         trade.currencyTarget,
//         merchantCryptoAddress // Pass the required 0x destination address
//       );

//       // --- FIX 1 (CancelTrade External): Check for successful API response structure (data.id) ---
//       if (!transferResult || !transferResult.data || !transferResult.data.id) {
//         // FIX: Use template literals (backticks)
//         const errorMessage = `External Escrow reversal failed at provider. Provider response: ${JSON.stringify(transferResult)}`;
//         console.error(errorMessage);
//         trade.status = ALLOWED_STATES.FAILED;
//         await trade.save();
//         throw new Error("Escrow reversal failed at provider");
//       }
//       // --- End Fix 1 ---

//       const txId = transferResult.data.id || transferResult.txId || "n/a";
//       trade.status = ALLOWED_STATES.CANCELLED_REVERSED;
//       // FIX: Use template literals (backticks)
//       safeLog(trade, { message: `External escrow reversed (tx:${txId})`, actor: userId, role: "system", ip, time: new Date() });
//       reversalSuccess = true;
//     }

//     // Generic cancel if nothing to reverse or reversal was successful
//     if (!reversalSuccess) {
//         trade.status = ALLOWED_STATES.CANCELLED;
//         safeLog(trade, { message: "Trade cancelled (no reversal needed)", actor: userId, role: "requester", ip, time: new Date() });
//     }
//     
//     // Final save of the status
//     await trade.save();
//     return trade.toObject();
//   },

//   // Utility helpers for admin / UI
//   async getTradeByReference(reference) {
//     return await P2PTrade.findOne({ reference }).populate("userId", "firstName email role").populate("merchantId", "firstName email role").lean();
//   },

//   async listTrades(filter = {}, page = 1, pageSize = 20) {
//     const q = {};
//     if (filter.status) q.status = filter.status;
//     if (filter.userId) q.userId = filter.userId;
//     if (filter.merchantId) q.merchantId = filter.merchantId;

//     const [trades, total] = await Promise.all([
//       P2PTrade.find(q).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
//       P2PTrade.countDocuments(q)
//     ]);

//     return { trades, total, page, pageSize };
//   }
// };

const mongoose = require("mongoose");
const P2PTrade = require("../models/p2pModel");
const User = require("../models/userModel");
const Wallet = require("../models/walletModel");

// External Providers
const ninepsb = require("./providers/ninePSBServices"); 
const blockrader = require("./providers/blockrader");

// --- Constants & Configuration ---

// These states are mirrored from p2pModel.js for easy reference and validation
const ALLOWED_STATES = {
    PENDING_PAYMENT: 'PENDING_PAYMENT',
    ESCROWED_AWAITING_MERCHANT_TRANSFER: 'ESCROWED_AWAITING_MERCHANT_TRANSFER',
    PAYMENT_CONFIRMED_BY_BUYER: 'PAYMENT_CONFIRMED_BY_BUYER',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
    CANCELLED_REVERSED: 'CANCELLED_REVERSED',
};

const SUPPORTED_ON_PLATFORM = ["NGN", "USD"]; // Currencies we hold internally (target currencies)
const SUPPORTED_SOURCE_CURRENCIES = ["NGN", "USD", "GHS", "XAF", "XOF", "RMB"]; // Currencies buyer can pay with

// --------- Helpers ----------

/**
 * @name safeLog
 * @description Creates an audit log entry for the P2P trade document.
 * @param {Object} trade - The Mongoose P2PTrade document.
 * @param {Object} logData - { message, actor (userId), role, ip, time }
 */
function safeLog(trade, logData) {
    // Ensure actor is a valid ObjectId string or null
    const actorId = logData.actor && mongoose.Types.ObjectId.isValid(logData.actor) ? logData.actor : null;
    
    trade.logs.push({
        message: logData.message,
        actor: actorId,
        role: logData.role || 'system',
        ip: logData.ip || 'n/a',
        time: logData.time || new Date(),
    });
}

/**
 * @name resolveProvider
 * @description Selects the correct external provider based on the target currency.
 * @param {String} currencyTarget - The currency being held in escrow (e.g., 'NGN' or 'USD').
 * @returns {{service: Object, escrow: Function, release: Function, reverse: Function}} 
 */
function resolveProvider(currencyTarget) {
    if (currencyTarget === 'NGN') {
        return { 
            service: ninepsb, 
            escrow: ninepsb.debitAndHold, 
            release: ninepsb.releaseToUser, 
            reverse: ninepsb.releaseToUser // In 9PSB, reversal means releasing back to the buyer's wallet (which is ninepsb.releaseToUser but with the buyer's wallet details)
        };
    } else if (currencyTarget === 'USD') {
        return { 
            service: blockrader, 
            escrow: blockrader.transferToEscrow, 
            release: blockrader.externalWithdrawal, 
            reverse: blockrader.transferToUserWallet // Blockrader reversal sends crypto back to user's wallet address
        };
    }
    throw new Error(`Unsupported currency for P2P escrow: ${currencyTarget}`);
}

/**
 * @name resolveUserWalletId
 * @description Looks up the external Wallet ID (UUID) for a user and currency. Required for Blockrader (USD).
 */
async function resolveUserWalletId(userId, currency) {
    const userWallet = await Wallet.findOne({ user_id: userId, currency: currency }).lean();
    if (!userWallet || !userWallet.externalWalletId) {
        throw new Error(`Wallet not found or missing external wallet ID for user ${userId} and currency ${currency}.`);
    }
    return userWallet.externalWalletId;
}

/**
 * @name resolveUserAccountDetails
 * @description Looks up the Account Number and Account Name for a user and currency. Required for 9PSB (NGN).
 */
async function resolveUserAccountDetails(userId, currency) {
    const userWallet = await Wallet.findOne({ user_id: userId, currency: currency }).lean();
    if (!userWallet || !userWallet.accountNumber || !userWallet.accountName) {
        throw new Error(`Wallet not found or missing account details (number/name) for user ${userId} and currency ${currency}.`);
    }
    return { accountNumber: userWallet.accountNumber, accountName: userWallet.accountName };
}

// ----------------------------
// 🥇 Core Business Logic
// ----------------------------

const p2pService = {

    /**
     * @name createTrade
     * @description Initializes a new P2P trade, performs validation, and sets up the escrow.
     * @param {Object} data - Trade creation data
     * @param {String} data.userId - The buyer's ID
     * @param {String} data.merchantId - The merchant's ID
     * @param {Number} data.amountSource - Amount the buyer is paying (Source Currency)
     * @param {Number} data.amountTarget - Amount the merchant receives (Target Currency)
     * @param {Number} data.rate - Exchange rate
     * @param {String} data.currencySource - Currency the buyer pays with (e.g., NGN, GHS)
     * @param {String} data.currencyTarget - Currency the merchant receives (e.g., NGN, USD)
     * @param {String} ip - Request IP address for logging
     * @returns {Object} The created P2PTrade document (Mongoose object)
     */
    async createTrade(data, ip) {
        const { userId, merchantId, amountSource, amountTarget, rate, currencySource, currencyTarget } = data;

        if (!SUPPORTED_ON_PLATFORM.includes(currencyTarget)) {
            throw new Error(`Unsupported target currency: ${currencyTarget}`);
        }
        if (!SUPPORTED_SOURCE_CURRENCIES.includes(currencySource)) {
            throw new Error(`Unsupported source currency: ${currencySource}`);
        }
        if (amountTarget <= 0 || amountSource <= 0) {
             throw new Error("Invalid amount: Amounts must be positive.");
        }

        // 1. Determine Provider
        const provider = resolveProvider(currencyTarget);
        const providerName = provider.service.name;

        // 2. Prepare reference and metadata
        const reference = `P2P-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Get the merchant's target destination address/account
        let destinationDetails = {};
        if (currencyTarget === 'USD') {
            // Blockrader needs the merchant's external wallet address (e.g., 0x...)
            const walletDetails = await Wallet.findOne({ user_id: merchantId, currency: currencyTarget });
            if (!walletDetails || !walletDetails.accountNumber) {
                throw new Error(`Wallet not found or missing destination address for target currency ${currencyTarget} for merchant ${merchantId}.`);
            }
            destinationDetails = { 
                toCryptoAddress: walletDetails.accountNumber,
                merchantExternalWalletId: walletDetails.externalWalletId 
            };
        } else if (currencyTarget === 'NGN') {
            // 9PSB needs the merchant's NGN account number
            const accountDetails = await resolveUserAccountDetails(merchantId, currencyTarget);
            destinationDetails = { 
                merchantAccountNumber: accountDetails.accountNumber,
                merchantAccountName: accountDetails.accountName
            };
        }

        const newTrade = new P2PTrade({
            userId,
            merchantId,
            reference,
            amountSource,
            amountTarget,
            rate,
            currencySource,
            currencyTarget,
            provider: providerName,
            status: ALLOWED_STATES.PENDING_PAYMENT,
            metadata: {
                ...destinationDetails,
                provider: providerName,
            },
        });

        safeLog(newTrade, { 
            message: `Trade initiated. Target provider: ${providerName}. Waiting for buyer payment.`, 
            actor: userId, 
            role: "requester", 
            ip, 
            time: new Date() 
        });

        await newTrade.save();
        return newTrade.toObject();
    },

    /**
     * @name confirmBuyerPayment
     * @description Called when the buyer confirms payment. Triggers the external escrow action.
     * @param {String} reference - Trade reference
     * @param {String} buyerId - The ID of the user confirming payment
     * @param {String} ip - Request IP address
     * @returns {Object} The updated P2PTrade document
     */
    async confirmBuyerPayment(reference, buyerId, ip) {
        const trade = await P2PTrade.findOne({ reference });
        if (!trade) throw new Error("Trade not found.");
        if (trade.userId.toString() !== buyerId) throw new Error("Not authorized: Only the buyer can confirm payment.");
        if (trade.status !== ALLOWED_STATES.PENDING_PAYMENT) throw new Error(`Trade not in pending state. Current status: ${trade.status}`);

        // 1. Determine Provider
        const provider = resolveProvider(trade.currencyTarget);
        
        // 2. Perform Escrow (Debit the Company's Float/Escrow account)
        safeLog(trade, { 
            message: `Buyer confirmed payment of ${trade.amountSource} ${trade.currencySource}. Attempting escrow of ${trade.amountTarget} ${trade.currencyTarget} with ${trade.provider}.`, 
            actor: buyerId, 
            role: "requester", 
            ip, 
            time: new Date() 
        });

        let escrowResult;
        try {
            if (trade.currencyTarget === 'NGN') {
                // 9PSB Escrow (debit float account)
                escrowResult = await provider.escrow(trade.amountTarget, trade.reference);
            } else if (trade.currencyTarget === 'USD') {
                // Blockrader Escrow (transfer USD from master to company escrow)
                escrowResult = await provider.escrow(trade.amountTarget, trade.reference);
            }
        } catch (error) {
            trade.status = ALLOWED_STATES.FAILED;
            safeLog(trade, { 
                message: `Escrow failed: ${error.message}`, 
                actor: buyerId, 
                role: "system", 
                ip, 
                time: new Date() 
            });
            await trade.save();
            throw new Error(`Escrow operation failed: ${error.message}`);
        }

        // 3. Update Trade Status and Metadata
        trade.status = ALLOWED_STATES.ESCROWED_AWAITING_MERCHANT_TRANSFER;
        trade.metadata.escrowTxId = escrowResult.data?.id || escrowResult.txId || 'n/a';
        trade.metadata.escrowTimestamp = new Date();

        safeLog(trade, { 
            message: `Escrow successful (Tx: ${trade.metadata.escrowTxId}). Waiting for Merchant confirmation.`, 
            actor: buyerId, 
            role: "system", 
            ip, 
            time: new Date() 
        });

        await trade.save();
        return trade.toObject();
    },

    /**
     * @name confirmMerchantPayment
     * @description Called when the merchant confirms receipt of the buyer's local currency payment. Triggers the release of escrow.
     * @param {String} reference - Trade reference
     * @param {String} merchantId - The ID of the user confirming payment (the Merchant)
     * @param {String} ip - Request IP address
     * @returns {Object} The updated P2PTrade document
     */
    async confirmMerchantPayment(reference, merchantId, ip) {
        const trade = await P2PTrade.findOne({ reference });
        if (!trade) throw new Error("Trade not found.");
        if (trade.merchantId.toString() !== merchantId) throw new Error("Not authorized: Only the designated merchant can confirm release.");
        if (trade.status !== ALLOWED_STATES.ESCROWED_AWAITING_MERCHANT_TRANSFER) {
            throw new Error(`Trade not ready for release. Current status: ${trade.status}`);
        }

        // 1. Determine Provider
        const provider = resolveProvider(trade.currencyTarget);
        
        // 2. Perform Release (Send funds from Escrow to Merchant's wallet/address)
        safeLog(trade, { 
            message: `Merchant confirmed transfer receipt. Attempting release of ${trade.amountTarget} ${trade.currencyTarget} to merchant's account.`, 
            actor: merchantId, 
            role: "requester", 
            ip, 
            time: new Date() 
        });

        let releaseResult;
        try {
            if (trade.currencyTarget === 'NGN') {
                // 9PSB Release (transfer NGN from float to merchant's 9PSB account)
                const { merchantAccountNumber } = trade.metadata;
                releaseResult = await provider.release(merchantAccountNumber, trade.amountTarget, trade.reference);
            } else if (trade.currencyTarget === 'USD') {
                // Blockrader Release (external withdrawal of USD from company escrow to merchant's 0x address)
                const { toCryptoAddress } = trade.metadata;
                // Merchant's external wallet ID is needed as the source ID for Blockrader withdrawal.
                const merchantExternalWalletId = trade.metadata.merchantExternalWalletId;
                if (!toCryptoAddress || !merchantExternalWalletId) {
                    throw new Error("Missing crypto destination address or source wallet ID for Blockrader release.");
                }

                releaseResult = await provider.release(merchantExternalWalletId, toCryptoAddress, trade.amountTarget, trade.reference);
            }
        } catch (error) {
            // IMPORTANT: If release fails, the trade status must be updated, but the escrow is still held!
            trade.status = ALLOWED_STATES.FAILED; 
            safeLog(trade, { 
                message: `Trade release failed: ${error.message}. Escrow remains held. MANUAL REVIEW REQUIRED.`, 
                actor: merchantId, 
                role: "system", 
                ip, 
                time: new Date() 
            });
            await trade.save();
            throw new Error(`Escrow release failed: ${error.message}. Trade requires manual intervention.`);
        }

        // 3. Update Trade Status and Metadata
        trade.status = ALLOWED_STATES.COMPLETED;
        trade.metadata.releaseTxId = releaseResult.data?.id || releaseResult.txId || 'n/a';
        trade.metadata.releaseTimestamp = new Date();

        safeLog(trade, { 
            message: `Trade COMPLETED. Escrow released to merchant (Tx: ${trade.metadata.releaseTxId}).`, 
            actor: merchantId, 
            role: "system", 
            ip, 
            time: new Date() 
        });

        await trade.save();
        return trade.toObject();
    },

    /**
     * @name cancelTrade
     * @description Cancels a trade and attempts to reverse the escrow if it was already established.
     * @param {String} reference - Trade reference
     * @param {String} userId - The ID of the user requesting the cancellation (Buyer or Merchant)
     * @param {String} ip - Request IP address
     * @returns {Object} The updated P2PTrade document
     */
    async cancelTrade(reference, userId, ip) {
        const trade = await P2PTrade.findOne({ reference });
        if (!trade) throw new Error("Trade not found.");
        
        // Only buyer or merchant can cancel
        if (trade.userId.toString() !== userId && trade.merchantId.toString() !== userId) {
            throw new Error("Not authorized to cancel this trade.");
        }
        
        if (trade.status === ALLOWED_STATES.COMPLETED) {
            throw new Error("Cannot cancel a completed trade.");
        }
        
        // 1. Check if escrow needs reversal (i.e., if trade is past PENDING_PAYMENT)
        let reversalSuccess = false;
        
        if (trade.status === ALLOWED_STATES.ESCROWED_AWAITING_MERCHANT_TRANSFER) {
            const provider = resolveProvider(trade.currencyTarget);

            safeLog(trade, { message: `Cancellation requested. Attempting escrow reversal of ${trade.amountTarget} ${trade.currencyTarget}.`, actor: userId, role: "requester", ip, time: new Date() });
            
            let transferResult;
            try {
                 if (trade.currencyTarget === 'NGN') {
                    // 9PSB Reversal (release from float back to buyer's 9PSB account)
                    const buyerAccountDetails = await resolveUserAccountDetails(trade.userId, 'NGN'); // Buyer's NGN wallet for reversal
                    transferResult = await provider.reverse(buyerAccountDetails.accountNumber, trade.amountTarget, trade.reference);
                } else if (trade.currencyTarget === 'USD') {
                    // Blockrader Reversal (transfer USD from company escrow back to buyer's USD wallet ID)
                    const buyerExternalWalletId = await resolveUserWalletId(trade.userId, 'USD'); // Buyer's external wallet ID for reversal
                    transferResult = await provider.reverse(buyerExternalWalletId, trade.amountTarget, trade.reference);
                }
            } catch (error) {
                // Escrow reversal failed, manual intervention is needed.
                trade.status = ALLOWED_STATES.FAILED;
                safeLog(trade, { message: `Escrow reversal failed: ${error.message}. MANUAL REVIEW REQUIRED.`, actor: userId, role: "system", ip, time: new Date() });
                await trade.save();
                throw new Error(`Cancellation failed: Escrow reversal failed: ${error.message}. Trade requires manual intervention.`);
            }

            // If reversal was successful
            const txId = transferResult.data?.id || transferResult.txId || "n/a";
            trade.status = ALLOWED_STATES.CANCELLED_REVERSED;
            safeLog(trade, { message: `External escrow reversed (Tx: ${txId}). Funds returned to buyer.`, actor: userId, role: "system", ip, time: new Date() });
            reversalSuccess = true;
        }

        // Generic cancel if nothing to reverse or if the status was PENDING_PAYMENT (no escrow yet)
        if (!reversalSuccess) {
            trade.status = ALLOWED_STATES.CANCELLED;
            safeLog(trade, { message: "Trade cancelled.", actor: userId, role: "requester", ip, time: new Date() });
        }
        
        // Final save of the status
        await trade.save();
        return trade.toObject();
    },

    // Utility helpers for admin / UI

    /**
     * @name getTradeByReference
     * @description Fetches a single trade and populates user details for display.
     * @param {String} reference - Trade reference
     * @returns {Object} The P2PTrade document with populated user details
     */
    async getTradeByReference(reference) {
        return await P2PTrade.findOne({ reference })
            .populate("userId", "firstName email role")
            .populate("merchantId", "firstName email role")
            .lean(); // Return a plain object
    },

    /**
     * @name getAllTrades
     * @description Fetches all trades (for admin purposes).
     * @returns {Array<Object>} List of P2PTrade documents
     */
    async getAllTrades() {
        return await P2PTrade.find({})
            .populate("userId", "firstName email role")
            .populate("merchantId", "firstName email role")
            .sort({ createdAt: -1 })
            .lean();
    },
};

module.exports = p2pService;
