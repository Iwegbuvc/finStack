const mongoose = require('mongoose');

const FeeConfigSchema = new mongoose.Schema({
    type: { type: String, enum: ["DEPOSIT", "WITHDRAWAL", "P2P"], required: true },
    currency: {
        type: String,
        enum: ["USDC", "CNGN"],
        uppercase: true,   // 👈 KEY FIX
        trim: true
        // unique: true,
        // required: true
    },
    targetCurrency: { type: String, enum: ['RMB', 'XOF', 'XAF', 'DHS', 'USD', 'GHS'], uppercase: true },
    feeAmount: { type: Number, default: 0 },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });
// NEW INDEX: Allows unique fees per pair (e.g., CNGN/RMB vs CNGN/GHS)
FeeConfigSchema.index({ type: 1, currency: 1, targetCurrency: 1 }, { unique: true });

module.exports = mongoose.model('FeeConfig', FeeConfigSchema);
