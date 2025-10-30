// // // const Wallet = require ("../models/walletModel.js");
// // // const P2PTrade = require("../models/p2pModel.js");
// // // const { logTransaction } = require("../utilities/logTransaction");
// // // const logger = require("../utilities/logger");
// // // const Transaction = require("../models/transactionModel");
// // // const { handleWithdrawSuccess } = require("../services/transactionHandlers");
// // // const { handleDepositConfirmed } = require("../services/transactionHandlers");
// // // const { handleTransferCompleted, handleTransferFailed } = require("../services/transactionHandlers");
// // // // const Transaction = require ("../models/transactionModel.js"); // you'll create this model

// // // // 🟩 9PSB webhook: handles NGN wallet events
// // // const ninePSBWebhook = async (req, res) => {
// // //   try {
// // //     const data = req.body;
// // //     console.log("📩 9PSB webhook received:", data);

// // //     // Step 1: Update the matching transaction using `reference`
// // //     const updatedTx = await Transaction.findOneAndUpdate(
// // //       { reference: data.reference }, // use reference, not transactionId
// // //       { status: data.status },
// // //       { new: true }
// // //     );

// // //     if (!updatedTx) {
// // //       console.log("⚠️ Transaction not found for reference:", data.reference);
// // //       return res.status(404).send("Transaction not found");
// // //     }

// // //     // Step 2: If transaction was successful, update user's wallet balance
// // //     if (data.status === "SUCCESS") {
// // //       const updatedWallet = await Wallet.findOneAndUpdate(
// // //         { accountNumber: data.accountNumber },
// // //         { $inc: { balance: data.amount } },
// // //         { new: true }
// // //       );

// // //       if (!updatedWallet) {
// // //         console.log("⚠️ Wallet not found for account:", data.accountNumber);
// // //       }
// // //     }

// // //     return res.status(200).send("Webhook processed successfully");
// // //   } catch (error) {
// // //     console.error("❌ 9PSB webhook error:", error);
// // //     return res.status(500).send("Error processing webhook");
// // //   }
// // // };


// // // // 🟦 Blockradar webhook: handles USD (USDT) wallet events
// // // const blockradarWebhook = async (req, res) => {
// // //   try {
// // //     const data = req.body;
// // //     console.log("📩 Blockradar webhook received:", data);

// // //     // Update transaction by reference
// // //     const updatedTx = await Transaction.findOneAndUpdate(
// // //       { reference: data.reference },
// // //       { status: data.status },
// // //       { new: true }
// // //     );

// // //     if (!updatedTx) {
// // //       console.log("⚠️ Transaction not found for reference:", data.reference);
// // //       return res.status(404).send("Transaction not found");
// // //     }

// // //     // If completed, update the wallet balance
// // //     if (data.status === "COMPLETED") {
// // //       const updatedWallet = await Wallet.findOneAndUpdate(
// // //         { externalWalletId: data.walletId }, // or walletAddress if that's how Blockradar identifies wallets
// // //         { $inc: { balance: data.amount } },
// // //         { new: true }
// // //       );

// // //       if (!updatedWallet) {
// // //         console.log("⚠️ Wallet not found for walletId:", data.walletId);
// // //       }
// // //     }

// // //     return res.status(200).send("Webhook processed successfully");
// // //   } catch (error) {
// // //     console.error("❌ Blockradar webhook error:", error);
// // //     return res.status(500).send("Error processing webhook");
// // //   }
// // // };



// // // //  📡 Handle incoming Blockradar webhooks
// // // // const handleBlockradarWebhook = async (req, res) => {
// // // //   try {
// // // //     const event = req.body;

// // // //     console.log("📥 Incoming Blockradar webhook:", event);

// // // //     // ✅ Always verify signature in production
// // // //     // (Blockradar may send an HMAC signature header for validation)
// // // //     // e.g., const signature = req.headers['x-blockradar-signature'];

// // // //     switch (event.event) {
// // // //   case "transfer.completed":
// // // //     await handleTransferCompleted(event.data);
// // // //     break;
// // // //   case "transfer.failed":
// // // //     await handleTransferFailed(event.data);
// // // //     break;
// // // //   case "deposit.confirmed":
// // // //     await handleDepositConfirmed(event.data);
// // // //     break;
// // // //   default:
// // // //     console.log("⚠️ Unhandled event type:", event.event);
// // // // }


// // // //     res.status(200).json({ received: true });
// // // //   } catch (error) {
// // // //     console.error("❌ Webhook handling error:", error.message);
// // // //     res.status(500).json({ error: error.message });
// // // //   }
// // // // };
// // //  const handleBlockradarWebhook = async (req, res) => {
// // //   try {
// // //     const event = req.body;

