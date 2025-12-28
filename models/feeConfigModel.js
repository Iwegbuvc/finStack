const mongoose = require('mongoose');

const FeeConfigSchema = new mongoose.Schema({
    type: { type: String, enum: ["DEPOSIT", "WITHDRAWAL", "P2P"], required: true },
    currency: {
        type: String,
        enum: ['USD', 'NGN', 'GHS', 'RMB', 'XOF', 'XAF', "USDC", "CNGN"],
        uppercase: true,   // 👈 KEY FIX
        trim: true
        // unique: true,
        // required: true
    },
    feeAmount: { type: Number, default: 0 },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// ADD THIS: Ensures one unique fee per type per currency
FeeConfigSchema.index({ type: 1, currency: 1 }, { unique: true });

module.exports = mongoose.model('FeeConfig', FeeConfigSchema);
