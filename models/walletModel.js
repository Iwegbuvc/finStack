// const mongoose = require('mongoose');

// const walletSchema = new mongoose.Schema({
//   user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
//   balance: { type: Number, default: 0 },
//   currency: { type: String, enum: ["NGN", "USD", "ETH"], required: true },
//   externalWalletId: { type: String, unique: true }, // Blockradar wallet UUID
//   accountNumber: { type: String, unique: true },    // Blockchain wallet address
//   accountName: { type: String },
//   status: { type: String, enum: ["ACTIVE", "FROZEN"], default: "ACTIVE" }
// }, { timestamps: true });

// const Wallet = mongoose.model('Wallet', walletSchema);

// module.exports = Wallet;

// LAST UPDATE FOR AUDIT 
const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    // User ID is no longer required, allowing for system-managed wallets.
    // 'unique: true' combined with 'sparse: true' ensures a user can only have one wallet document, 
    // but multiple system wallets (where user_id is null) are allowed.
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: false, // <-- CHANGED: Now optional
        unique: true, 
        sparse: true // Ensures the unique index only applies when user_id is present
    },
    // New field to clearly define the purpose of the wallet for auditing and reconciliation.
    walletType: {
        type: String,
        enum: ["USER", "SYSTEM", "ESCROW"],
        default: "USER",
        required: true
    },
    balance: { type: Number, default: 0 },
    currency: { type: String, enum: ["NGN", "USD", "ETH"], required: true },
    externalWalletId: { type: String, unique: true }, // Blockradar wallet UUID
    accountNumber: { type: String, unique: true },    // Blockchain wallet address (e.g., 0x...)
    accountName: { type: String },
    status: { type: String, enum: ["ACTIVE", "FROZEN"], default: "ACTIVE" }
}, { timestamps: true });

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
