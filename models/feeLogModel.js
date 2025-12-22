  const mongoose = require("mongoose");

  const FeeLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", required: false },
    type: { type: String, enum: ["DEPOSIT", "WITHDRAWAL", "P2P", "OTHER"], required: true },
    currency: { type: String, required: true },
    grossAmount: { type: Number, required: true }, // original amount user requested or provider reported
    feeAmount: { type: Number, required: true }, // total fee collected
    platformFee: { type: Number, default: 0 },
    networkFee: { type: Number, default: 0 },
    reference: { type: String, default: null },
    metadata: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now }
  });

  module.exports = mongoose.model("FeeLog", FeeLogSchema);
