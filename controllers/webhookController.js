  const Wallet = require ("../models/walletModel.js");
  const P2PTrade = require("../models/p2pModel.js");
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

      console.log("📥 Incoming Blockradar PUSH webhook:", event.event);
      
      // Delegate processing to the service handlers
      switch (event.event) {
        case "transfer.completed":
          await handleTransferCompleted(eventData);
          break;

        case "transfer.failed":
          await handleTransferFailed(eventData);
          break;

        case "deposit.success": 
        case "deposit.confirmed":
          // This handles all deposits (external and internal Master->Child transfers)
          await handleDepositConfirmed(eventData);
          break;

        case "withdraw.success":
        case "withdrawal.success":
          // This handles confirming user withdrawals (including P2P payouts)
          await handleWithdrawSuccess(eventData);
          break;

        default:
          console.log("⚠️ Unhandled event type:", event.event);
      }

      // Always respond 200 OK quickly so the webhook service does not retry.
      res.status(200).json({ received: true }); 
    } catch (error) {
      console.error("❌ Webhook handling error:", error.message);
      res.status(500).json({ error: error.message });
    }
  };

  module.exports = { 
    handleBlockradarWebhook 
  };