// // //     console.log("📥 Incoming Blockradar webhook:", event);

// // //     switch (event.event) {
// // //       case "transfer.completed":
// // //         await handleTransferCompleted(event.data);
// // //         break;

// // //       case "transfer.failed":
// // //         await handleTransferFailed(event.data);
// // //         break;

// // //       case "deposit.confirmed":
// // //         await handleDepositConfirmed(event.data);
// // //         break;

// // //       case "withdraw.success":
// // //       case "withdrawal.success":
// // //         await handleWithdrawSuccess(event.data);
// // //         break;

// // //       default:
// // //         console.log("⚠️ Unhandled event type:", event.event);
// // //     }

// // //     res.status(200).json({ received: true });
// // //   } catch (error) {
// // //     console.error("❌ Webhook handling error:", error.message);
// // //     res.status(500).json({ error: error.message });
// // //   }
// // // };

// // // // 🧩 Example helper functions



// // // // async function handleTransferCompleted(data) {
// // // //   const reference = data.reference;
// // // //   const trade = await P2PTrade.findOne({ reference });
// // // //   if (!trade) return;

// // // //   trade.status = "COMPLETED";
// // // //   trade.logs.push({
// // // //     message: `Blockrader confirmed transfer of ${data.amount} ${data.currency}`,
// // // //     actor: "system",
// // // //     role: "blockrader",
// // // //     ip: null,
// // // //     time: new Date(),
// // // //   });

// // // //   await trade.save();
// // // //   console.log(`✅ Trade ${reference} marked COMPLETED`);
// // // // }

// // // // async function handleTransferFailed(data) {
// // // //   const reference = data.reference;
// // // //   const trade = await P2PTrade.findOne({ reference });
// // // //   if (!trade) return;

// // // //   trade.status = "FAILED";
// // // //   trade.logs.push({
// // // //     message: `Transfer failed: ${data.reason}`,
// // // //     actor: "system",
// // // //     role: "blockrader",
// // // //     ip: null,
// // // //     time: new Date(),
// // // //   });

// // // //   await trade.save();
// // // //   console.log(`❌ Trade ${reference} marked FAILED`);
// // // // }
// // // // async function handleDepositConfirmed(data) {
// // // //   const wallet = await Wallet.findOne({ externalWalletId: data.wallet?.id });
// // // //   if (!wallet) return console.log("⚠️ Wallet not found for deposit");

// // // //   wallet.balance += Number(data.amount);
// // // //   await wallet.save();

// // // //   await Transaction.create({
// // // //     walletId: wallet._id,
// // // //     type: "DEPOSIT",
// // // //     amount: data.amount,
// // // //     currency: data.currency,
// // // //     reference: data.reference,
// // // //     status: "SUCCESS",
// // // //     hash: data.hash
// // // //   });

// // // //   console.log(`✅ Deposit confirmed for ${data.amount} ${data.currency}`);
// // // // };

// // // module.exports = { 
// // //   ninePSBWebhook, 
// // //   blockradarWebhook, 
// // //   handleBlockradarWebhook 
// // // };
// // const Wallet = require ("../models/walletModel.js");
// // const P2PTrade = require("../models/p2pModel.js");
// // const { logTransaction } = require("../utilities/logTransaction");
// // const logger = require("../utilities/logger");
// // const Transaction = require("../models/transactionModel");
// // const { handleWithdrawSuccess } = require("../services/transactionHandlers");
// // const { handleDepositConfirmed } = require("../services/transactionHandlers");
// // const { handleTransferCompleted, handleTransferFailed } = require("../services/transactionHandlers");
// // // const Transaction = require ("../models/transactionModel.js"); // you'll create this model

// // // 🟩 9PSB webhook: handles NGN wallet events
// // const ninePSBWebhook = async (req, res) => {
// //   try {
// //     const data = req.body;
// //     console.log("📩 9PSB webhook received:", data);

// //     // Step 1: Update the matching transaction using `reference`
// //     const updatedTx = await Transaction.findOneAndUpdate(
// //       { reference: data.reference }, // use reference, not transactionId
// //       { status: data.status },
// //       { new: true }
// //     );

// //     if (!updatedTx) {
// //       console.log("⚠️ Transaction not found for reference:", data.reference);
// //       return res.status(404).send("Transaction not found");
// //     }

