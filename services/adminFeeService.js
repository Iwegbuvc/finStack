const FeeConfig = require('../models/feeConfigModel');
const FeeHistory = require('../models/feeHistoryModel');

async function setPlatformFees({ usdcFee, cngnFee, adminId }) {
if (usdcFee < 0 || cngnFee < 0) {
throw new Error('Fee cannot be negative');
}


const existingFees = await FeeConfig.find({
currency: { $in: ['USDC', 'cNGN'] }
}).lean();


const existingMap = Object.fromEntries(
existingFees.map(f => [f.currency, f.feeAmount])
);


const ops = [
{
updateOne: {
filter: { currency: 'USDC' },
update: { $set: { feeAmount: usdcFee, updatedBy: adminId } },
upsert: true
}
},
{
updateOne: {
filter: { currency: 'cNGN' },
update: { $set: { feeAmount: cngnFee, updatedBy: adminId } },
upsert: true
}
}
];


await FeeConfig.bulkWrite(ops);


const history = [];
if (existingMap.USDC !== usdcFee) {
history.push({ currency: 'USDC', oldFee: existingMap.USDC ?? 0, newFee: usdcFee, updatedBy: adminId });
}
if (existingMap.cNGN !== cngnFee) {
history.push({ currency: 'cNGN', oldFee: existingMap.cNGN ?? 0, newFee: cngnFee, updatedBy: adminId });
}


if (history.length) {
await FeeHistory.insertMany(history);
}


return { message: 'Platform fees updated successfully' };
}


module.exports = { setPlatformFees };