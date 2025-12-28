// Every time an administrator changes a fee
const mongoose = require('mongoose');

const FeeHistorySchema = new mongoose.Schema({
currency: {
type: String,
enum: ["USD", "NGN", "GHS", "RMB", "XOF", "XAF","USDC", "cNGN"],
required: true
},
oldFee: { type: Number, required: true },
newFee: { type: Number, required: true },
updatedBy: {
type: mongoose.Schema.Types.ObjectId,
ref: 'User',
required: true
}
}, { timestamps: true });


module.exports = mongoose.model('FeeHistory', FeeHistorySchema);