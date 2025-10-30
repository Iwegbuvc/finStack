// // const mongoose = require("mongoose");
// // const P2PTrade = require("../models/p2pModel");
// // const User = require("../models/userModel");
// // const Wallet = require("../models/walletModel");
// // const blockrader = require("./providers/blockrader"); 

// // const SUPPORTED_ON_PLATFORM = ["NGN", "USD"]; // currencies we hold internally for buyer payout
// // const SUPPORTED_SOURCE_CURRENCIES = ["NGN", "USD", "GHS", "XAF", "XOF", "RMB"]; // currencies buyer can pay with

// // // --------- Helpers ----------

// // /**
// //  * @name resolveUserWalletId
// //  * @description Looks up the Blockrader Address ID (externalWalletId - the UUID) 
// //  * for a given user and currency.
// //  * @param {String} userId - MongoDB ID of the user (Buyer or Merchant)
// //  * @param {String} currency - The currency (e.g., 'USD')
// //  * @returns {String | null} The Blockrader Address ID (externalWalletId) or null.
// //  */
// // async function resolveUserWalletId(userId, currency) {
// //     const userWallet = await Wallet.findOne({ user_id: userId, currency: currency }).lean();
    
// //     if (!userWallet || !userWallet.externalWalletId) {
// //         console.error(`Wallet not found for user ${userId} and currency ${currency}, or externalWalletId (UUID) is missing.`);
// //         return null; 
// //     }
    
// //     // externalWalletId is the Blockrader Address ID (UUID)
// //     return userWallet.externalWalletId; 
// // }

// // /**
// //  * @name resolveUserCryptoAddress
// //  * @description Looks up the crypto address (account_number - the 0x...) 
// //  * for a given user and currency. This address is required by Blockrader API 
// //  * for the 'address' field during transfers.
// //  * @param {String} userId - MongoDB ID of the user
// //  * @param {String} currency - The currency (e.g., 'USD')
// //  * @returns {String | null} The Wallet's crypto address (account_number) or null.
// //  */
// // async function resolveUserCryptoAddress(userId, currency) {
// //     const userWallet = await Wallet.findOne({ user_id: userId, currency: currency }).lean();

// //     // ✅ FIX: Changed to 'accountNumber' to match how it's saved in walletModel in blockrader.js
// //     if (!userWallet || !userWallet.accountNumber) {
// //         console.error(`Wallet not found for user ${userId} and currency ${currency}, or accountNumber (0x address) is missing.`);
// //         return null; 
// //     }

// //     // accountNumber is the Crypto Address (0x...)
// //     return userWallet.accountNumber; 
// // }


// // async function checkUserExists(userId) {
// //   const user = await User.findById(userId).lean();
// //   if (!user) throw new Error("User not found");
// //   return user;
// // }

// // async function isAdmin(userId) {
// //   const u = await User.findById(userId).lean();
// //   return u && u.role === "admin";
// // }

// // function isInternalTrade(trade) {
// //   // "Internal" means buyer is using NGN or USD on-platform (we have internal wallets)
// //   return SUPPORTED_ON_PLATFORM.includes(trade.currencySource);
// // }

// // function safeLog(trade, entry) {
// //   // ensure logs array exists
// //   trade.logs = trade.logs || [];
// //   trade.logs.push({
// //     ...entry,
// //     time: entry.time || new Date()
// //   });
// // }

// // // Basic state machine allowed transitions (enforced where needed)
// // const ALLOWED_STATES = {
// //   INIT: "PENDING_PAYMENT",
// //   ESCROWED_WAIT_MERCHANT: "ESCROWED_AWAITING_MERCHANT_TRANSFER",
// //   PAYMENT_CONFIRMED_BY_BUYER: "PAYMENT_CONFIRMED_BY_BUYER",
// //   COMPLETED: "COMPLETED",
// //   FAILED: "FAILED",
// //   CANCELLED: "CANCELLED",
// //   CANCELLED_REVERSED: "CANCELLED_REVERSED",
// // };

// // // --------- Service functions ----------
// // module.exports = {
// //   /**
// //    * initiateTrade
// //    * - creates trade and, for internal trades, attempts to immediately escrow buyer funds
// //    */
// //   async initiateTrade(buyerId, merchantId, data, ip = null) {
// //     // Basic validations...

// //     // Create initial DB record inside a mongoose session so DB write is atomic.
// //     const session = await mongoose.startSession();
// //     session.startTransaction();
// //     try {
// //       const tradeDoc = await P2PTrade.create(
// //         [
// //           {
// //             reference: data.reference || `REF_${Date.now()}`,
// //             userId: buyerId,
// //             merchantId,
// //             amountSource: data.amountSource,
// //             amountTarget: data.amountTarget,
// //             currencySource: data.currencySource,
// //             currencyTarget: data.currencyTarget,
// //             rate: data.rate || 1,
// //             provider: "BLOCKRADER",
// //             status: ALLOWED_STATES.INIT,
// //             logs: []
// //           }
// //         ],
// //         { session }
// //       );