// //     // Step 2: If transaction was successful, update user's wallet balance
// //     if (data.status === "SUCCESS") {
// //       const updatedWallet = await Wallet.findOneAndUpdate(
// //         { accountNumber: data.accountNumber },
// //         { $inc: { balance: data.amount } },
// //         { new: true }
// //       );

// //       if (!updatedWallet) {
// //         console.log("⚠️ Wallet not found for account:", data.accountNumber);
// //       }
// //     }

// //     return res.status(200).send("Webhook processed successfully");
// //   } catch (error) {
// //     console.error("❌ 9PSB webhook error:", error);
// //     return res.status(500).send("Error processing webhook");
// //   }
// // };


// // // 🟦 Blockradar webhook: handles USD (USDT) wallet events
// // const blockradarWebhook = async (req, res) => {
// //   try {
// //     const data = req.body;
// //     console.log("📩 Blockradar webhook received:", data);

// //     // Update transaction by reference
// //     const updatedTx = await Transaction.findOneAndUpdate(
// //       { reference: data.reference },
// //       { status: data.status },
// //       { new: true }
// //     );

// //     if (!updatedTx) {
// //       console.log("⚠️ Transaction not found for reference:", data.reference);
// //       return res.status(404).send("Transaction not found");
// //     }

// //     // If completed, update the wallet balance
// //     if (data.status === "COMPLETED") {
// //       const updatedWallet = await Wallet.findOneAndUpdate(
// //         { externalWalletId: data.walletId }, // or walletAddress if that's how Blockradar identifies wallets
// //         { $inc: { balance: data.amount } },
// //         { new: true }
// //       );

// //       if (!updatedWallet) {
// //         console.log("⚠️ Wallet not found for walletId:", data.walletId);
// //       }
// //     }

// //     return res.status(200).send("Webhook processed successfully");
// //   } catch (error) {
// //     console.error("❌ Blockradar webhook error:", error);
// //     return res.status(500).send("Error processing webhook");
// //   }
// // };


// // //  📡 Handle incoming Blockradar webhooks
// //  const handleBlockradarWebhook = async (req, res) => {
// //   try {
// //     const event = req.body;

// //     console.log("📥 Incoming Blockradar webhook:", event);

// //     switch (event.event) {
// //       case "transfer.completed":
// //         await handleTransferCompleted(event.data);
// //         break;

// //       case "transfer.failed":
// //         await handleTransferFailed(event.data);
// //         break;

// //       case "deposit.success": // ✅ ADDED: Handle the new event type
// //       case "deposit.confirmed":
// //         await handleDepositConfirmed(event.data);
// //         break;

// //       case "withdraw.success":
// //       case "withdrawal.success":
// //         await handleWithdrawSuccess(event.data);
// //         break;

// //       default:
// //         console.log("⚠️ Unhandled event type:", event.event);
// //     }

// //     res.status(200).json({ received: true });
// //   } catch (error) {
// //     console.error("❌ Webhook handling error:", error.message);
// //     res.status(500).json({ error: error.message });
// //   }
// // };

// // // 🧩 Example helper functions
// // // These are included from your original context, though they are likely located
// // // in a separate file like `../services/transactionHandlers.js` in your project.

// // // async function handleTransferCompleted(data) {
// // //   const reference = data.reference;
// // //   const trade = await P2PTrade.findOne({ reference });
// // //   if (!trade) return;

// // //   trade.status = "COMPLETED";
// // //   trade.logs.push({
// // //     message: `Blockrader confirmed transfer of ${data.amount} ${data.currency}`,
// // //     actor: "system",
// // //     role: "blockrader",
// // //     ip: null,
// // //     time: new Date(),
// // //   });

// // //   await trade.save();
// // //   console.log(`✅ Trade ${reference} marked COMPLETED`);
// // // }

// // // async function handleTransferFailed(data) {
// // //   const reference = data.reference;
// // //   const trade = await P2PTrade.findOne({ reference });
// // //   if (!trade) return;

// // //   trade.status = "FAILED";
// // //   trade.logs.push({
// // //     message: `Transfer failed: ${data.reason}`,
// // //     actor: "system",
// // //     role: "blockrader",
// // //     ip: null,
// // //     time: new Date(),
// // //   });

// // //   await trade.save();
// // //   console.log(`❌ Trade ${reference} marked FAILED`);
// // // }
// // // async function handleDepositConfirmed(data) {
// // //   const wallet = await Wallet.findOne({ externalWalletId: data.wallet?.id });
// // //   if (!wallet) return console.log("⚠️ Wallet not found for deposit");

