// // LAST UPDATE FOR AUDIT 
// const mongoose = require('mongoose');

// const walletSchema = new mongoose.Schema({
//     // User ID is no longer required, allowing for system-managed wallets.
//     // 'unique: true' combined with 'sparse: true' ensures a user can only have one wallet document, 
//     // but multiple system wallets (where user_id is null) are allowed.
//     user_id: { 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: 'User', 
//         required: false, // <-- CHANGED: Now optional
//         unique: true, 
//         sparse: true // Ensures the unique index only applies when user_id is present
//     },
//     // New field to clearly define the purpose of the wallet for auditing and reconciliation.
//     walletType: {
//         type: String,
//         enum: ["USER", "SYSTEM", "ESCROW"],
//         default: "USER",
//         required: true
//     },
//     balance: { type: Number, default: 0 },
//     currency: { type: String, enum: ["NGN", "USD", "ETH"], required: true },
//     externalWalletId: { type: String, unique: true }, // Blockradar wallet UUID
//     accountNumber: { type: String, unique: true },    // Blockchain wallet address (e.g., 0x...)
//     accountName: { type: String },
//     status: { type: String, enum: ["ACTIVE", "FROZEN"], default: "ACTIVE" }
// }, { timestamps: true });

// const Wallet = mongoose.model('Wallet', walletSchema);

// // module.exports = Wallet;
// const mongoose = require('mongoose');

// const walletSchema = new mongoose.Schema({
//     // user_id no longer has a single unique constraint
//     user_id: { 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: 'User', 
//         required: false, 
//         // The unique constraint is moved to a compound index below.
//         sparse: true 
//     },
//     // New field to clearly define the purpose of the wallet for auditing and reconciliation.
//     walletType: {
//         type: String,
//         enum: ["USER", "SYSTEM", "ESCROW"],
//         default: "USER",
//         required: true
//     },
//     balance: { type: Number, default: 0 },
//     currency: { type: String, enum: ["NGN", "USD",], required: true },
//     externalWalletId: { type: String, unique: true, sparse: true }, // Blockradar wallet UUID
//     accountNumber: { type: String, unique: true, sparse: true },    // 9PSB Account Number or Blockchain address
//     accountName: { type: String },
//     provider: { type: String, enum: ["9PSB", "BLOCKRADAR", "INTERNAL"] }, // Added provider field
//     status: { type: String, enum: ["ACTIVE", "FROZEN"], default: "ACTIVE" }
// }, { timestamps: true });

// // CRITICAL FIX: Add a compound unique index on user_id and currency.
// // This allows one user to have one NGN wallet, one USD wallet, etc., but not two NGN wallets.
// walletSchema.index({ user_id: 1, currency: 1 }, { unique: true, sparse: true });

// const Wallet = mongoose.model('Wallet', walletSchema);

// module.exports = Wallet;

// UPDATING ISSUE
const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({

    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, 
        // The unique constraint is moved to a compound index below.
        sparse: true 
    },
    // New field to clearly define the purpose of the wallet for auditing and reconciliation.
    walletType: { type: String, enum: ["USER", "SYSTEM", "ESCROW"], default: "USER", required: true},

    lastDepositReference: {  type: String,  index: true, unique: true, // IMPORTANT: Ensure uniqueness to guarantee no double-credit
        sparse: true // Only apply the unique constraint if the field is present
    },

    balance: { type: Number, default: 0 },
    currency: { type: String, enum: ["NGN", "cNGN", "USDC",], required: true },
    externalWalletId: { type: String, sparse: true }, // Blockradar wallet UUID
walletAddress: { type: String, sparse: true },    // Blockchain wallet address (e.g., 0x...)
    accountNumber: { type: String, sparse: true }, 
    accountName: { type: String },
    provider: { type: String, enum: ["BLOCKRADAR", "INTERNAL"] }, // Added provider field
    status: { type: String, enum: ["ACTIVE", "FROZEN"], default: "ACTIVE" }
}, { timestamps: true });

// CRITICAL FIX: Add a compound unique index on user_id and currency.
// This allows one user to have one NGN wallet, one USD wallet, etc., but not two NGN wallets.
walletSchema.index({ user_id: 1, currency: 1 }, { unique: true, sparse: true });

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
