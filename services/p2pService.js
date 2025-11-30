const mongoose = require("mongoose");
const P2PTrade = require("../models/p2pModel");
const User = require("../models/userModel");
const Wallet = require("../models/walletModel");
const blockrader = require("./providers/blockrader");

// Custom Error Class for clearer API responses
class TradeError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.name = 'TradeError';
        this.status = status;
    }
}

const SUPPORTED_ON_PLATFORM = ["cNGN", "USDC"]; // Currencies we hold internally for buyer payout
// Currencies buyer can pay with (kept for context, not used in the core logic here)
// const SUPPORTED_SOURCE_CURRENCIES = ["NGN", "USD", "GHS", "XAF", "XOF", "RMB"];

// Basic state machine allowed transitions
const ALLOWED_STATES = {
    INIT: "PENDING_PAYMENT",
    ESCROWED_WAIT_MERCHANT: "ESCROWED_AWAITING_MERCHANT_TRANSFER",
    PAYMENT_CONFIRMED_BY_BUYER: "PAYMENT_CONFIRMED_BY_BUYER",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    CANCELLED: "CANCELLED",
    CANCELLED_REVERSED: "CANCELLED_REVERSED",
};

// --------- Helpers ----------

/**
 * @name resolveUserWalletId
 * @description Looks up the Blockrader Address ID (externalWalletId - the UUID)
 * @param {String} userId - MongoDB ID of the user
 * @param {String} currency - The currency (e.g., 'USD')
 * @returns {String} The Blockrader Address ID (externalWalletId)
 * @throws {TradeError} If wallet or ID is missing.
 */
async function resolveUserWalletId(userId, currency) {
    const userWallet = await Wallet.findOne({ user_id: userId, currency: currency }).lean();

    if (!userWallet || !userWallet.externalWalletId) {
        // Using template literal for clearer logging
        console.error(`Wallet not found for user ${userId} and currency ${currency}, or externalWalletId (UUID) is missing.`);
        throw new TradeError(`Wallet/Address ID missing for user ${userId} in currency ${currency}.`);
    }

    return userWallet.externalWalletId;
}

/**
 * @name resolveUserCryptoAddress
 * @description Looks up the crypto address (account_number - the 0x...)
 * @param {String} userId - MongoDB ID of the user
 * @param {String} currency - The currency (e.g., 'USD')
 * @returns {String} The Wallet's crypto address (account_number)
 * @throws {TradeError} If wallet or address is missing.
 */
async function resolveUserCryptoAddress(userId, currency) {
    const userWallet = await Wallet.findOne({ user_id: userId, currency: currency }).lean();

    if (!userWallet || !userWallet.walletAddress) {
        // Using template literal for clearer logging
        console.error(`Wallet not found for user ${userId} and currency ${currency}, or walletAddress (0x address) is missing.`);
        throw new TradeError(`Crypto address missing for user ${userId} in currency ${currency}.`);
    }

    return userWallet.walletAddress;
}


async function checkUser(userId) {
    const user = await User.findById(userId).lean();
    if (!user) throw new TradeError("User not found", 404);
    return user;
}

async function isAdmin(userId) {
    // NOTE: This should ideally check a cached user object, but we keep the DB lookup for self-contained functionality
    const u = await User.findById(userId).select('role').lean();
    return u && u.role === "admin";
}

function isInternalTrade(trade) {
    // "Internal" means buyer is using NGN or USD on-platform (we have internal wallets)
    return SUPPORTED_ON_PLATFORM.includes(trade.currencySource);
}

/**
 * Safely updates the trade's logs array in memory before saving.
 */
function safeLog(trade, entry) {
    trade.logs = trade.logs || [];
    trade.logs.push({
        ...entry,
        time: entry.time || new Date()
    });
}

/**
 * @name updateTradeStatusAndLog
 * @description Atomically updates the trade status and logs the event.
 */
