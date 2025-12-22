// const mongoose = require("mongoose");
// const Wallet = require("../models/walletModel");
// const Transaction = require("../models/transactionModel");
// const FeeLog = require("../models/feeLogModel");
// const Decimal = require("decimal.js");
// const withdrawFundsService = require("./withdrawFundsService"); // IMPORTANT

// const WITHDRAWAL_FEE_PERCENT = Number(process.env.WITHDRAWAL_FEE_PERCENT || 2) / 100;

// // async function createWithdrawalRequest({ userId, currency, amount, externalAddress, idempotencyKey }) {

// //   if (!userId) throw new Error("userId required");
// //   if (!amount || amount <= 0) throw new Error("Invalid amount");
// //   if (!externalAddress) throw new Error("externalAddress required");

// //   // Idempotency: return existing transaction if it exists
// //   const existingTx = await Transaction.findOne({ reference: idempotencyKey });
// //   if (existingTx) {
// //     return { transaction: existingTx, alreadyExists: true, providerResult: existingTx.metadata?.providerResponse || null };
// //   }
// //   const wallet = await Wallet.findOne({ user_id: userId, currency, status: "ACTIVE" });
// //   if (!wallet) throw new Error("User wallet not found");

// // //   const feeAmount = Number((amount * WITHDRAWAL_FEE_PERCENT).toFixed(8));
// // //   const totalDeduct = Number((amount + feeAmount).toFixed(8));
// //   // Use Decimal for math
// //   const amt = new Decimal(amount);
// //   const feeAmount = amt.mul(WITHDRAWAL_FEE_PERCENT).toDecimalPlaces(8); // keep 8 decimals
// //   const totalDeduct = amt.plus(feeAmount).toDecimalPlaces(8);

// //  const walletBalance = new Decimal(wallet.balance || 0);
// //   if (walletBalance.lt(totalDeduct)) {
// //     throw new Error("Insufficient balance for withdrawal including fee");
// //   }

// //   const session = await mongoose.startSession();
// //   session.startTransaction();

// //   try {
// //     // Deduct total (amount + fee)
// //     await Wallet.updateOne(
// //       { _id: wallet._id },
// //       { $inc: { balance: -totalDeduct } },
// //       { session }
// //     );

// //     const txDocs = await Transaction.create(
// //       [
// //         {
// //           walletId: wallet._id,
// //           userId,
// //           type: "WITHDRAWAL",
// //           amount,
// //           currency,
// //           status: "PENDING",
// //           reference: idempotencyKey,
// //           metadata: { destination: externalAddress },
// //           feeDetails: {
// //             totalFee: feeAmount,
// //             currency,
// //             platformFee: feeAmount,
// //             networkFee: 0,
// //             isDeductedFromAmount: true,
// //           },
// //         },
// //       ],
// //       { session }
// //     );

// //     const tx = txDocs[0];

// //     // Store fee log
// //     await FeeLog.create(
// //       [
// //         {
// //           userId,
// //           transactionId: tx._id,
// //           type: "WITHDRAWAL",
// //           currency,
// //           grossAmount: amount,
// //           feeAmount,
// //           platformFee: feeAmount,
// //           networkFee: 0,
// //           reference: idempotencyKey,
// //           metadata: { destination: externalAddress },
// //         },
// //       ],
// //       { session }
// //     );

// //     await session.commitTransaction();
// //     session.endSession();

// //     // CALL YOUR PROVIDER SERVICE HERE
// //     const providerResult = await withdrawFundsService(
// //       wallet.accountNumber,   // the correct field from YOUR wallet model
// //       externalAddress,
// //       amount,                 // send only requested amount (fee already deducted)
// //       "Wallet withdrawal"
// //     );

// //     await Transaction.findByIdAndUpdate(tx._id, {
// //       $set: { "metadata.providerResponse": providerResult },
// //     });

// //     return { transaction: tx, providerResult };
// //   } catch (err) {
// //     await session.abortTransaction();
// //     session.endSession();
// //     throw err;
// //   }
// // }

// // module.exports = { createWithdrawalRequest };
// async function createWithdrawalRequest({ userId, currency, amount, externalAddress, idempotencyKey }) {
//   if (!userId) throw new Error("userId required");
//   if (!amount || new Decimal(amount).lte(0)) throw new Error("Invalid amount");
//   if (!externalAddress) throw new Error("externalAddress required");
//   if (!idempotencyKey) throw new Error("idempotencyKey required");