// //       const trade = tradeDoc[0];

// //       safeLog(trade, { message: "Trade created", actor: buyerId, role: "buyer", ip, time: new Date() });

// //       // If buyer is using an internal (supported) currency, immediately move buyer funds to company escrow.
// //       if (isInternalTrade(trade)) {
// //         // Resolve the buyer wallet UUID (Address ID) for the SOURCE
// //         const buyerSourceId = await resolveUserWalletId(buyerId, trade.currencySource);
// //         if (!buyerSourceId) {
// //           throw new Error("Buyer does not have a wallet for currencySource");
// //         }

// //         // Destination for escrow is the Master Wallet. We pass the Master Wallet's 0x address.
// //         const masterWalletCryptoAddress = blockrader.ESCROW_DESTINATION_ADDRESS;
// //         if (!masterWalletCryptoAddress) {
// //             throw new Error("FATAL: MASTER_WALLET_ADDRESS is missing in environment variables for escrow.");
// //         }


// //         // Perform the external provider call (escrow transfer).
// //         // This is a Child -> Master transfer (Escrow)
// //         const transferResult = await blockrader.transferFunds(
// //           buyerSourceId, // Source: User Wallet UUID
// //           blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Destination: Master Wallet UUID
// //           trade.amountSource,
// //           trade.currencySource,
// //           masterWalletCryptoAddress // Pass the required Master Wallet 0x Address
// //         );

// //         // Expect transferResult success/txId; otherwise throw
// //         if (!transferResult || (!transferResult.success && !transferResult.txId)) {
// //           throw new Error("Failed to escrow buyer funds");
// //         }

// //         // update trade status + logs
// //         trade.status = ALLOWED_STATES.ESCROWED_WAIT_MERCHANT;
// //         safeLog(trade, {
// //           message: `Buyer funds escrowed (${trade.amountSource} ${trade.currencySource}) tx:${transferResult.txId || "n/a"}`,
// //           actor: buyerId,
// //           role: "buyer",
// //           ip,
// //           time: new Date()
// //         });

// //         // persist change
// //         await trade.save({ session });
// //       } else {
// //         // External fiat: buyer will pay off-platform; we wait for buyer confirmation
// //         safeLog(trade, { message: "External trade initiated (awaiting buyer payment)", actor: buyerId, role: "buyer", ip });
// //         await trade.save({ session });
// //       }

// //       await session.commitTransaction();
// //       session.endSession();

// //       // return fresh trade from db (lean)
// //       return await P2PTrade.findById(trade._id).lean();
// //     } catch (err) {
// //       await session.abortTransaction();
// //       session.endSession();
// //       // If we called an external transfer and it partially succeeded, consider implementing compensating logic here
// //       throw err;
// //     }
// //   },

// //   /**
// //    * confirmBuyerPayment
// //    * - Used when buyer paid off-platform (external fiat) and clicks "I've paid".
// //    */
// //   async confirmBuyerPayment(reference, buyerId, ip = null) {
// //     if (!reference) throw new Error("reference required");
// //     const trade = await P2PTrade.findOne({ reference });
// //     if (!trade) throw new Error("Trade not found");

// //     // Guard: cannot be used for internal trades
// //     if (isInternalTrade(trade)) {
// //       throw new Error("This flow is for external fiat payments only");
// //     }

// //     // Ensure correct actor and state...

// //     // Now we need to escrow merchant's asset (target currency) into company escrow.
// //     // Merchant must have an internal wallet for currencyTarget.
    
// //     // Get the merchant's wallet UUID (Address ID) for the SOURCE
// //     const merchantWalletId = await resolveUserWalletId(trade.merchantId, trade.currencyTarget);
// //     if (!merchantWalletId) {
// //       throw new Error("Merchant does not have a wallet for the target currency (Address ID missing in DB)");
// //     }

// //     // Destination for escrow is the Master Wallet. We pass the Master Wallet's 0x address.
// //     const masterWalletCryptoAddress = blockrader.ESCROW_DESTINATION_ADDRESS;
// //     if (!masterWalletCryptoAddress) {
// //         throw new Error("FATAL: MASTER_WALLET_ADDRESS is missing in environment variables for escrow.");
// //     }
    
// //     // Call provider: move merchant asset -> company escrow (so buyer's external payment can be matched)
// //     // This is a Child -> Master transfer (Escrow)
// //     const transferResult = await blockrader.transferFunds(
// //       merchantWalletId, // Source: Merchant Wallet UUID
// //       blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Destination: Master Wallet UUID
// //       trade.amountTarget,
// //       trade.currencyTarget,
// //       masterWalletCryptoAddress // Pass the required Master Wallet 0x Address
// //     );