async function updateTradeStatusAndLog(tradeId, newStatus, logEntry, expectedStatus = null) {
    const update = {
        $set: { status: newStatus },
        $push: { logs: { ...logEntry, time: new Date() } }
    };

    // Use findByIdAndUpdate for atomic status change
    const query = { _id: tradeId };
    if (expectedStatus) {
        query.status = expectedStatus; // Optimistic locking on expected status
    }

    const updatedTrade = await P2PTrade.findOneAndUpdate(
        query,
        update,
        { new: true, lean: true }
    );

    if (!updatedTrade) {
        if (expectedStatus) {
            throw new TradeError(`Trade ${tradeId} is not in the expected status (${expectedStatus}). Current status prevents transition to ${newStatus}.`, 409);
        }
        throw new TradeError(`Trade ${tradeId} not found or status update failed.`, 404);
    }

    return updatedTrade;
}

/**
 * @name performEscrow
 * @description Isolates the external API call and handles immediate failure.
 * @param {Object} trade The trade object.
 * @param {String} sourceWalletId UUID of the source wallet.
 * @param {String} masterCryptoAddress 0x address of the master wallet.
 * @param {String} actorId The ID of the user performing the action (buyer or merchant).
 * @param {String} ip User IP for logging.
 * @param {String} role Role for logging.
 * @throws {TradeError} If the provider API initiation fails.
 */
async function performEscrow(trade, sourceWalletId, masterCryptoAddress, actorId, ip, role) {
    // Perform the external provider call (escrow transfer).
    const transferResult = await blockrader.transferFunds(
        sourceWalletId, // Source: User/Merchant Wallet UUID
        blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Destination: Master Wallet UUID
        trade.amountSource, // or amountTarget depending on context
        trade.currencySource, // or currencyTarget depending on context
        masterCryptoAddress // Pass the required Master Wallet 0x Address
    );

    // CRITICAL CHECK: Check for successful API response structure (data.id)
    if (!transferResult || !transferResult.data || !transferResult.data.id) {
        const errorMessage = `Failed to escrow funds. Provider response: ${JSON.stringify(transferResult)}`;
        console.error(errorMessage);
        // We log the specific failure and throw a concise error
        await updateTradeStatusAndLog(
            trade._id,
            ALLOWED_STATES.FAILED,
            { message: `Escrow attempt failed at provider API: ${errorMessage}`, actor: 'system', role: 'system', ip }
        );
        throw new TradeError("Failed to initiate escrow transfer: Provider API initiation failed.");
    }

    return transferResult;
}


