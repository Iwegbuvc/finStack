const mongoose = require("mongoose");

const UserBankAccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  bankName: { type: String, required: true },
  bankCode: { type: String }, // Essential for automated payouts later
  accountNumber: { type: String, required: true },
  accountName: { type: String, required: true },
  isPrimary: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null } // Soft delete
}, { timestamps: true });

module.exports = mongoose.model("UserBankAccount", UserBankAccountSchema);