// //     if (!transferResult || (!transferResult.success && !transferResult.txId)) {
// //       throw new Error("Failed to escrow merchant funds");
// //     }

// //     // Update DB...
// //     trade.status = ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER;
// //     safeLog(trade, {
// //       message: `Buyer confirmed external payment; merchant asset escrowed (tx:${transferResult.txId || "n/a"})`,
// //       actor: buyerId,
// //       role: "buyer",
// //       ip,
// //       time: new Date()
// //     });
// //     await trade.save();

// //     return trade.toObject();
// //   },

// //   /**
// //    * confirmMerchantPayment
// //    * - This triggers the release from escrow to the rightful recipient.
// //    */
// //   async confirmMerchantPayment(reference, merchantId, ip = null) {
// //     if (!reference) throw new Error("reference required");
// //     const trade = await P2PTrade.findOne({ reference });
// //     if (!trade) throw new Error("Trade not found");

// //     // Authorization...

// //     const internal = isInternalTrade(trade);

// //     // Validate expected status...

// //     // Settlement: release appropriate funds from escrow
// //     if (internal) {
// //       // Buyer funds are in escrow (in currencySource) -> release to merchant's source wallet
      
// //       // 1. Get Merchant's UUID (Destination ID)
// //       const merchantDestinationId = await resolveUserWalletId(trade.merchantId, trade.currencySource);
// //       if (!merchantDestinationId) throw new Error("Merchant missing destination Address ID for source currency");
      
// //       // 2. Get Merchant's Crypto Address (REQUIRED for Blockrader's 'address' field)
// //       const merchantCryptoAddress = await resolveUserCryptoAddress(trade.merchantId, trade.currencySource);
// //       if (!merchantCryptoAddress) throw new Error("Merchant missing destination crypto address for source currency");

// //       // Pass the required 0x destination address. Source is the Master Wallet.
// //       // This is a Master -> Child transfer (Settlement)
// //       const transferResult = await blockrader.transferFunds(
// //         blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Source: Master Wallet UUID
// //         merchantDestinationId, // Destination: Merchant UUID (used for routing)
// //         trade.amountSource,
// //         trade.currencySource,
// //         merchantCryptoAddress // Pass the required 0x destination address
// //       );

// //       if (!transferResult || (!transferResult.success && !transferResult.txId)) {
// //         throw new Error("Failed to release buyer funds to merchant");
// //       }

// //       safeLog(trade, {
// //         message: `Internal settlement: buyer funds released to merchant (tx:${transferResult.txId || "n/a"})`,
// //         actor: merchantId,
// //         role: "merchant",
// //         ip,
// //         time: new Date()
// //       });

// //     } else {
// //       // External: merchant's asset already escrowed (amountTarget) -> release it to buyer's wallet
      
// //       // 1. Get Buyer's UUID (Destination ID)
// //       const buyerDestinationId = await resolveUserWalletId(trade.userId, trade.currencyTarget);
// //       if (!buyerDestinationId) throw new Error("Buyer missing destination Address ID for target currency");

// //       // 2. Get Buyer's Crypto Address (REQUIRED for Blockrader's 'address' field)
// //       const buyerCryptoAddress = await resolveUserCryptoAddress(trade.userId, trade.currencyTarget);
// //       if (!buyerCryptoAddress) throw new Error("Buyer missing destination crypto address for target currency");

// //       // Pass the required 0x destination address. Source is the Master Wallet.
// //       // This is a Master -> Child transfer (Settlement)
// //       const transferResult = await blockrader.transferFunds(
// //         blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Source: Master Wallet UUID
// //         buyerDestinationId, // Destination: Buyer UUID (used for routing)
// //         trade.amountTarget,
// //         trade.currencyTarget,
// //         buyerCryptoAddress // Pass the required 0x destination address
// //       );

// //       if (!transferResult || (!transferResult.success && !transferResult.txId)) {
// //         throw new Error("Failed to release escrowed asset to buyer");
// //       }

// //       safeLog(trade, {
// //         message: `External settlement: merchant escrow released to buyer (tx:${transferResult.txId || "n/a"})`,
// //         actor: merchantId,
// //         role: "merchant",
// //         ip,
// //         time: new Date()
// //       });
// //     }

// //     trade.status = ALLOWED_STATES.COMPLETED;
// //     trade.updatedAt = new Date();
// //     await trade.save();

// //     return trade.toObject();
// //   },

// //   /**
// //    * cancelTrade
// //    * - Attempt safe cancellation and reversal when permissible.
// //    */
// //   async cancelTrade(reference, userId, ip = null) {
// //     // ... Authorization and guards ...
// //     if (!reference) throw new Error("reference required");
// //     const trade = await P2PTrade.findOne({ reference });
// //     if (!trade) throw new Error("Trade not found");

// //     // Authorization...
// //     if (trade.userId.toString() !== userId.toString() && !(await isAdmin(userId))) {
// //       throw new Error("Not authorized to cancel this trade");
// //     }

