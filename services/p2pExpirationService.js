const P2PTrade = require('../models/p2pModel');
const MerchantAd = require('../models/merchantModel');
const { updateTradeStatusAndLogSafe } = require('../utilities/tradeUpdater');

const cancelExpiredTrades = async () => {
    const now = new Date();

    // Find all expired trades still waiting for payment
    const expiredTrades = await P2PTrade.find({
        status: "PENDING_PAYMENT",
        expiresAt: { $lt: now }
    });

    for (const trade of expiredTrades) {
        try {
            // 1️⃣ Cancel the trade + add log entry
            await updateTradeStatusAndLogSafe(
                trade._id,
                "CANCELLED",
                {
                    message: "Trade expired after time limit.",
                    actor: null,
                    role: "system"
                },
                trade.status
            );

            // 2️⃣ Restore liquidity back to the merchant ad ATOMICALLY.
            // Using findByIdAndUpdate with $inc prevents race conditions on the availableAmount.
            const adRestoreUpdate = await MerchantAd.findByIdAndUpdate(
                trade.merchantAdId,
                // ATOMICALLY add the reserved amount back
                { $inc: { availableAmount: trade.amountSource } },
                { new: true } // Return the updated document
            ).lean();

            if (!adRestoreUpdate) {
                console.log(`❌ Failed to find or restore liquidity for Ad ${trade.merchantAdId} (Trade ${trade.reference})`);
                continue;
            }

            console.log("✅ Found Ad:", adRestoreUpdate._id, "current available:", adRestoreUpdate.availableAmount);

            // 3️⃣ Conditionally set ad status to ACTIVE if it was INACTIVE and now has funds.
            // Use updateOne with a query to prevent race conditions on the status field.
            if (adRestoreUpdate.availableAmount > 0 && adRestoreUpdate.status === "INACTIVE") {
                await MerchantAd.updateOne(
                    { _id: trade.merchantAdId, status: "INACTIVE" }, 
                    { $set: { status: "ACTIVE" } }
                );
            }

            console.log(`Trade ${trade.reference} cancelled due to expiration.`);

        } catch (err) {
            console.error("Expiration error:", err);
        }
    }
};

module.exports = {
    cancelExpiredTrades,
};