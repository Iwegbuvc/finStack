// const mongoose = require('mongoose');

// const P2PTradeSchema = new mongoose.Schema({
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//     merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//     merchantAdId: { type: mongoose.Schema.Types.ObjectId, ref: 'MerchantAd', required: true, index: true },

//     reference: { type: String, unique: true, required: true },

//     amountSource: { type: Number, required: true }, // fiat
//     amountTarget: { type: Number, required: true }, // crypto to buyer
//     feePercentage: { type: Number, required: true },
//     feeAmount: { type: Number, required: true, min: 0 },

//     buyerReceives: { type: Number, required: true },

//     provider: {
//         type: String,
//         enum: ["BLOCKRADAR"],
//         required: true,
//     },

//     rate: { type: Number, required: true },

//     currencySource: {
//         type: String,
//         enum: ["NGN", "cNGN", "USDC", "GHS", "XAF", "XOF", "RMB"],
//         required: true
//     },

//     currencyTarget: {
//         type: String,
//         enum: ["cNGN", "USDC"],
//         required: true
//     },

//     transactionType: { type: String, default: "P2P" },

//     status: {
//         type: String,
//         enum: [
//             'PENDING_PAYMENT',
//             'PAYMENT_CONFIRMED_BY_BUYER',
//             'COMPLETED',
//             'FAILED',
//             'CANCELLED',
//             'CANCELLED_REVERSED',
//         ],
//         default: 'PENDING_PAYMENT',
//     },

//     expiresAt: { type: Date, required: true },

//     metadata: Object,

//     logs: [{
//         message: String,
//         actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//         role: String,
//         ip: String,
//         time: { type: Date, default: Date.now }
//     }]
// }, { timestamps: true });

// module.exports = mongoose.model('P2PTrade', P2PTradeSchema);
const mongoose = require("mongoose");

const P2PTradeSchema = new mongoose.Schema(
  {
    // =====================
    // ACTORS
    // =====================
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    merchantAdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MerchantAd",
      required: true,
      index: true,
    },

    // =====================
    // IDENTIFIERS
    // =====================
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // =====================
    // TRADE DIRECTION
    // BUY  → User buys crypto
    // SELL → User sells crypto
    // =====================
    side: {
      type: String,
      enum: ["BUY", "SELL"],
      required: true,
      index: true,
    },

    // =====================
    // LOCKED AMOUNTS
    // =====================
    amountFiat: {
      type: Number,
      required: true,
      min: 0,
    },

    amountCrypto: {
      type: Number, // GROSS escrowed
      required: true,
      min: 0,
    },

    platformFeeCrypto: {
      type: Number,
      required: true,
      min: 0,
    },

    netCryptoAmount: {
      type: Number, // Sent at settlement
      required: true,
      min: 0,
    },

    // =====================
    // PRICING SNAPSHOT
    // =====================
    marketRate: {
      type: Number,
      required: true,
    },

    listingRate: {
      type: Number,
      required: true,
    },

    // =====================
    // CURRENCIES
    // =====================
    currencySource: {
      type: String,
      enum: ["NGN", "cNGN", "USDC", "GHS", "XAF", "XOF", "RMB", "USD"],
      required: true,
    },

    currencyTarget: {
      type: String,
      enum: ["USDC", "cNGN", "CNGN"],
      required: true,
    },

    // =====================
    // PROVIDER
    // =====================
    provider: {
      type: String,
      enum: ["BLOCKRADAR"],
      required: true,
    },

    // =====================
    // STATE MACHINE
    // =====================
    status: {
      type: String,
      enum: [
        "PENDING_PAYMENT",
        "PAYMENT_CONFIRMED_BY_BUYER",
        "COMPLETED",
        "CANCELLED",
        "CANCELLED_REVERSED",
        "FAILED",
      ],
      default: "INIT",
      index: true,
    },

    // =====================
    // TIME CONTROL
    // =====================
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    // =====================
    // OPTIONAL METADATA
    // =====================
    metadata: {
      type: Object,
      default: {},
    },

    // =====================
    // AUDIT LOGS
    // =====================
    logs: [
      {
        message: String,
        actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: String,
        ip: String,
        time: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Helpful compound indexes
P2PTradeSchema.index({ merchantId: 1, status: 1 });
P2PTradeSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("P2PTrade", P2PTradeSchema);