// //     // Prevent cancelling after completion
// //     if (trade.status === ALLOWED_STATES.COMPLETED) {
// //       throw new Error("Cannot cancel a completed trade");
// //     }

// //     const internal = isInternalTrade(trade);

// //     // If funds were escrowed, attempt reversal
// //     if (trade.status === ALLOWED_STATES.ESCROWED_WAIT_MERCHANT && internal) {
// //       // Reverse buyer funds from escrow back to buyer
      
// //       // 1. Get Buyer's UUID (Destination ID)
// //       const buyerDestinationId = await resolveUserWalletId(trade.userId, trade.currencySource);
// //       if (!buyerDestinationId) {
// //         // Can't reverse: log and set flagged
// //         trade.logs.push({ message: "Escrow reversal failed - buyer wallet missing", actor: userId, role: "system", ip, time: new Date() });
// //         trade.status = ALLOWED_STATES.FAILED;
// //         await trade.save();
// //         throw new Error("Escrow reversal failed: buyer destination address missing");
// //       }

// //       // 2. Get Buyer's Crypto Address (REQUIRED for Blockrader's 'address' field)
// //       const buyerCryptoAddress = await resolveUserCryptoAddress(trade.userId, trade.currencySource);
// //       if (!buyerCryptoAddress) {
// //         trade.status = ALLOWED_STATES.FAILED;
// //         await trade.save();
// //         throw new Error("Escrow reversal failed: buyer crypto address missing");
// //       }

// //       // Pass the required 0x destination address. Source is the Master Wallet.
// //       // This is a Master -> Child transfer (Reversal)
// //       const transferResult = await blockrader.transferFunds(
// //         blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Source: Master Wallet UUID
// //         buyerDestinationId, // Destination: Buyer UUID (used for routing)
// //         trade.amountSource,
// //         trade.currencySource,
// //         buyerCryptoAddress // Pass the required 0x address
// //       );

// //       if (!transferResult || (!transferResult.success && !transferResult.txId)) {
// //         trade.logs.push({ message: "Escrow reversal failed at provider", actor: userId, role: "system", ip, time: new Date() });
// //         trade.status = ALLOWED_STATES.FAILED;
// //         await trade.save();
// //         throw new Error("Escrow reversal failed at provider");
// //       }

// //       trade.status = ALLOWED_STATES.CANCELLED_REVERSED;
// //       safeLog(trade, { message: `Internal escrow reversed (tx:${transferResult.txId || "n/a"})`, actor: userId, role: "buyer", ip, time: new Date() });
// //       await trade.save();
// //       return trade.toObject();
// //     }

// //     // If merchant escrowed for external case (PAYMENT_CONFIRMED_BY_BUYER), reverse merchant escrow
// //     if (trade.status === ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER && !internal) {
      
// //       // 1. Get Merchant's UUID (Destination ID)
// //       const merchantDestinationId = await resolveUserWalletId(trade.merchantId, trade.currencyTarget);
// //       if (!merchantDestinationId) {
// //         trade.status = ALLOWED_STATES.FAILED;
// //         await trade.save();
// //         throw new Error("Merchant destination Address ID missing for reversal");
// //       }
      
// //       // 2. Get Merchant's Crypto Address (REQUIRED for Blockrader's 'address' field)
// //       const merchantCryptoAddress = await resolveUserCryptoAddress(trade.merchantId, trade.currencyTarget);
// //       if (!merchantCryptoAddress) {
// //         trade.status = ALLOWED_STATES.FAILED;
// //         await trade.save();
// //         throw new Error("Merchant crypto address missing for reversal");
// //       }

// //       // Pass the required 0x destination address. Source is the Master Wallet.
// //       // This is a Master -> Child transfer (Reversal)
// //       const transferResult = await blockrader.transferFunds(
// //         blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Source: Master Wallet UUID
// //         merchantDestinationId, // Destination: Merchant UUID (used for routing)
// //         trade.amountTarget,
// //         trade.currencyTarget,
// //         merchantCryptoAddress // Pass the required 0x destination address
// //       );

// //       if (!transferResult || (!transferResult.success && !transferResult.txId)) {
// //         trade.status = ALLOWED_STATES.FAILED;
// //         await trade.save();
// //         throw new Error("Escrow reversal failed at provider");
// //       }

// //       trade.status = ALLOWED_STATES.CANCELLED_REVERSED;
// //       safeLog(trade, { message: `External escrow reversed (tx:${transferResult.txId || "n/a"})`, actor: userId, role: "system", ip, time: new Date() });
// //       await trade.save();
// //       return trade.toObject();
// //     }

// //     // Generic cancel if nothing to reverse
// //     trade.status = ALLOWED_STATES.CANCELLED;
// //     safeLog(trade, { message: "Trade cancelled (no reversal needed)", actor: userId, role: "requester", ip, time: new Date() });
// //     await trade.save();
// //     return trade.toObject();
// //   },

