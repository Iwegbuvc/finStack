const Transaction = require("../models/transactionModel");

const logTransaction = async ({
  userId,
  walletId,
  type,
  amount,
  currency,
  status,
  reference,
  metadata = {},
}) => {
  const transaction = new Transaction({
    userId,
    walletId,
    type,
    amount,
    currency,
    status,
    reference,
    metadata,
  });

  await transaction.save();
  console.log(`🧾 Transaction ${reference} saved to DB.`);
};

module.exports = { logTransaction };
