const mongoose = require('mongoose');

const FeeConfigSchema = new mongoose.Schema({
    currency: {
        type: String,
        enum: ['USD', 'NGN', 'GHS', 'RMB', 'XOF', 'XAF', "USDC", "cNGN"],
        unique: true,
        required: true
    },
    flatFee: {
  type: Number,
  required: true,
  min: 0
},
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('FeeConfig', FeeConfigSchema);
