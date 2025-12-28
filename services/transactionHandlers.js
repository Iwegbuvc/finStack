const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");
const FeeLog = require("../models/feeLogModel");
const Decimal = require("decimal.js");
const { getFlatFee } = require("./adminFeeService");

async function handleDepositConfirmed(eventData = {}) {
    const grossAmountStr = String(eventData.amount || 0);
    const currency = eventData.asset || eventData.currency || "USDC";

    const flatFeeValue = await getFlatFee("DEPOSIT", currency);

    const wallet = await Wallet.findOne({ externalWalletId: eventData.walletId });
    if (!wallet) {
        console.warn("⚠️ Deposit for unknown wallet:", eventData.walletId);
        return null;
    }

    // --- Decimal.js Logic for Flat Fee ---
    const grossAmt = new Decimal(grossAmountStr);
    const feeAmt = new Decimal(flatFeeValue);
    
    // Net = Gross - Flat Fee (Ensuring we don't go below zero)
    let netAmt = grossAmt.sub(feeAmt);
    if (netAmt.isNegative()) netAmt = new Decimal(0);

    const grossAmount = Number(grossAmt.toString());
    const feeAmount = Number(feeAmt.toString());
    const netAmount = Number(netAmt.toString());

    // Update Wallet Balance
    await Wallet.updateOne(
        { _id: wallet._id },
        { $inc: { balance: netAmount } }
    );

    // Create Transaction Record
    const tx = await Transaction.create({
        walletId: wallet._id,
        userId: wallet.user_id,
        type: "DEPOSIT",
        amount: grossAmount,
        currency,
        status: "COMPLETED",
        reference: eventData.reference || `dep-${Date.now()}`,
        metadata: { providerData: eventData },
        feeDetails: {
            totalFee: feeAmount,
            platformFee: feeAmount,
            networkFee: 0,
            isDeductedFromAmount: true
        }
    });

    // Log Fee for Accounting
    await FeeLog.create({
        userId: wallet.user_id,
        transactionId: tx._id,
        type: "DEPOSIT",
        currency,
        grossAmount,
        feeAmount,
        platformFee: feeAmount,
        reference: eventData.reference
    });

    return tx;
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