//   // Idempotency: return existing transaction if it exists
//   const existingTx = await Transaction.findOne({ reference: idempotencyKey });
//   if (existingTx) {
//     return { transaction: existingTx, alreadyExists: true, providerResult: existingTx.metadata?.providerResponse || null };
//   }

//   // Load wallet
//   const wallet = await Wallet.findOne({ user_id: userId, currency, status: "ACTIVE" });
//   if (!wallet) throw new Error("User wallet not found");

//   // Use Decimal for math
//   const amt = new Decimal(amount);
//   const feeAmount = amt.mul(WITHDRAWAL_FEE_PERCENT).toDecimalPlaces(8); // keep 8 decimals
//   const totalDeduct = amt.plus(feeAmount).toDecimalPlaces(8);

//   // Balance check (wallet.balance is expected to be a Number; if string adjust accordingly)
//   const walletBalance = new Decimal(wallet.balance || 0);
//   if (walletBalance.lt(totalDeduct)) {
//     throw new Error("Insufficient balance for withdrawal including fee");
//   }

//   // DB transaction (atomic)
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     // Deduct amount + fee from wallet
//     const decTotal = Number(totalDeduct.toString());
//     await Wallet.updateOne({ _id: wallet._id }, { $inc: { balance: -decTotal } }, { session });

//     // Create Transaction (PENDING)
//     const txDocs = await Transaction.create(
//       [
//         {
//           walletId: wallet._id,
//           userId,
//           type: "WITHDRAWAL",
//           amount: Number(amt.toString()), // gross amount user requested
//           currency,
//           status: "PENDING",
//           reference: idempotencyKey,
//           metadata: { destination: externalAddress },
//           feeDetails: {
//             totalFee: Number(feeAmount.toString()),
//             currency,
//             platformFee: Number(feeAmount.toString()),
//             networkFee: 0,
//             isDeductedFromAmount: true
//           }
//         }
//       ],
//       { session }
//     );

//     const tx = txDocs[0];

//     // Create FeeLog
//     await FeeLog.create(
//       [
//         {
//           userId,
//           transactionId: tx._id,
//           type: "WITHDRAWAL",
//           currency,
//           grossAmount: Number(amt.toString()),
//           feeAmount: Number(feeAmount.toString()),
//           platformFee: Number(feeAmount.toString()),
//           networkFee: 0,
//           reference: idempotencyKey,
//           metadata: { destination: externalAddress }
//         }
//       ],
//       { session }
//     );

//     await session.commitTransaction();
//     session.endSession();

//     // Call provider wrapper to perform external withdrawal of ONLY the requested amount
//     // (withdrawFundsService returns { success, reference, provider, ... } in your existing implementation)
//     const accountField = wallet.accountNumber || wallet.externalWalletId;

//    const providerResult = await withdrawFundsService(
//   accountField,
//   externalAddress,
//   Number(amt.toString()),
//   "Wallet withdrawal"
// );


//     // Save provider response to transaction metadata (non-atomic)
//     try {
//       await Transaction.findByIdAndUpdate(tx._id, { $set: { "metadata.providerResponse": providerResult } });
//     } catch (err) {
//       // Non-fatal: transaction exists and wallet was deducted; provider called. Log if needed.
//       console.error("Warning: failed to attach providerResponse to transaction:", err.message);
//     }

//     return { transaction: tx, providerResult };
//   } catch (err) {
//     await session.abortTransaction();
//     session.endSession();
//     throw err;
//   }
// }

// module.exports = { createWithdrawalRequest };
const mongoose = require("mongoose");
const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");
const FeeLog = require("../models/feeLogModel");
const Decimal = require("decimal.js");

// 1. IMPORT PAYCREST UTILITIES (Assumes fetchRate.js and createOrder.js are in the same folder)
const fetchPaycrestRate = require("./paycrest/fetchRate");
const createPaycrestOrder = require("./paycrest/createOrder");

// --- GLOBAL CONSTANTS --- (Must be defined or imported from config)
const WITHDRAWAL_FEE_PERCENT = Number(process.env.WITHDRAWAL_FEE_PERCENT || 0.02); // 2% fee example
const FIAT_CURRENCY = process.env.PAYCREST_FIAT_CURRENCY || "NGN"; 
const CRYPTO_NETWORK = process.env.PAYCREST_CRYPTO_NETWORK || "POLYGON"; 

