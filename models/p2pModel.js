const mongoose = require('mongoose');

const P2PTradeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reference: { type: String, unique: true, required: true },
    amountSource: { type: Number, required: true },
    amountTarget: { type: Number, required: true },
    provider: {type: String, enum: ["BLOCKRADER"],required: true,},
    rate: { type: Number, required: true },
    currencySource: { type: String, enum: ["cNGN", "USDC", "GHS", "XAF", "XOF", "RMB"], required: true },
    currencyTarget: { type: String, enum: ["cNGN", "USDC"], required: true },
    transactionType: {  type: String,  default: "P2P",  },
   status: {type: String, enum: ['PENDING_PAYMENT','ESCROWED_AWAITING_MERCHANT_TRANSFER','PAYMENT_CONFIRMED_BY_BUYER','COMPLETED','FAILED','CANCELLED','CANCELLED_REVERSED',], default: 'PENDING_PAYMENT',},
    metadata: Object,
logs: [
  {
    message: String,
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: String,
    ip: String,
    time: { type: Date, default: Date.now }
  }
]
}, { timestamps: true })

const P2PTrade = new mongoose.model('P2PTrade', P2PTradeSchema);

module.exports = P2PTrade;