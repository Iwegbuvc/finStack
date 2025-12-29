const FeeConfig = require('../models/feeConfigModel');
const FeeHistory = require('../models/feeHistoryModel');

/**
 * GETTER: Used by Transaction Handlers to find the fee
 */
async function getFlatFee(type, currency) {
    const config = await FeeConfig.findOne({ type, currency });
    return config ? config.feeAmount.toString() : "0";
}

async function setPlatformFees({ type, usdcFee, cngnFee, adminId }) {

    // 1. Validate action type
    const validTypes = ["DEPOSIT", "WITHDRAWAL", "P2P"];
    if (!validTypes.includes(type)) throw new Error("Invalid fee type");

    if (usdcFee < 0 || cngnFee < 0) {
    throw new Error('Fee cannot be negative');
    }


    const existingFees = await FeeConfig.find({
    currency: { $in: ['USDC', 'CNGN'] }
    }).lean();


    const existingMap = Object.fromEntries(
    existingFees.map(f => [f.currency, f.feeAmount])
     );


    const ops = [
    {
    updateOne: {
    filter: { type: type, currency: 'USDC' },
    update: { $set: { feeAmount: usdcFee, updatedBy: adminId } },
    upsert: true
   }
   },
   {
   updateOne: {
   filter: { type: type, currency: 'CNGN' },
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
if (existingMap.CNGN !== cngnFee) {
history.push({ currency: 'CNGN', oldFee: existingMap.CNGN ?? 0, newFee: cngnFee, updatedBy: adminId });
}


if (history.length) {
await FeeHistory.insertMany(history);
}


return { message: 'Platform fees updated successfully' };
}


module.exports = { getFlatFee, setPlatformFees };