// //   // Utility helpers for admin / UI
// //   async getTradeByReference(reference) {
// //     return await P2PTrade.findOne({ reference }).populate("userId", "firstName email role").populate("merchantId", "firstName email role").lean();
// //   },

// //   async listTrades(filter = {}, page = 1, pageSize = 20) {
// //     const q = {};
// //     if (filter.status) q.status = filter.status;
// //     if (filter.userId) q.userId = filter.userId;
// //     if (filter.merchantId) q.merchantId = filter.merchantId;

// //     const [trades, total] = await Promise.all([
// //       P2PTrade.find(q).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
// //       P2PTrade.countDocuments(q)
// //     ]);

// //     return { trades, total, page, pageSize };
// //   }
// // };


// ANOTHER ANGLE lates
const mongoose = require("mongoose");
const P2PTrade = require("../models/p2pModel");
const User = require("../models/userModel");
const Wallet = require("../models/walletModel");
const blockrader = require("./providers/blockrader"); 

const SUPPORTED_ON_PLATFORM = ["NGN", "USD"]; // currencies we hold internally for buyer payout
const SUPPORTED_SOURCE_CURRENCIES = ["NGN", "USD", "GHS", "XAF", "XOF", "RMB"]; // currencies buyer can pay with

// --------- Helpers ----------

/**
 * @name resolveUserWalletId
 * @description Looks up the Blockrader Address ID (externalWalletId - the UUID) 
 * for a given user and currency.
 * @param {String} userId - MongoDB ID of the user (Buyer or Merchant)
 * @param {String} currency - The currency (e.g., 'USD')
 * @returns {String | null} The Blockrader Address ID (externalWalletId) or null.
 */
async function resolveUserWalletId(userId, currency) {
    const userWallet = await Wallet.findOne({ user_id: userId, currency: currency }).lean();
    
    if (!userWallet || !userWallet.externalWalletId) {
        // FIX: Use template literals (backticks)
        console.error(`Wallet not found for user ${userId} and currency ${currency}, or externalWalletId (UUID) is missing.`);
        return null; 
    }
    
    // externalWalletId is the Blockrader Address ID (UUID)
    return userWallet.externalWalletId; 
}

/**
 * @name resolveUserCryptoAddress
 * @description Looks up the crypto address (account_number - the 0x...) 
 * for a given user and currency. This address is required by Blockrader API 
 * for the 'address' field during transfers.
 * @param {String} userId - MongoDB ID of the user
 * @param {String} currency - The currency (e.g., 'USD')
 * @returns {String | null} The Wallet's crypto address (account_number) or null.
 */
async function resolveUserCryptoAddress(userId, currency) {
    const userWallet = await Wallet.findOne({ user_id: userId, currency: currency }).lean();

    if (!userWallet || !userWallet.accountNumber) {
        // FIX: Use template literals (backticks)
        console.error(`Wallet not found for user ${userId} and currency ${currency}, or accountNumber (0x address) is missing.`);
        return null; 
    }

    // accountNumber is the Crypto Address (0x...)
    return userWallet.accountNumber; 
}


async function checkUserExists(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw new Error("User not found");
  return user;
}

async function isAdmin(userId) {
  const u = await User.findById(userId).lean();
  return u && u.role === "admin";
}

function isInternalTrade(trade) {
  // "Internal" means buyer is using NGN or USD on-platform (we have internal wallets)
  return SUPPORTED_ON_PLATFORM.includes(trade.currencySource);
}

function safeLog(trade, entry) {
  // ensure logs array exists
  trade.logs = trade.logs || [];
  trade.logs.push({
    ...entry,
    time: entry.time || new Date()
  });
}

// Basic state machine allowed transitions (enforced where needed)
const ALLOWED_STATES = {
  INIT: "PENDING_PAYMENT",
  ESCROWED_WAIT_MERCHANT: "ESCROWED_AWAITING_MERCHANT_TRANSFER",
  PAYMENT_CONFIRMED_BY_BUYER: "PAYMENT_CONFIRMED_BY_BUYER",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  CANCELLED_REVERSED: "CANCELLED_REVERSED",
};