// // //   wallet.balance += Number(data.amount);
// // //   await wallet.save();

// // //   await Transaction.create({
// // //     walletId: wallet._id,
// // //     type: "DEPOSIT",
// // //     amount: data.amount,
// // //     currency: data.currency,
// // //     reference: data.reference,
// // //     status: "SUCCESS",
// // //     hash: data.hash
// // //   });

// // //   console.log(`✅ Deposit confirmed for ${data.amount} ${data.currency}`);
// // // };

// // module.exports = { 
// //   ninePSBWebhook, 
// //   blockradarWebhook, 
// //   handleBlockradarWebhook 
// // };
// const Wallet = require ("../models/walletModel.js");
// const P2PTrade = require("../models/p2pModel.js");
// const { logTransaction } = require("../utilities/logTransaction");
// const logger = require("../utilities/logger");
// const Transaction = require("../models/transactionModel");
// // The functions below are assumed to be in the transactionHandlers file
// const { handleWithdrawSuccess } = require("../services/transactionHandlers"); 
// const { handleDepositConfirmed } = require("../services/transactionHandlers");
// const { handleTransferCompleted, handleTransferFailed } = require("../services/transactionHandlers");


// // 🟩 9PSB webhook: handles NGN wallet events
// const ninePSBWebhook = async (req, res) => {
//   try {
//     const data = req.body;
//     console.log("📩 9PSB webhook received:", data);

//     // Step 1: Update the matching transaction using `reference`
//     const updatedTx = await Transaction.findOneAndUpdate(
//       { reference: data.reference }, // use reference, not transactionId
//       { status: data.status },
//       { new: true }
//     );

//     if (!updatedTx) {
//       console.log("⚠️ Transaction not found for reference:", data.reference);
//       return res.status(404).send("Transaction not found");
//     }

//     // Step 2: If transaction was successful, update user's wallet balance
//     if (data.status === "SUCCESS") {
//       // NOTE: This is likely where you need to update a specific NGN/CNGN balance field
//       const updatedWallet = await Wallet.findOneAndUpdate(
//         { accountNumber: data.accountNumber },
//         { $inc: { balance: data.amount } },
//         { new: true }
//       );

//       if (!updatedWallet) {
//         console.log("⚠️ Wallet not found for account:", data.accountNumber);
//       }
//     }

//     return res.status(200).send("Webhook processed successfully");
//   } catch (error) {
//     console.error("❌ 9PSB webhook error:", error);
//     return res.status(500).send("Error processing webhook");
//   }
// };


// // 🟦 Blockradar webhook: handles USD (USDT) wallet events - (This is for a direct REST API call, not the push webhook)
// const blockradarWebhook = async (req, res) => {
//   try {
//     const data = req.body;
//     console.log("📩 Blockradar webhook received:", data);

//     // Update transaction by reference
//     const updatedTx = await Transaction.findOneAndUpdate(
//       { reference: data.reference },
//       { status: data.status },
//       { new: true }
//     );

//     if (!updatedTx) {
//       console.log("⚠️ Transaction not found for reference:", data.reference);
//       return res.status(404).send("Transaction not found");
//     }

//     // If completed, update the wallet balance
//     if (data.status === "COMPLETED") {
//       const updatedWallet = await Wallet.findOneAndUpdate(
//         { externalWalletId: data.walletId }, // or walletAddress if that's how Blockradar identifies wallets
//         { $inc: { balance: data.amount } },
//         { new: true }
//       );

//       if (!updatedWallet) {
//         console.log("⚠️ Wallet not found for walletId:", data.walletId);
//       }
//     }

//     return res.status(200).send("Webhook processed successfully");
//   } catch (error) {
//     console.error("❌ Blockradar webhook error:", error);
//     return res.status(500).send("Error processing webhook");
//   }
// };


// //  📡 Handle incoming Blockradar webhooks (PUSH NOTIFICATIONS)
// const handleBlockradarWebhook = async (req, res) => {
//   try {
//     const event = req.body;
//     const eventData = event.data;

//     console.log("📥 Incoming Blockradar webhook:", event);

//     // Determine the Master Wallet Address from the event data for comparison
//     // The Master Wallet is typically identified by the 'wallet' object in the payload.
//     const MASTER_WALLET_ADDRESS = eventData.wallet?.address;
//     const sender = eventData.senderAddress;
//     
//     // Check if this is a withdrawal originating from our Master Wallet
//     const isMasterToChildTransfer = (event.event === "withdraw.success" || event.event === "withdrawal.success") && 
//                                       sender === MASTER_WALLET_ADDRESS;


