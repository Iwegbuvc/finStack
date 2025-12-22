// utilities/logTransaction.js
const Transaction = require("../models/transactionModel");

/**
 * Logs a transaction with optional fee details.
 * @param {Object} params
 * @param {mongoose.ObjectId} params.walletId
 * @param {mongoose.ObjectId} params.userId
 * @param {string} params.type - "DEPOSIT", "WITHDRAWAL", etc.
 * @param {number} params.amount
 * @param {string} params.currency
 * @param {string} [params.status="PENDING"]
 * @param {string} params.reference
 * @param {Object} [params.metadata={}]
 * @param {Object} [params.feeDetails={}] - structured fee info
 * @returns {Promise<Transaction>} the created transaction document
 */
async function logTransaction({ walletId, userId, type, amount, currency, status = "PENDING", reference, metadata = {}, feeDetails = {} }) {
  const tx = await Transaction.create({
    walletId,
    userId,
    type,
    amount,
    currency,
    status,
    reference,
    metadata,
    feeDetails
  });
  return tx;
}

module.exports = { logTransaction };
