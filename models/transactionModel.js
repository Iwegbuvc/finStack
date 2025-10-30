// // const mongoose = require("mongoose");

// // const transactionSchema = new mongoose.Schema({
// //   walletId: {
// //     type: mongoose.Schema.Types.ObjectId,
// //     ref: "Wallet",
// //     required: true,
// //   },
// //   userId: {
// //     type: mongoose.Schema.Types.ObjectId,
// //     ref: "User",
// //     required: true,
// //   },
// //   type: {
// //     type: String,
// //     enum: ["DEPOSIT", "WITHDRAWAL", "TRANSFER", "P2P"],
// //     required: true,
// //   },
// //   amount: { type: Number, required: true },
// //   status: {
// //     type: String,
// //     enum: ["COMPLETED", "FAILED", "PENDING", "REFUNDED", "CANCELLED"],
// //     default: "COMPLETED",
// //   },
// //   currency: { type: String, enum: ["NGN", "USD"], required: true },
// //   reference: {
// //     type: String,
// //     unique: true,
// //   },
// //   description: String,
// //    metadata: {
// //     type: Object,
// //   },
// // }, { timestamps: true });

// // module.exports = mongoose.model("Transaction", transactionSchema);
// const mongoose = require("mongoose");

// const transactionSchema = new mongoose.Schema(
//   {
//     walletId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Wallet",
//       required: true,
//     },
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     type: {
//       type: String,
//       enum: ["DEPOSIT", "WITHDRAWAL", "TRANSFER_IN", "TRANSFER_OUT"],
//       required: true,
//     },
//     amount: {
//       type: Number,
//       required: true,
//       min: 0,
//     },
//     currency: {
//       type: String,
//       required: true,
//       default: "NGN",
//     },
//     status: {
//       type: String,
//       enum: ["PENDING", "COMPLETED", "FAILED"],
//       default: "COMPLETED",
//     },
//     reference: {
//       type: String,
//       unique: true,
//       required: true,
//     },
//     metadata: {
//       type: Object,
//       default: {},
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Transaction", transactionSchema);
const mongoose = require("mongoose");
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