// --------- Service functions ----------
module.exports = {
    /**
     * initiateTrade
     * - Creates trade and, for internal trades, attempts to immediately escrow buyer funds
     */
    async initiateTrade(buyerId, merchantId, data, ip = null) {
        await checkUser(buyerId);
        await checkUser(merchantId);

        // 1. Create initial DB record inside a transaction
        const session = await mongoose.startSession();
        session.startTransaction();
        let trade; // Declare trade outside of try block for access in catch

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
                        status: isInternalTrade({ currencySource: data.currencySource }) ? ALLOWED_STATES.ESCROWED_WAIT_MERCHANT : ALLOWED_STATES.INIT,
                        logs: []
                    }
                ],
                { session }
            );

            trade = tradeDoc[0];

            safeLog(trade, { message: "Trade created", actor: buyerId, role: "buyer", ip, time: new Date() });

            // Atomic status update based on trade type (either INIT or ESCROWED_WAIT_MERCHANT)
            await trade.save({ session });
            await session.commitTransaction();

        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }

        // 2. Perform external operation (ESCROW) OUTSIDE the database transaction
        if (isInternalTrade(trade)) {
            try {
                // Resolve the buyer wallet UUID (Address ID) for the SOURCE
                const buyerSourceId = await resolveUserWalletId(buyerId, trade.currencySource);
                // Destination for escrow is the Master Wallet's 0x address.
                const masterWalletCryptoAddress = blockrader.ESCROW_DESTINATION_ADDRESS;
                if (!masterWalletCryptoAddress) {
                    throw new TradeError("FATAL: MASTER_WALLET_ADDRESS is missing for escrow.");
                }

                // Perform the external provider call (escrow transfer).
                const transferResult = await blockrader.transferFunds(
                    buyerSourceId, // Source: User Wallet UUID
                    blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Destination: Master Wallet UUID
                    trade.amountSource,
                    trade.currencySource,
                    masterWalletCryptoAddress // Pass the required Master Wallet 0x Address
                );

                // CRITICAL CHECK: Check for successful API response structure (data.id)
                if (!transferResult || !transferResult.data || !transferResult.data.id) {
                    const errorMessage = `Failed to initiate escrow. Provider response: ${JSON.stringify(transferResult)}`;
                    // This error is caught below, which handles the status update to FAILED
                    throw new TradeError(errorMessage);
                }

                const txId = transferResult.data.id || transferResult.txId || "n/a";

                // Update status atomically using findByIdAndUpdate since the original session is closed
                await updateTradeStatusAndLog(
                    trade._id,
                    ALLOWED_STATES.ESCROWED_WAIT_MERCHANT,
                    {
                        message: `Buyer funds escrowed (${trade.amountSource} ${trade.currencySource}) tx:${txId}`,
                        actor: buyerId,
                        role: "buyer",
                        ip,
                    },
                    ALLOWED_STATES.INIT // Ensure we are only updating from INIT state
                );

            } catch (error) {
                // If escrow fails, the trade is marked FAILED, but the original DB create succeeded.
                if (error instanceof TradeError) {
                    // If it's a specific TradeError (e.g., wallet missing or provider API failed)
                    await updateTradeStatusAndLog(
                        trade._id,
                        ALLOWED_STATES.FAILED,
                        {
                            message: `Critical Error during internal escrow: ${error.message}`,
                            actor: 'system',
                            role: 'system',
                            ip,
                        }
                    );
                }
                // Re-throw the error so the API caller knows it failed
                throw error;
            }
        } else {
            // External fiat: buyer will pay off-platform; we wait for buyer confirmation
            await updateTradeStatusAndLog(
                trade._id,
                ALLOWED_STATES.INIT,
                { message: "External trade initiated (awaiting buyer payment)", actor: buyerId, role: "buyer", ip }
            );
        }

        return await P2PTrade.findById(trade._id).lean();
    },

    /**
     * confirmBuyerPayment
     * - Used when buyer paid off-platform (external fiat) and clicks "I've paid".
     * - Triggers merchant asset escrow.
     */
    async confirmBuyerPayment(reference, buyerId, ip = null) {
        if (!reference) throw new TradeError("Reference required");

        const trade = await P2PTrade.findOne({ reference });
        if (!trade) throw new TradeError("Trade not found", 404);

        // --- ADDED GUARDS ---
        if (trade.userId.toString() !== buyerId.toString()) {
            throw new TradeError("Unauthorized: Only the buyer can confirm payment.", 403);
        }
        if (trade.status !== ALLOWED_STATES.INIT) {
            throw new TradeError(`Cannot confirm payment. Trade is currently in status: ${trade.status}.`, 409);
        }
        if (isInternalTrade(trade)) {
            throw new TradeError("This flow is for external fiat payments only (Internal trades escrow automatically).");
        }
        // --- END GUARDS ---

        // Now we need to escrow merchant's asset (target currency) into company escrow.
        const merchantWalletId = await resolveUserWalletId(trade.merchantId, trade.currencyTarget);
        const masterWalletCryptoAddress = blockrader.ESCROW_DESTINATION_ADDRESS;

        if (!masterWalletCryptoAddress) {
            throw new TradeError("FATAL: MASTER_WALLET_ADDRESS is missing in environment variables for escrow.");
        }

        // Call provider: move merchant asset -> company escrow
        // This is a Child -> Master transfer (Escrow)
        const transferResult = await blockrader.transferFunds(
            merchantWalletId, // Source: Merchant Wallet UUID
            blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Destination: Master Wallet UUID
            trade.amountTarget,
            trade.currencyTarget,
            masterWalletCryptoAddress // Pass the required Master Wallet 0x Address
        );

        // --- CRITICAL CHECK: Check for successful API response structure (data.id) ---
        if (!transferResult || !transferResult.data || !transferResult.data.id) {
            const errorMessage = `Failed to escrow merchant funds. Provider response: ${JSON.stringify(transferResult)}`;
            console.error(errorMessage);
            // NOTE: Consider marking FAILED and potentially alerting admin if merchant's asset can't be escrowed.
            throw new TradeError("Failed to initiate merchant escrow: Provider API initiation failed.");
        }
        // --- END CRITICAL CHECK ---

        const txId = transferResult.data.id || transferResult.txId || "n/a";

        // Update DB atomically
        const updatedTrade = await updateTradeStatusAndLog(
            trade._id,
            ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER,
            {
                message: `Buyer confirmed external payment; merchant asset escrow initiated (tx:${txId}). Awaiting provider confirmation.`,
                actor: buyerId,
                role: "buyer",
                ip,
            },
            ALLOWED_STATES.INIT // Ensure we are only updating from INIT state
        );

        return updatedTrade;
    },

    /**
     * confirmMerchantPayment
     * - This triggers the release from escrow to the rightful recipient.
     */
    async confirmMerchantPayment(reference, merchantId, ip = null) {
        if (!reference) throw new TradeError("Reference required");
        const trade = await P2PTrade.findOne({ reference });
        if (!trade) throw new TradeError("Trade not found", 404);

        // --- ADDED GUARDS ---
        if (trade.merchantId.toString() !== merchantId.toString()) {
            throw new TradeError("Unauthorized: Only the merchant can confirm payment.", 403);
        }

        const internal = isInternalTrade(trade);
        const expectedStatus = internal ? ALLOWED_STATES.ESCROWED_WAIT_MERCHANT : ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER;

        if (trade.status !== expectedStatus) {
            throw new TradeError(`Cannot confirm/settle. Trade is in status: ${trade.status}. Expected status: ${expectedStatus}.`, 409);
        }
        // --- END GUARDS ---

        let transferFailed = false;

        try {
            // Settlement: release appropriate funds from escrow
            let transferResult = null;

            if (internal) {
                // Internal: Master -> Merchant (Source: Buyer funds already escrowed)
                const merchantDestinationId = await resolveUserWalletId(trade.merchantId, trade.currencyTarget);
                const merchantCryptoAddress = await resolveUserCryptoAddress(trade.merchantId, trade.currencyTarget);

                transferResult = await blockrader.transferFunds(
                    blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Source: Master Wallet UUID (escrow)
                    merchantDestinationId, // Destination: Merchant UUID
                    trade.amountTarget,
                    trade.currencyTarget,
                    merchantCryptoAddress
                );
            } else {
                // External: Master -> Buyer (Source: Merchant funds already escrowed)
                const buyerDestinationId = await resolveUserWalletId(trade.userId, trade.currencyTarget);
                const buyerCryptoAddress = await resolveUserCryptoAddress(trade.userId, trade.currencyTarget);

                transferResult = await blockrader.transferFunds(
                    blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Source: Master Wallet UUID (escrow)
                    buyerDestinationId, // Destination: Buyer UUID
                    trade.amountTarget,
                    trade.currencyTarget,
                    buyerCryptoAddress // Pass the required 0x destination address
                );
            }

            // CRITICAL CHECK: Check for successful API response structure (data.id)
            if (!transferResult || !transferResult.data || !transferResult.data.id) {
                const errorMessage = `Failed to release escrowed asset to recipient. Provider response: ${JSON.stringify(transferResult)}`;
                console.error(errorMessage);
                transferFailed = true;
                // Don't throw yet, mark as FAILED after saving status
                throw new TradeError("Settlement transfer initiation failed at provider.");
            }

            const txId = transferResult.data.id || transferResult.txId || "n/a";

            // CRITICAL FIX: Immediate save to COMPLETED status to beat the webhook
            const updatedTrade = await updateTradeStatusAndLog(
                trade._id,
                ALLOWED_STATES.COMPLETED,
                {
                    message: `${internal ? 'Internal' : 'External'} settlement initiated (tx:${txId}). Awaiting webhook confirmation.`,
                    actor: merchantId,
                    role: "merchant",
                    ip,
                },
                expectedStatus // Ensure we are only updating from the correct pre-settlement status
            );

            return updatedTrade;

        } catch (error) {
            // If API call fails, we still want to log it and mark the trade as FAILED
            if (trade) {
                 await updateTradeStatusAndLog(
                    trade._id,
                    ALLOWED_STATES.FAILED,
                    {
                        message: `Settlement failed during initiation: ${error.message}`,
                        actor: 'system',
                        role: 'system',
                        ip,
                    }
                );
            }
            throw error; // Re-throw the original error
        }
    },

    /**
     * cancelTrade
     * - Attempt safe cancellation and reversal when permissible.
     */
    async cancelTrade(reference, userId, ip = null) {
        if (!reference) throw new TradeError("Reference required");
        const trade = await P2PTrade.findOne({ reference });
        if (!trade) throw new TradeError("Trade not found", 404);

        // Authorization check (simplified by checking against buyer/admin only once)
        const user = await checkUser(userId);
        const isAdminUser = user.role === "admin";

        if (trade.userId.toString() !== userId.toString() && !isAdminUser) {
            throw new TradeError("Not authorized to cancel this trade", 403);
        }

        // Prevent cancelling after completion or reversal
        if ([ALLOWED_STATES.COMPLETED, ALLOWED_STATES.CANCELLED_REVERSED, ALLOWED_STATES.FAILED].includes(trade.status)) {
            throw new TradeError(`Cannot cancel a trade in status: ${trade.status}`, 409);
        }

        const internal = isInternalTrade(trade);
        let reversalSuccess = false;
        let reversalType = null;
        let sourceCurrency = null;
        let sourceDestinationId = null;
        let sourceCryptoAddress = null;
        let sourceAmount = null;

        try {
            // Case 1: Internal Trade - Reverse buyer funds from escrow back to buyer
            if (trade.status === ALLOWED_STATES.ESCROWED_WAIT_MERCHANT && internal) {
                sourceCurrency = trade.currencySource;
                sourceAmount = trade.amountSource;
                sourceDestinationId = await resolveUserWalletId(trade.userId, sourceCurrency);
                sourceCryptoAddress = await resolveUserCryptoAddress(trade.userId, sourceCurrency);
                reversalType = 'Internal Escrow (Buyer)';

            // Case 2: External Trade - Reverse merchant's asset from escrow back to merchant
            } else if (trade.status === ALLOWED_STATES.PAYMENT_CONFIRMED_BY_BUYER && !internal) {
                sourceCurrency = trade.currencyTarget;
                sourceAmount = trade.amountTarget;
                sourceDestinationId = await resolveUserWalletId(trade.merchantId, sourceCurrency);
                sourceCryptoAddress = await resolveUserCryptoAddress(trade.merchantId, sourceCurrency);
                reversalType = 'External Escrow (Merchant)';
            }

            if (reversalType) {
                // Perform the Master -> Child transfer (Reversal)
                const transferResult = await blockrader.transferFunds(
                    blockrader.BLOCKRADER_MASTER_WALLET_UUID, // Source: Master Wallet UUID
                    sourceDestinationId, // Destination: User UUID (used for routing)
                    sourceAmount,
                    sourceCurrency,
                    sourceCryptoAddress // Pass the required 0x destination address
                );

                // CRITICAL CHECK: Check for successful API response structure (data.id)
                if (!transferResult || !transferResult.data || !transferResult.data.id) {
                    const errorMessage = `${reversalType} reversal failed at provider. Provider response: ${JSON.stringify(transferResult)}`;
                    console.error(errorMessage);
                    throw new TradeError(`Escrow reversal failed at provider for ${reversalType}.`);
                }

                const txId = transferResult.data.id || transferResult.txId || "n/a";
                reversalSuccess = true;

                // Atomic status update to CANCELLED_REVERSED
                return await updateTradeStatusAndLog(
                    trade._id,
                    ALLOWED_STATES.CANCELLED_REVERSED,
                    {
                        message: `${reversalType} reversed (tx:${txId}).`,
                        actor: userId,
                        role: isAdminUser ? 'admin' : 'requester',
                        ip,
                    },
                    trade.status // Expected status is the status it was in before reversal attempt
                );
            }

            // Fallthrough: Generic cancel if no reversal was needed (e.g., status is INIT and external)
            if (!reversalSuccess) {
                return await updateTradeStatusAndLog(
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
            }

        } catch (error) {
            // If reversal fails, we mark the trade as FAILED and log the error.
            await updateTradeStatusAndLog(
                trade._id,
                ALLOWED_STATES.FAILED,
                {
                    message: `Cancellation/Reversal failed: ${error.message}`,
                    actor: 'system',
                    role: 'system',
                    ip,
                }
            );
            throw error; // Re-throw the original error
        }
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