/**
 * Creates a Paycrest withdrawal order (off-chain commitment) and deducts funds atomically.
 * @param {string} userId - ID of the user.
 * @param {string} currency - The token (e.g., "USDC").
 * @param {number} amount - The gross crypto amount to deduct (user requested amount).
 * @param {string} externalAddress - The recipient's fiat account identifier (e.g., account number).
 * @param {string} institutionCode - The recipient's bank/institution code.
 * @param {string} accountName - The recipient's account name.
 * @param {string} idempotencyKey - Unique reference to prevent double processing.
 * @returns {Promise<Object>} Object containing the created transaction and Paycrest transfer details.
 */
async function createWithdrawalRequest({ 
    userId, 
    currency, 
    amount, 
    externalAddress, 
    idempotencyKey, 
    institutionCode, 
    accountName 
}) {
  
  if (!userId || !amount || new Decimal(amount).lte(0) || !externalAddress || !idempotencyKey || !institutionCode || !accountName) {
    throw new Error("All required withdrawal and recipient details must be provided.");
  }

  // --- Idempotency Check ---
  const existingTx = await Transaction.findOne({ reference: idempotencyKey });
  if (existingTx) {
    return { 
      transaction: existingTx, 
      alreadyExists: true, 
      paycrestOrderId: existingTx.metadata?.paycrestOrderId,
      paycrestReceiveAddress: existingTx.metadata?.paycrestReceiveAddress,
      cryptoAmountToSend: existingTx.amount 
    };
  }

  const wallet = await Wallet.findOne({ user_id: userId, currency, status: "ACTIVE" });
  if (!wallet) throw new Error("User wallet not found");

  // --- Fee Calculation and Balance Check ---
  const amt = new Decimal(amount);
  const feeAmount = amt.mul(WITHDRAWAL_FEE_PERCENT).toDecimalPlaces(8);
  const totalDeduct = amt.plus(feeAmount).toDecimalPlaces(8);

  const walletBalance = new Decimal(wallet.balance || 0);
  if (walletBalance.lt(totalDeduct)) {
    throw new Error("Insufficient balance for withdrawal including fee");
  }

  // --- PAYCREST STEP 1: Get Rate ---
  const rateData = await fetchPaycrestRate({
      token: currency, 
      amount: amt.toNumber(),
      currency: FIAT_CURRENCY,
      network: CRYPTO_NETWORK
  });

  // --- PAYCREST STEP 2: Create Order ---
  const recipient = {
      institution: institutionCode,
      accountIdentifier: externalAddress, 
      accountName: accountName,
      currency: FIAT_CURRENCY
  };

  const orderPayload = {
      amount: amt.toNumber(), 
      token: currency,
      rate: rateData.rate, 
      recipient: recipient,
      returnAddress: process.env.PAYCREST_REFUND_ADDRESS, 
      network: CRYPTO_NETWORK,
      reference: idempotencyKey, 
  };

  const paycrestOrder = await createPaycrestOrder(orderPayload);
  const { id: paycrestOrderId, receiveAddress } = paycrestOrder;

  // --- BEGIN ATOMIC DATABASE TRANSACTION (Critical Section) ---
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const decTotal = Number(totalDeduct.toString());
    await Wallet.updateOne({ _id: wallet._id }, { $inc: { balance: -decTotal } }, { session });

    const txDocs = await Transaction.create(
      [
        {
          walletId: wallet._id,
          userId,
          type: "WITHDRAWAL",
          amount: Number(amt.toString()), 
          currency,
          status: "PENDING_CRYPTO_TRANSFER", // Funds are locked, awaiting on-chain proof
          reference: idempotencyKey,
          metadata: { 
            destination: externalAddress,
            provider: "Paycrest",
            paycrestOrderId, 
            paycrestReceiveAddress: receiveAddress, 
            orderRate: rateData.rate,
            recipient: recipient,
          },
          feeDetails: {
            totalFee: Number(feeAmount.toString()),
            currency,
            platformFee: Number(feeAmount.toString()),
            networkFee: 0,
            isDeductedFromAmount: true
          }
        }
      ],
      { session }
    );
    
    const tx = txDocs[0];

    await FeeLog.create(
      [
        {
          userId,
          transactionId: tx._id,
          type: "WITHDRAWAL",
          currency,
          grossAmount: Number(amt.toString()),
          feeAmount: Number(feeAmount.toString()),
          platformFee: Number(feeAmount.toString()),
          networkFee: 0,
          reference: idempotencyKey,
          metadata: { destination: externalAddress }
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return { 
      transaction: tx, 
      paycrestOrderId, 
      paycrestReceiveAddress: receiveAddress, 
      cryptoAmountToSend: amt.toNumber() 
    };

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

module.exports = { createWithdrawalRequest };