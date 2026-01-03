const mongoose = require("mongoose");
const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");
const FeeLog = require("../models/feeLogModel");
const Decimal = require("decimal.js");
const { getFlatFee } = require("./adminFeeService");


async function handleDepositConfirmed(webhookPayload = {}) {
  if (webhookPayload.event !== "deposit.success") {
    return null;
  }

  const data = webhookPayload.data || {};
  const {
    amountPaid,
    currency = "USDC",
    senderAddress,
    recipientAddress,
    reference,
    metadata,
  } = data;

  // -------------------------------
  // 1. Validate payload
  // -------------------------------
 if (!amountPaid || !reference) {
  console.warn("⚠️ Invalid Blockradar deposit payload", data);
  return null;
}

  const userId = metadata.user_id;

  // Normalize currency (important)
  const normalizedCurrency =
    currency === "USD" ? "USDC" : currency.toUpperCase();

  // -------------------------------
  // 2. Idempotency check (OUTSIDE transaction)
  // -------------------------------

  const existingTx = await Transaction.findOne({
  reference,
  source: "BLOCKRADAR",
});

  if (existingTx) {
    console.info(`🔁 Duplicate deposit ignored: ${reference}`);
    return existingTx;
  }

  // -------------------------------
  // 3. Start MongoDB session
  // -------------------------------
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // -------------------------------
    // 4. Resolve wallet
    // -------------------------------
   

    let wallet = null;

// Preferred: Blockradar wallet ID
if (data.externalWalletId) {
  wallet = await Wallet.findOne({
    externalWalletId: data.externalWalletId,
    currency: normalizedCurrency,
    status: "ACTIVE",
  }).session(session);
}

// Fallback: recipient address
if (!wallet && recipientAddress) {
  wallet = await Wallet.findOne({
    walletAddress: recipientAddress,
    currency: normalizedCurrency,
    status: "ACTIVE",
  }).session(session);
}

if (!wallet) {
  throw new Error(
    `Wallet not found for Blockradar deposit | extWalletId=${data.externalWalletId}`
  );
}


    // -------------------------------
    // 5. Amount & fee calculation
    // -------------------------------
    const grossAmount = new Decimal(amountPaid);
    if (grossAmount.lte(0)) {
      throw new Error("Invalid deposit amount");
    }

    const flatFeeValue = await getFlatFee("DEPOSIT", normalizedCurrency);
    const feeAmount = new Decimal(flatFeeValue || 0);

    if (feeAmount.gt(grossAmount)) {
      throw new Error("Deposit fee exceeds deposit amount");
    }

    const netAmount = grossAmount.minus(feeAmount);

    // -------------------------------
    // 6. Credit wallet (atomic)
    // -------------------------------
    await Wallet.updateOne(
      { _id: wallet._id },
      { $inc: { balance: Number(netAmount) } },
      { session }
    );

    // -------------------------------
    // 7. Create transaction record
    // -------------------------------
    const tx = await Transaction.create(
      [
        {
          walletId: wallet._id,
          userId: wallet.user_id,
          type: "DEPOSIT",
          amount: Number(grossAmount),
          netAmount: Number(netAmount),
          currency: normalizedCurrency,
          status: "COMPLETED",
          reference,
          source: "BLOCKRADAR",
          metadata: {
            senderAddress,
            recipientAddress,
            rawWebhook: data,
          },
          feeDetails: {
            totalFee: Number(feeAmount),
            platformFee: Number(feeAmount),
            networkFee: 0,
            isDeductedFromAmount: true,
          },
        },
      ],
      { session }
    );

    // -------------------------------
    // 8. Fee accounting log
    // -------------------------------
    if (feeAmount.gt(0)) {
      await FeeLog.create(
        [
          {
            userId: wallet.user_id,
            transactionId: tx[0]._id,
            type: "DEPOSIT",
            currency: normalizedCurrency,
            grossAmount: Number(grossAmount),
            feeAmount: Number(feeAmount),
            platformFee: Number(feeAmount),
            reference,
            provider: "BLOCKRADAR",
          },
        ],
        { session }
      );
    }

    // -------------------------------
    // 9. Commit transaction
    // -------------------------------
    await session.commitTransaction();
    session.endSession();

    console.info(
      `✅ Deposit credited | User: ${userId} | Amount: ${netAmount.toString()} ${normalizedCurrency}`
    );

    return tx[0];
  } catch (error) {
    // ❌ Rollback everything
    await session.abortTransaction();
    session.endSession();

    console.error("❌ Deposit transaction failed:", error.message);
    throw error;
  }
}


async function handleWithdrawSuccess(eventData = {}) {
    const reference = eventData.reference;
    
    // 1. Find the transaction that was created in submitCryptoWithdrawal
    const tx = await Transaction.findOne({ reference });
    if (!tx) {
        console.warn("Withdrawal success for unknown reference:", reference);
        return null;
    }

    // 2. Fetch the flat fee that the admin set in the DB
    const flatFeeValue = await getFlatFee("WITHDRAWAL", tx.currency);
    const flatFeeDecimal = new Decimal(flatFeeValue);

    // 3. Mark transaction completed
    tx.status = "COMPLETED";
    tx.metadata = { ...tx.metadata, providerData: eventData };

    // 4. Calculate Net Amount (Gross - Platform Fee)
    const grossAmt = new Decimal(tx.amount || 0);
    const netAmt = grossAmt.sub(flatFeeDecimal);

    // 5. Update Fee Details
    tx.feeDetails = {
        ...tx.feeDetails,
        platformFee: Number(flatFeeDecimal.toString()),
        totalFee: Number(flatFeeDecimal.toString()),
        netAmountReceived: Number(netAmt.toString()), // This is what actually hit their external wallet
        isDeductedFromAmount: true
    };

    // 6. Handle Network Fees (The gas cost Blockradar paid)
    if (eventData.providerNetworkFee) {
        const networkFee = Number(eventData.providerNetworkFee);
        tx.feeDetails.networkFee = networkFee;

        // Log the final fees for your business accounting
        await FeeLog.findOneAndUpdate(
            { transactionId: tx._id },
            { 
                $set: { 
                    platformFee: Number(flatFeeDecimal.toString()),
                    networkFee: networkFee,
                    feeAmount: Number(flatFeeDecimal.add(networkFee).toString()),
                    grossAmount: Number(grossAmt.toString())
                } 
            },
            { upsert: true }
        );
    }

    await tx.save();
    return tx;
}

module.exports = { handleDepositConfirmed, handleWithdrawSuccess };