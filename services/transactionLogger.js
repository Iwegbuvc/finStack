// services/transactionLogger.js
const Transaction = require("../models/transactionModel");
const logger = require("../utilities/logger");


//  Logs a transaction without modifying balances

const logTransaction = async (data) => {
  try {
    const {
      userId,
      walletId,
      type,
      amount,
      currency,
      status = "PENDING",
      reference,
      metadata = {},
    } = data;

    if (!userId || !walletId || !type || !amount || !currency) {
      throw new Error("Missing required transaction fields");
    }

    const transaction = await Transaction.create({
      userId,
      walletId,
      type,
      amount,
      currency,
      status,
      reference: reference || `TXN-${Date.now()}`,
      metadata,
    });

    logger.info(
      `✅ Logged ${type} of ${currency}${amount} for user ${userId} → ${status}`
    );

    return transaction;
  } catch (error) {
    logger.error(`❌ Failed to log transaction: ${error.message}`);
    throw error;
  }
};

module.exports = { logTransaction };
