const FeeConfig = require('../models/feeConfigModel');
const FeeHistory = require('../models/feeHistoryModel');


// GETTER: Used to find the fee for a specific pair
async function getFlatFee(type, currency, targetCurrency = null) {
    const query = { type, currency };
    if (type === "P2P" && targetCurrency) {
        query.targetCurrency = targetCurrency.toUpperCase();
    }
    const config = await FeeConfig.findOne(query);
    return config ? config.feeAmount.toString() : "0";
}

// SETTER: Updates or creates a fee
async function updatePlatformFee({ type, currency, targetCurrency, feeAmount, adminId }) {
    const asset = currency.toUpperCase();
    const target = targetCurrency ? targetCurrency.toUpperCase() : null;

    // 1. Find existing to get the oldFee for history
    const existing = await FeeConfig.findOne({ type, currency: asset, targetCurrency: target });

    // 2. Update or Create the config
    const updatedFee = await FeeConfig.findOneAndUpdate(
        { type, currency: asset, targetCurrency: target },
        { $set: { feeAmount: Number(feeAmount), updatedBy: adminId } },
        { upsert: true, new: true }
    );

    // 3. Log to History (This is where your error is likely happening)
    await FeeHistory.create({
        type, 
        currency: asset, 
        targetCurrency: target,
        oldFee: existing ? existing.feeAmount : 0,
        newFee: Number(feeAmount), 
        updatedBy: adminId // <--- DOUBLE CHECK THIS IS NOT UNDEFINED
    });

    return updatedFee;
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


module.exports = { getFlatFee, updatePlatformFee, setPlatformFees };