//     if (isMasterToChildTransfer) {
//       // This is an internal transfer from Master Wallet to a Child Wallet.
//       // We MUST treat this as a DEPOSIT for the recipient.
//       console.log(`⏩ Intercepted Master->Child transfer. Treating as DEPOSIT for ${eventData.recipientAddress}`);
//       await handleDepositConfirmed(eventData);
//       
//     } else {
//       // Standard event handling
//       switch (event.event) {
//         case "transfer.completed":
//           await handleTransferCompleted(eventData);
//           break;

//         case "transfer.failed":
//           await handleTransferFailed(eventData);
//           break;

//         case "deposit.success": 
//         case "deposit.confirmed":
//           await handleDepositConfirmed(eventData);
//           break;

//         case "withdraw.success":
//         case "withdrawal.success":
//           // This path handles a normal user withdrawal (sender != Master Wallet)
//           await handleWithdrawSuccess(eventData);
//           break;

//         default:
//           console.log("⚠️ Unhandled event type:", event.event);
//       }
//     }

//     res.status(200).json({ received: true });
//   } catch (error) {
//     console.error("❌ Webhook handling error:", error.message);
//     res.status(500).json({ error: error.message });
//   }
// };

// // ---------------------------------------------------------------------
// // 🧩 NOTE: The actual logic for handling the deposit/withdrawal needs to 
// // 🧩 be available, likely in '../services/transactionHandlers.js'
// // ---------------------------------------------------------------------

// module.exports = { 
//   ninePSBWebhook, 
//   blockradarWebhook, 
//   handleBlockradarWebhook 
// };

  const Wallet = require ("../models/walletModel.js");
  const P2PTrade = require("../models/p2pModel.js");
  const { logTransaction } = require("../utilities/logTransaction");
  // const logger = require("../utilities/logger");
  const Transaction = require("../models/transactionModel");
  // Ensure these service functions are correctly imported from the service file
  const { 
    handleWithdrawSuccess, 
    handleDepositConfirmed, 
    handleTransferCompleted, 
    handleTransferFailed 
  } = require("../services/transactionHandlers");


  // 🟩 9PSB webhook: handles NGN wallet events (Keeping original logic for completeness)
  const ninePSBWebhook = async (req, res) => {
    try {
      const data = req.body;
      console.log("📩 9PSB webhook received:", data);

      // Step 1: Update the matching transaction using `reference`
      const updatedTx = await Transaction.findOneAndUpdate(
        { reference: data.reference },
        { status: data.status },
        { new: true }
      );

      if (!updatedTx) {
        console.log("⚠️ Transaction not found for reference:", data.reference);
        return res.status(200).send("Transaction not found (processed successfully)"); 
      }

      // Step 2: If transaction was successful, update user's wallet balance
      if (data.status === "SUCCESS") {
        const updatedWallet = await Wallet.findOneAndUpdate(
          { accountNumber: data.accountNumber },
          { $inc: { balance: data.amount } },
          { new: true }
        );

        if (!updatedWallet) {
          console.log("⚠️ Wallet not found for account:", data.accountNumber);
        }
      }

      return res.status(200).send("Webhook processed successfully");
    } catch (error) {
      console.error("❌ 9PSB webhook error:", error);
      return res.status(500).send("Error processing webhook");
    }
  };


  // 🟦 Blockradar webhook: handles USD (USDT) wallet events (This is for a direct REST API call)
  const blockradarWebhook = async (req, res) => {
    try {
      const data = req.body;
      console.log("📩 Blockradar REST response received:", data); 

      // Update transaction by reference
      const updatedTx = await Transaction.findOneAndUpdate(
        { reference: data.reference },
        { status: data.status },
        { new: true }
      );

      if (!updatedTx) {
        console.log("⚠️ Transaction not found for reference:", data.reference);
        return res.status(404).send("Transaction not found");
      }

      // If completed, update the wallet balance
      if (data.status === "COMPLETED") {
        const updatedWallet = await Wallet.findOneAndUpdate(
          { externalWalletId: data.walletId }, 
          { $inc: { balance: data.amount } },
          { new: true }
        );

        if (!updatedWallet) {
          console.log("⚠️ Wallet not found for walletId:", data.walletId);
        }
      }

      return res.status(200).send("Webhook processed successfully");
    } catch (error) {
      console.error("❌ Blockradar webhook error:", error);
      return res.status(500).send("Error processing webhook");
    }
  };


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
    ninePSBWebhook, 
    blockradarWebhook, 
    handleBlockradarWebhook 
  };
