  const Wallet = require ("../models/walletModel.js");
  const logger = require("../utilities/logger");
  const Transaction = require("../models/transactionModel");
 const { handleDepositConfirmed, handleWithdrawSuccess } = require("../services/transactionHandlers");

  // 🟦 Blockradar webhook: handles USD (USDT) wallet events (This is for a direct REST API call)
  // const blockradarWebhook = async (req, res) => {
  //   try {
  //     const data = req.body;
  //     console.log("📩 Blockradar REST response received:", data); 

  //     // Update transaction by reference
  //     const updatedTx = await Transaction.findOneAndUpdate(
  //       { reference: data.reference },
  //       { status: data.status },
  //       { new: true }
  //     );

  //     if (!updatedTx) {
  //       console.log("⚠️ Transaction not found for reference:", data.reference);
  //       return res.status(404).send("Transaction not found");
  //     }

  //     // If completed, update the wallet balance
  //     if (data.status === "COMPLETED") {
  //       const updatedWallet = await Wallet.findOneAndUpdate(
  //         { externalWalletId: data.walletId }, 
  //         { $inc: { balance: data.amount } },
  //         { new: true }
  //       );

  //       if (!updatedWallet) {
  //         console.log("⚠️ Wallet not found for walletId:", data.walletId);
  //       }
  //     }

  //     return res.status(200).send("Webhook processed successfully");
  //   } catch (error) {
  //     console.error("❌ Blockradar webhook error:", error);
  //     return res.status(500).send("Error processing webhook");
  //   }
  // };
  //  📡 Handle incoming Blockradar webhooks (PUSH NOTIFICATIONS)
const handleBlockradarWebhook = async (req, res) => {
    try {
        const event = req.body;
        const eventData = event.data;

        // Map Blockradar fields to your internal structure
        const normalizedData = {
            ...eventData,
            amount: eventData.amountPaid, // "10.0" from sample payload
            walletId: eventData.wallet?.id || eventData.addressId,
            asset: eventData.currency || "USDC",
            reference: eventData.reference
        };

        switch (event.event) {
            case "deposit.success":
            case "deposit.confirmed":
                await handleDepositConfirmed(normalizedData);
                break;
            case "withdraw.success":
                await handleWithdrawSuccess(normalizedData);
                break;
        }

        res.status(200).json({ received: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const handlePaycrestWebhook = async (req, res) => {
    try {
        const { event, orderId, status, data } = req.body;
        
        logger.info(`Paycrest Webhook: Event ${event} for Order ${orderId}`);

        // Find the transaction using the Paycrest Order ID you saved in withdrawalInterService.js
        const tx = await Transaction.findOne({ "metadata.paycrestOrderId": orderId });

        if (!tx) {
            logger.warn(`No transaction found for Paycrest Order ID: ${orderId}`);
            return res.status(200).json({ message: "Order not tracked locally" }); 
        }

        switch (event) {
            case "order.fulfilled":
            case "order.processing":
               await Transaction.findByIdAndUpdate(tx._id, {
                  status: "FIAT_PROCESSING"
            });
           break;

            case "order.settled":
                // This means Paycrest has successfully paid the bank account
                await Transaction.findByIdAndUpdate(tx._id, { 
                    status: 'COMPLETED',
                    "metadata.fiatTxHash": data?.txHash 
                });
                logger.info(`✅ Withdrawal fully completed for ref: ${tx.reference}`);
                break;

            case "order.refunded":
  await Wallet.updateOne(
    { _id: tx.walletId },
    { $inc: { balance: tx.amount + tx.feeDetails.totalFee } }
  );

  await Transaction.findByIdAndUpdate(tx._id, {
    status: "REFUNDED",
    "metadata.reason": "Paycrest refund issued"
  });
  break;


            default:
                logger.info(`Received unhandled Paycrest event: ${event}`);
        }

        // Always return 200 to acknowledge receipt
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error("Paycrest webhook processing error:", error.message);
        res.status(500).json({ error: "Internal processing error" });
    }
};
  module.exports = { 
    handleBlockradarWebhook,
    handlePaycrestWebhook
  };
