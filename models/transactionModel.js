
const mongoose = require("mongoose");


const FeeDetailsSchema = new mongoose.Schema(
  {
    totalFee: { type: Number, default: 0 },
    currency: { type: String }, // e.g., "USDC", "CNGN"
    platformFee: { type: Number, default: 0 },
    networkFee: { type: Number, default: 0 },
    providerFeeTxnId: { type: String, default: null },
    isDeductedFromAmount: { type: Boolean, default: true }
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["DEPOSIT", "WITHDRAWAL", "TRANSFER_IN", "TRANSFER_OUT"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true, // e.g. "ETH", "BTC", "USDT"
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "COMPLETED",
    },
    reference: {
      type: String,
      unique: true,
      required: true,
    },
    txHash: {
      type: String, // on-chain transaction ID
      unique: true,
      sparse: true, // allows null but enforces uniqueness when set
    },
    network: {
      type: String, // e.g. "Ethereum", "Polygon", "BSC"
    },
    blockradarWalletId: {
      type: String, // to map which Blockradar wallet it came from
    },
    metadata: {
      type: Object,
      default: {},
    },
      feeDetails: {
      type: FeeDetailsSchema,
      default: () => ({
        
      }),
    },
  },
  { timestamps: true }
);
transactionSchema.index({ userId: 1 });
transactionSchema.index({ walletId: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