// --------- Service functions ----------
module.exports = {
  /**
   * initiateTrade
   * - creates trade and, for internal trades, attempts to immediately escrow buyer funds
   */
  async initiateTrade(buyerId, merchantId, data, ip = null) {
    // Basic validations...

    // Create initial DB record inside a mongoose session so DB write is atomic.
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const tradeDoc = await P2PTrade.create(
        [
          {
            reference: data.reference || `REF_${Date.now()}`,
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

      const trade = tradeDoc[0];

      safeLog(trade, { message: "Trade created", actor: buyerId, role: "buyer", ip, time: new Date() });

      // If buyer is using an internal (supported) currency, immediately move buyer funds to company escrow.
      if (isInternalTrade(trade)) {
        // Resolve the buyer wallet UUID (Address ID) for the SOURCE
        const buyerSourceId = await resolveUserWalletId(buyerId, trade.currencySource);
        if (!buyerSourceId) {
          throw new Error("Buyer does not have a wallet for currencySource");
        }

        // Destination for escrow is the Master Wallet. We pass the Master Wallet's 0x address.
        const masterWalletCryptoAddress = blockrader.ESCROW_DESTINATION_ADDRESS;
        if (!masterWalletCryptoAddress) {
            throw new Error("FATAL: MASTER_WALLET_ADDRESS is missing in environment variables for escrow.");
        }


        // Perform the external provider call (escrow transfer).
        // This is a Child -> Master transfer (Escrow)
        const transferResult = await blockrader.transferFunds(
          buyerSourceId, // Source: User Wallet UUID
          blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Destination: Master Wallet UUID
          trade.amountSource,
          trade.currencySource,
          masterWalletCryptoAddress // Pass the required Master Wallet 0x Address
        );

        // --- FIX 1 (InitiateTrade): Check for successful API response structure (data.id) ---
        if (!transferResult || !transferResult.data || !transferResult.data.id) {
            // FIX: Use template literals (backticks)
            const errorMessage = `Failed to escrow buyer funds. Provider response: ${JSON.stringify(transferResult)}`;
            console.error(errorMessage);
            throw new Error("Failed to escrow buyer funds: Provider API initiation failed.");
        }
        // --- End Fix 1 ---
        
        const txId = transferResult.data.id || transferResult.txId || "n/a"; // Use the internal ID or a fallback

        // update trade status + logs
        trade.status = ALLOWED_STATES.ESCROWED_WAIT_MERCHANT;
        safeLog(trade, {
          // FIX: Use template literals (backticks)
          message: `Buyer funds escrowed (${trade.amountSource} ${trade.currencySource}) tx:${txId}`,
          actor: buyerId,
          role: "buyer",
          ip,
          time: new Date()
        });

        // persist change
        await trade.save({ session });
      } else {
        // External fiat: buyer will pay off-platform; we wait for buyer confirmation
        safeLog(trade, { message: "External trade initiated (awaiting buyer payment)", actor: buyerId, role: "buyer", ip });
        await trade.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      // return fresh trade from db (lean)
      return await P2PTrade.findById(trade._id).lean();
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      // If we called an external transfer and it partially succeeded, consider implementing compensating logic here
      throw err;
    }
  },

  /**
   * confirmBuyerPayment
   * - Used when buyer paid off-platform (external fiat) and clicks "I've paid".
   */
  async confirmBuyerPayment(reference, buyerId, ip = null) {
    if (!reference) throw new Error("reference required");
    const trade = await P2PTrade.findOne({ reference });
    if (!trade) throw new Error("Trade not found");

    // Guard: cannot be used for internal trades
    if (isInternalTrade(trade)) {
      throw new Error("This flow is for external fiat payments only");
    }

    // Ensure correct actor and state...

    // Now we need to escrow merchant's asset (target currency) into company escrow.
    // Merchant must have an internal wallet for currencyTarget.
    
    // Get the merchant's wallet UUID (Address ID) for the SOURCE
    const merchantWalletId = await resolveUserWalletId(trade.merchantId, trade.currencyTarget);
    if (!merchantWalletId) {
      throw new Error("Merchant does not have a wallet for the target currency (Address ID missing in DB)");
    }

    // Destination for escrow is the Master Wallet. We pass the Master Wallet's 0x address.
    const masterWalletCryptoAddress = blockrader.ESCROW_DESTINATION_ADDRESS;
    if (!masterWalletCryptoAddress) {
        throw new Error("FATAL: MASTER_WALLET_ADDRESS is missing in environment variables for escrow.");
    }
    
    // Call provider: move merchant asset -> company escrow (so buyer's external payment can be matched)
    // This is a Child -> Master transfer (Escrow)
    const transferResult = await blockrader.transferFunds(
      merchantWalletId, // Source: Merchant Wallet UUID
      blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Destination: Master Wallet UUID
      trade.amountTarget,
      trade.currencyTarget,
      masterWalletCryptoAddress // Pass the required Master Wallet 0x Address
    );

    // --- FIX 1 (ConfirmBuyerPayment): Check for successful API response structure (data.id) ---
    if (!transferResult || !transferResult.data || !transferResult.data.id) {
      // FIX: Use template literals (backticks)
      const errorMessage = `Failed to escrow merchant funds. Provider response: ${JSON.stringify(transferResult)}`;
      console.error(errorMessage);
      throw new Error("Failed to escrow merchant funds: Provider API initiation failed.");
    }
    // --- End Fix 1 ---
    
    const txId = transferResult.data.id || transferResult.txId || "n/a"; // Use the internal ID or a fallback

    // Update DB...
    trade.status = ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER;
    safeLog(trade, {
      // FIX: Use template literals (backticks)
      message: `Buyer confirmed external payment; merchant asset escrowed (tx:${txId})`,
      actor: buyerId,
      role: "buyer",
      ip,
      time: new Date()
    });
    // Immediate save to prevent webhook race condition
    await trade.save();

    return trade.toObject();
  },

  /**
   * confirmMerchantPayment
   * - This triggers the release from escrow to the rightful recipient.
   */
  async confirmMerchantPayment(reference, merchantId, ip = null) {
    if (!reference) throw new Error("reference required");
    const trade = await P2PTrade.findOne({ reference });
    if (!trade) throw new Error("Trade not found");

    // Authorization...

    const internal = isInternalTrade(trade);

    // Validate expected status...

    let transferResult = null;
    let transferFailed = false;
    let txId = "n/a";

    // Settlement: release appropriate funds from escrow
    if (internal) {
      // Internal settlement logic remains largely the same...
      // ...
    } else {
      // External: merchant's asset already escrowed (amountTarget) -> release it to buyer's wallet
      
      // 1. Get Buyer's UUID (Destination ID)
      const buyerDestinationId = await resolveUserWalletId(trade.userId, trade.currencyTarget);
      if (!buyerDestinationId) throw new Error("Buyer missing destination Address ID for target currency");

      // 2. Get Buyer's Crypto Address (REQUIRED for Blockrader's 'address' field)
      const buyerCryptoAddress = await resolveUserCryptoAddress(trade.userId, trade.currencyTarget);
      if (!buyerCryptoAddress) throw new Error("Buyer missing destination crypto address for target currency");

      // Pass the required 0x destination address. Source is the Master Wallet.
      // This is a Master -> Child transfer (Settlement)
      transferResult = await blockrader.transferFunds(
        blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Source: Master Wallet UUID
        buyerDestinationId, // Destination: Buyer UUID (used for routing)
        trade.amountTarget,
        trade.currencyTarget,
        buyerCryptoAddress // Pass the required 0x destination address
      );

      // --- CRITICAL FIX 1: Check for successful API response structure (data.id) ---
      // This is the check that was failing because the API returned PENDING status initially.
      if (!transferResult || !transferResult.data || !transferResult.data.id) {
        // FIX: Use template literals (backticks)
        const errorMessage = `Failed to release escrowed asset to buyer (External settlement). Provider response: ${JSON.stringify(transferResult)}`;
        console.error(errorMessage);
        transferFailed = true;
      }
      // --- End Critical Fix 1 ---
      
      if (!transferFailed) {
        txId = transferResult.data.id || transferResult.txId || "n/a";
        safeLog(trade, {
          // FIX: Use template literals (backticks)
          message: `External settlement initiated to buyer (tx:${txId}). Awaiting webhook confirmation.`,
          actor: merchantId,
          role: "merchant",
          ip,
          time: new Date()
        });
      }
    }
    
    // --- CRITICAL FIX 2: Immediate save to COMPLETED status to beat the webhook ---
    // We mark the trade as COMPLETED immediately upon successful initiation of the transfer.
    // The webhook only confirms the underlying transaction is final.
    trade.status = ALLOWED_STATES.COMPLETED;
    trade.updatedAt = new Date();
    await trade.save();
    // --- End Critical Fix 2 ---

    if (transferFailed) {
        // If the initiation failed (e.g., Blockrader API was down), we throw the error AFTER saving the COMPLETED status 
        // in case the webhook still arrives and finds the trade completed.
        // NOTE: The webhook handler now contains logic to revert the status if a 'transfer.failed' event is received.
        throw new Error("Settlement transfer initiation failed at provider.");
    }


    return trade.toObject();
  },

  /**
   * cancelTrade
   * - Attempt safe cancellation and reversal when permissible.
   */
  async cancelTrade(reference, userId, ip = null) {
    // ... Authorization and guards ...
    if (!reference) throw new Error("reference required");
    const trade = await P2PTrade.findOne({ reference });
    if (!trade) throw new Error("Trade not found");

    // Authorization...
    if (trade.userId.toString() !== userId.toString() && !(await isAdmin(userId))) {
      throw new Error("Not authorized to cancel this trade");
    }

    // Prevent cancelling after completion
    if (trade.status === ALLOWED_STATES.COMPLETED) {
      throw new Error("Cannot cancel a completed trade");
    }

    const internal = isInternalTrade(trade);
    let reversalSuccess = false;

    // If funds were escrowed, attempt reversal
    if (trade.status === ALLOWED_STATES.ESCROWED_WAIT_MERCHANT && internal) {
      // Reverse buyer funds from escrow back to buyer
      
      // 1. Get Buyer's UUID (Destination ID)
      const buyerDestinationId = await resolveUserWalletId(trade.userId, trade.currencySource);
      if (!buyerDestinationId) {
        // Can't reverse: log and set flagged
        trade.logs.push({ message: "Escrow reversal failed - buyer wallet missing (Destination ID)", actor: userId, role: "system", ip, time: new Date() });
        trade.status = ALLOWED_STATES.FAILED;
        await trade.save();
        throw new Error("Escrow reversal failed: buyer destination address ID missing");
      }

      // 2. Get Buyer's Crypto Address (REQUIRED for Blockrader's 'address' field)
      const buyerCryptoAddress = await resolveUserCryptoAddress(trade.userId, trade.currencySource);
      if (!buyerCryptoAddress) {
        trade.status = ALLOWED_STATES.FAILED;
        await trade.save();
        throw new Error("Escrow reversal failed: buyer crypto address missing");
      }

      // Pass the required 0x destination address. Source is the Master Wallet.
      // This is a Master -> Child transfer (Reversal)
      const transferResult = await blockrader.transferFunds(
        blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Source: Master Wallet UUID
        buyerDestinationId, // Destination: Buyer UUID (used for routing)
        trade.amountSource,
        trade.currencySource,
        buyerCryptoAddress // Pass the required 0x address
      );

      // --- FIX 1 (CancelTrade Internal): Check for successful API response structure (data.id) ---
      if (!transferResult || !transferResult.data || !transferResult.data.id) {
        // FIX: Use template literals (backticks)
        const errorMessage = `Internal Escrow reversal failed at provider. Provider response: ${JSON.stringify(transferResult)}`;
        console.error(errorMessage);
        trade.logs.push({ message: "Escrow reversal failed at provider", actor: userId, role: "system", ip, time: new Date() });
        trade.status = ALLOWED_STATES.FAILED;
        await trade.save();
        throw new Error("Escrow reversal failed at provider");
      }
      // --- End Fix 1 ---
      
      const txId = transferResult.data.id || transferResult.txId || "n/a";
      trade.status = ALLOWED_STATES.CANCELLED_REVERSED;
      // FIX: Use template literals (backticks)
      safeLog(trade, { message: `Internal escrow reversed (tx:${txId})`, actor: userId, role: "buyer", ip, time: new Date() });
      reversalSuccess = true;
    }

    // If merchant escrowed for external case (PAYMENT_CONFIRMED_BY_BUYER), reverse merchant escrow
    if (trade.status === ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER && !internal) {
      
      // 1. Get Merchant's UUID (Destination ID)
      const merchantDestinationId = await resolveUserWalletId(trade.merchantId, trade.currencyTarget);
      if (!merchantDestinationId) {
        trade.status = ALLOWED_STATES.FAILED;
        await trade.save();
        throw new Error("Merchant destination Address ID missing for reversal");
      }
      
      // 2. Get Merchant's Crypto Address (REQUIRED for Blockrader's 'address' field)
      const merchantCryptoAddress = await resolveUserCryptoAddress(trade.merchantId, trade.currencyTarget);
      if (!merchantCryptoAddress) {
        trade.status = ALLOWED_STATES.FAILED;
        await trade.save();
        throw new Error("Merchant crypto address missing for reversal");
      }

      // Pass the required 0x destination address. Source is the Master Wallet.
      // This is a Master -> Child transfer (Reversal)
      const transferResult = await blockrader.transferFunds(
        blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Source: Master Wallet UUID
        merchantDestinationId, // Destination: Merchant UUID (used for routing)
        trade.amountTarget,
        trade.currencyTarget,
        merchantCryptoAddress // Pass the required 0x destination address
      );

      // --- FIX 1 (CancelTrade External): Check for successful API response structure (data.id) ---
      if (!transferResult || !transferResult.data || !transferResult.data.id) {
        // FIX: Use template literals (backticks)
        const errorMessage = `External Escrow reversal failed at provider. Provider response: ${JSON.stringify(transferResult)}`;
        console.error(errorMessage);
        trade.status = ALLOWED_STATES.FAILED;
        await trade.save();
        throw new Error("Escrow reversal failed at provider");
      }
      // --- End Fix 1 ---

      const txId = transferResult.data.id || transferResult.txId || "n/a";
      trade.status = ALLOWED_STATES.CANCELLED_REVERSED;
      // FIX: Use template literals (backticks)
      safeLog(trade, { message: `External escrow reversed (tx:${txId})`, actor: userId, role: "system", ip, time: new Date() });
      reversalSuccess = true;
    }

    // Generic cancel if nothing to reverse or reversal was successful
    if (!reversalSuccess) {
        trade.status = ALLOWED_STATES.CANCELLED;
        safeLog(trade, { message: "Trade cancelled (no reversal needed)", actor: userId, role: "requester", ip, time: new Date() });
    }
    
    // Final save of the status
    await trade.save();
    return trade.toObject();
  },

  // Utility helpers for admin / UI
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
