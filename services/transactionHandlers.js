// // const Wallet = require ("../models/walletModel.js"); 
// // const Transaction = require("../models/transactionModel.js"); 
// // const P2PTrade = require("../models/p2pModel.js"); 

// // // CRITICAL: Define your static Master Wallet Address here. 
// // // This is the address that receives all your system's internal funds (e.g., escrow).
// // const MASTER_WALLET_ADDRESS = "0x344E565D8928e2461E078201Fb086b738b1d3c48"; 

// // // Helper function to log trade changes (copied from p2pService for self-containment)
// // function safeLog(trade, entry) {
// //     trade.logs = trade.logs || [];
// //     trade.logs.push({
// //         ...entry,
// //         time: entry.time || new Date()
// //     });
// // }

// // /**
// //  * Utility function to map Blockradar status to the Transaction Model's enum.
// //  */
// // function formatStatus(blockradarStatus) {
// //     if (typeof blockradarStatus !== 'string') {
// //         return 'PENDING'; 
// //     }
// //     const status = blockradarStatus.toUpperCase();
// //     
// //     if (status === 'SUCCESS') {
// //         return 'COMPLETED';
// //     }
// //     
// //     const validStatuses = ["PENDING", "COMPLETED", "FAILED"];
// //     if (validStatuses.includes(status)) {
// //         return status;
// //     }
// //     
// //     return 'PENDING'; 
// // }

// // /**
// //  * Handles deposit.confirmed events, skipping deposits to the Master Wallet.
// //  */
// // async function handleDepositConfirmed(data) {
// //     const walletAddressToCredit = data.address?.address || data.recipientAddress;
// //     const walletExternalId = data.address?.id; 
// //     const txHash = data.hash;
// //     const amount = Number(data.amount);

// //     if (!walletAddressToCredit) {
// //         return console.log("⚠️ Deposit failed: Could not determine recipient wallet address from webhook data.");
// //     }

// //     // --- CRITICAL FIX: Skip deposits to the system's Master Wallet ---
// //     if (walletAddressToCredit.toLowerCase() === MASTER_WALLET_ADDRESS.toLowerCase()) {
// //         return console.log(`⏩ System Deposit: Funds deposited into Master Wallet ${walletAddressToCredit}. Skipping user balance update.`);
// //     }
// //     
// //     // 1. Check for duplicate transaction hash (to prevent double-credit)
// //     const existingTx = await Transaction.findOne({ txHash: txHash });
// //     if (existingTx) {
// //         return console.log(`⏩ Duplicate transaction detected and ignored: ${txHash}. Status: ${data.event}`);
// //     }

// //     // 2. Look up the user's wallet 
// //     let wallet = await Wallet.findOne({ accountNumber: walletAddressToCredit });
// //     if (!wallet && walletExternalId) {
// //         wallet = await Wallet.findOne({ externalWalletId: walletExternalId });
// //     }

// //     if (!wallet) {
// //         return console.log(`❌ Critical Error: Wallet not found for deposit address ${walletAddressToCredit}. Cannot credit user.`);
// //     }

// //     const userId = wallet.user_id; 

// //     // 3. Update Wallet Balance
// //     wallet.balance += amount; 
// //     await wallet.save();
// //     console.log(`✅ Balance updated: ${amount} ${data.asset?.symbol || data.currency} credited to wallet ${walletAddressToCredit}`);

// //     if (!userId) {
// //         return console.log("❌ CRITICAL VALIDATION FAILURE: Wallet document is missing required 'user_id'.");
// //     }

// //     // 4. Log Transaction
// //     await Transaction.create({
// //         walletId: wallet._id,
// //         userId: userId, 
// //         type: "DEPOSIT",
// //         amount: amount,
// //         currency: data.asset?.symbol || data.currency, 
// //         reference: data.reference,
// //         status: formatStatus(data.status), 
// //         txHash: txHash, 
// //         network: data.blockchain?.name || data.network, 
// //         blockradarWalletId: data.wallet?.id, 
// //         metadata: {
// //             note: data.note,
// //             externalTransactionId: data.id, 
// //             sourceAddress: data.senderAddress,
// //             metadata: data.metadata || {} 
// //         }
// //     });

// //     console.log(`✅ Deposit confirmed: Transaction record created for external activity.`);
// // }


// // /**
// //  * Handles withdrawal.success events, including reconciliation for missing records.
// //  */
// // async function handleWithdrawSuccess(data) {
// //     const { reference, hash: txHash, status, recipientAddress, amount } = data;

// //     // 1. Try to find the existing transaction record and update it
// //     let updatedTx = await Transaction.findOneAndUpdate(
// //         { reference: reference },
// //         { 
// //             status: formatStatus(status), 
// //             txHash: txHash, 
// //             network: data.blockchain?.name || data.network,
// //             metadata: {
// //                 note: data.note,
// //                 externalTransactionId: data.id, 
// //                 recipientAddress: recipientAddress
// //             }
// //         },
// //         { new: true }
// //     );
// //     
// //     if (!updatedTx) {
// //         // --- RECONCILIATION FALLBACK: The critical update you asked about ---
// //         console.warn(`⚠️ RECONCILIATION NEEDED: Transaction not found for reference ${reference}. Attempting to reconstruct record.`);

// //         // 2. Find the associated P2P Trade using your P2PTrade model
// //         const trade = await P2PTrade.findOne({ reference: reference }); 

// //         // NOTE: We assume the userId is the one who was paid out (the seller/merchant).
// //         // Since the withdrawal succeeded, we create the record in the COMPLETED state.
// //         if (trade && (trade.userId || trade.merchantId)) { 
// //             // We need to fetch the wallet ID for the user who initiated the withdrawal.
// //             // Assuming this is the merchantId or buyer/seller depending on context. 
// //             const targetUserId = trade.userId || trade.merchantId; 
// //             const targetWallet = await Wallet.findOne({ user_id: targetUserId });

// //             if (targetWallet) {
// //                  await Transaction.create({
// //                     walletId: targetWallet._id, 
// //                     userId: targetUserId,
// //                     type: "WITHDRAWAL",
// //                     amount: Number(amount),
// //                     currency: data.asset?.symbol || data.currency,
// //                     reference: reference,
// //                     status: 'COMPLETED', // Confirmed successful by Blockradar
// //                     txHash: txHash,
// //                     network: data.blockchain?.name || data.network,
// //                     blockradarWalletId: data.wallet?.id,
// //                     metadata: {
// //                         note: data.note || 'RECONCILED: Initial record creation failed.',
// //                         externalTransactionId: data.id,
// //                         recipientAddress: recipientAddress
// //                     }
// //                 });
// //                 console.log(`✅ RECONCILIATION SUCCESS: Created COMPLETED transaction record for ${reference}.`);
// //             } else {
// //                  console.error(`❌ RECONCILIATION FAILED: Found Trade but could not find a Wallet for user ID ${targetUserId}.`);
// //             }
// //         } else {
// //             console.error(`❌ RECONCILIATION FAILED: Could not find associated P2P Trade/User for reference ${reference}. Manual intervention required.`);
// //         }
// //     }

// //     console.log(`✅ Withdrawal success confirmed for transaction ${reference}.`);
// // }

// // /**
// //  * Handles transfer.completed events.
// //  * This confirms the successful completion of the settlement/reversal initiated in p2pService.
// //  */
// // async function handleTransferCompleted(data) {
// //     const reference = data.reference;
// //     const trade = await P2PTrade.findOne({ reference: reference });

// //     if (!trade) {
// //         return console.warn(`⚠️ Webhook: Transfer completed but P2P Trade not found for reference ${reference}.`);
// //     }

// //     // Log the final confirmation of settlement. Status should already be 'COMPLETED'.
// //     safeLog(trade, {
// //         message: `Settlement confirmed COMPLETED by provider webhook (tx:${data.hash}).`,
// //         actor: 'system',
// //         role: 'system',
// //         time: new Date()
// //     });
    
// //     // Save to persist the log.
// //     await trade.save();
// //     console.log(`✅ Settlement completed and confirmed for trade ${reference}.`);
// // }

// // /**
// //  * Handles transfer.failed events.
// //  * CRITICAL: This is needed to revert the P2P Trade status if the settlement transfer, 
// //  * which was optimistically marked COMPLETED, actually failed.
// //  */
// // async function handleTransferFailed(data) {
// //     const reference = data.reference;
// //     const trade = await P2PTrade.findOne({ reference: reference });

// //     if (!trade) {
// //         return console.error(`❌ Webhook: Transfer failed but P2P Trade not found for reference ${reference}. Cannot revert status.`);
// //     }

// //     const originalStatus = trade.status;
    
// //     // Only revert from COMPLETED if the transfer was the final settlement
// //     if (originalStatus === 'COMPLETED') {
// //         // Revert the status to FAILED and flag for manual review, as funds are now lost/stuck.
// //         trade.status = 'FAILED'; 

// //         safeLog(trade, {
// //             message: `CRITICAL: Settlement FAILED by provider webhook. Status reverted from ${originalStatus} to FAILED (tx:${data.hash}). Manual review required.`,
// //             actor: 'system',
// //             role: 'system',
// //             time: new Date()
// //         });

// //         await trade.save();
// //         console.error(`❌ CRITICAL: Trade ${reference} FAILED. Status reverted to FAILED. Tx Hash: ${data.hash}.`);
// //     } else {
// //         // Handle other failure cases (e.g., initial escrow failed, but we should have caught that in p2pService)
// //         console.warn(`⚠️ Webhook: Transfer failed for trade ${reference} in unexpected status ${originalStatus}. Logging failure.`);
// //         safeLog(trade, {
// //             message: `Transfer FAILED by provider webhook in status ${originalStatus}.`,
// //             actor: 'system',
// //             role: 'system',
// //             time: new Date()
// //         });
// //         // We will mark it FAILED if it wasn't already in a final state.
// //         if (['PENDING_PAYMENT', 'ESCROWED_AWAITING_MERCHANT_TRANSFER', 'PAYMENT_CONFIRMED_BY_BUYER'].includes(originalStatus)) {
// //             trade.status = 'FAILED';
// //             await trade.save();
// //         }
// //     }
// // }

// // module.exports = {
// //     handleDepositConfirmed,
// //     handleWithdrawSuccess,
// //     handleTransferCompleted,
// //     handleTransferFailed
// // };




// // GOOD FIX BUT NEED update // 
// // const Wallet = require ("../models/walletModel.js"); 
// // const Transaction = require("../models/transactionModel.js"); 
// // const P2PTrade = require("../models/p2pModel.js"); 

// // // CRITICAL: Define your static Master Wallet Address here. 
// // const MASTER_WALLET_ADDRESS = "0x344E565D8928e2461E078201Fb086b738b1d3c48"; 

// // // Helper function to log trade changes
// // function safeLog(trade, entry) {
// //     trade.logs = trade.logs || [];
// //     trade.logs.push({
// //         ...entry,
// //         time: entry.time || new Date()
// //     });
// // }

// // /**
// //  * Utility function to map Blockradar status to the Transaction Model's enum.
// //  */
// // function formatStatus(blockradarStatus) {
// //     if (typeof blockradarStatus !== 'string') {
// //         return 'PENDING'; 
// //     }
// //     const status = blockradarStatus.toUpperCase();
    
// //     if (status === 'SUCCESS') {
// //         return 'COMPLETED';
// //     }
    
// //     const validStatuses = ["PENDING", "COMPLETED", "FAILED"];
// //     if (validStatuses.includes(status)) {
// //         return status;
// //     }
    
// //     return 'PENDING'; 
// // }

// // /**
// //  * Handles deposit.confirmed events, skipping deposits to the Master Wallet, and using atomic updates.
// //  */
// // async function handleDepositConfirmed(data) {
// //     const walletAddressToCredit = data.address?.address || data.recipientAddress;
// //     const txHash = data.hash;
// //     const amount = Number(data.amount);

// //     if (!walletAddressToCredit) {
// //         return console.error("⚠️ Deposit failed: Could not determine recipient wallet address from webhook data.");
// //     }

// //     try {
// //         // --- CRITICAL FIX: Skip deposits to the system's Master Wallet ---
// //         if (walletAddressToCredit.toLowerCase() === MASTER_WALLET_ADDRESS.toLowerCase()) {
// //             return console.log(`⏩ System Deposit: Funds deposited into Master Wallet ${walletAddressToCredit}. Skipping user balance update.`);
// //         }
        
// //         // 1. Check for duplicate transaction hash (to prevent double-credit)
// //         const existingTx = await Transaction.findOne({ txHash: txHash });
// //         if (existingTx) {
// //             return console.log(`⏩ Duplicate transaction detected and ignored: ${txHash}. Status: ${data.event}`);
// //         }

// //         // 2. Look up the user's wallet 
// //         // We use $inc update later for atomicity, so we just need the IDs here.
// //         let wallet = await Wallet.findOne({ accountNumber: walletAddressToCredit });
        
// //         if (!wallet) {
// //             return console.error(`❌ Critical Error: Wallet not found for deposit address ${walletAddressToCredit}. Cannot credit user.`);
// //         }

// //         const userId = wallet.user_id; 
// //         if (!userId) {
// //             return console.error("❌ CRITICAL VALIDATION FAILURE: Wallet document is missing required 'user_id'.");
// //         }

// //         // 3. ATOMICALLY Update Wallet Balance using $inc (Production Ready Fix)
// //         const updatedWallet = await Wallet.findOneAndUpdate(
// //             { _id: wallet._id },
// //             { $inc: { balance: amount } },
// //             { new: true }
// //         );

// //         if (!updatedWallet) {
// //             return console.error(`❌ ATOMIC UPDATE FAILED: Could not update balance for wallet ${walletAddressToCredit}. Manual review required.`);
// //         }

// //         console.log(`✅ Balance updated: ${amount} ${data.asset?.symbol || data.currency} credited to wallet ${walletAddressToCredit}. New Balance: ${updatedWallet.balance}`);

// //         // 4. Log Transaction
// //         await Transaction.create({
// //             walletId: wallet._id,
// //             userId: userId, 
// //             type: "DEPOSIT",
// //             amount: amount,
// //             currency: data.asset?.symbol || data.currency, 
// //             reference: data.reference,
// //             status: formatStatus(data.status), 
// //             txHash: txHash, 
// //             network: data.blockchain?.name || data.network, 
// //             blockradarWalletId: data.wallet?.id, 
// //             metadata: {
// //                 note: data.note,
// //                 externalTransactionId: data.id, 
// //                 sourceAddress: data.senderAddress,
// //                 metadata: data.metadata || {} 
// //             }
// //         });

// //         console.log(`✅ Deposit confirmed: Transaction record created for external activity.`);
// //     } catch (error) {
// //         // Must catch all database errors and log them appropriately
// //         console.error(`❌ FATAL ERROR in handleDepositConfirmed for txHash ${txHash}:`, error.message);
// //     }
// // }


// // /**
// //  * Handles withdrawal.success events, including reconciliation for missing records.
// //  */
// // async function handleWithdrawSuccess(data) {
// //     const { reference, hash: txHash, status, recipientAddress, amount } = data;

// //     try {
// //         // 1. Try to find the existing transaction record and update it
// //         let updatedTx = await Transaction.findOneAndUpdate(
// //             { reference: reference },
// //             { 
// //                 status: formatStatus(status), 
// //                 txHash: txHash, 
// //                 network: data.blockchain?.name || data.network,
// //                 metadata: {
// //                     note: data.note,
// //                     externalTransactionId: data.id, 
// //                     recipientAddress: recipientAddress
// //                 }
// //             },
// //             { new: true }
// //         );
        
// //         if (!updatedTx) {
// //             // --- RECONCILIATION FALLBACK: Attempt to reconstruct the record ---
// //             console.warn(`⚠️ RECONCILIATION NEEDED: Transaction not found for reference ${reference}. Attempting to reconstruct record.`);

// //             // --- FIX: Ensure the reference is cleaned up (trimmed) before checking the prefix. 
// //             // This prevents an internal funding reference from falling into the P2P logic if it has whitespace. ---
// //             const isInternalFunding = reference && reference.trim().startsWith('Master-Fund-'); 

// //             if (isInternalFunding) {
// //                 // Production ready fix: Log the system transaction for auditability
// //                 const systemWallet = await Wallet.findOne({ accountNumber: MASTER_WALLET_ADDRESS });

// //                 if (systemWallet) {
// //                     await Transaction.create({
// //                         walletId: systemWallet._id, 
// //                         userId: systemWallet.user_id,
// //                         type: "SYSTEM_WITHDRAWAL", // Use a system type
// //                         amount: Number(amount),
// //                         currency: data.asset?.symbol || data.currency,
// //                         reference: reference,
// //                         status: 'COMPLETED',
// //                         txHash: txHash,
// //                         network: data.blockchain?.name || data.network,
// //                         blockradarWalletId: data.wallet?.id,
// //                         metadata: {
// //                             note: data.note || 'RECONCILED: System funding record.',
// //                             externalTransactionId: data.id,
// //                             recipientAddress: recipientAddress
// //                         }
// //                     });
// //                     console.log(`✅ INTERNAL FUNDING SUCCESS: Created COMPLETED System transaction record for ${reference}.`);
// //                 } else {
// //                     console.error(`❌ RECONCILIATION FAILED: Master Wallet record not found in DB (${MASTER_WALLET_ADDRESS}). Cannot create system audit log for ${reference}.`);
// //                 }
                
// //             } else {
// //                 // 2. Find the associated P2P Trade (Original logic for non-system references)
// //                 const trade = await P2PTrade.findOne({ reference: reference }); 

// //                 if (trade && (trade.userId || trade.merchantId)) { 
// //                     // We need to fetch the wallet ID for the user who initiated the withdrawal.
// //                     const targetUserId = trade.userId || trade.merchantId; 
// //                     const targetWallet = await Wallet.findOne({ user_id: targetUserId });

// //                     if (targetWallet) {
// //                         await Transaction.create({
// //                             walletId: targetWallet._id, 
// //                             userId: targetUserId,
// //                             type: "WITHDRAWAL",
// //                             amount: Number(amount),
// //                             currency: data.asset?.symbol || data.currency,
// //                             reference: reference,
// //                             status: 'COMPLETED', // Confirmed successful by Blockradar
// //                             txHash: txHash,
// //                             network: data.blockchain?.name || data.network,
// //                             blockradarWalletId: data.wallet?.id,
// //                             metadata: {
// //                                 note: data.note || 'RECONCILED: Initial record creation failed.',
// //                                 externalTransactionId: data.id,
// //                                 recipientAddress: recipientAddress
// //                             }
// //                         });
// //                         console.log(`✅ RECONCILIATION SUCCESS: Created COMPLETED transaction record for ${reference}.`);
// //                     } else {
// //                         console.error(`❌ RECONCILIATION FAILED: Found Trade but could not find a Wallet for user ID ${targetUserId}.`);
// //                     }
// //                 } else {
// //                     console.error(`❌ RECONCILIATION FAILED: Could not find associated P2P Trade/User for reference ${reference}. Manual intervention required.`);
// //                 }
// //             }
// //         }

// //         console.log(`✅ Withdrawal success confirmed for transaction ${reference}.`);
// //     } catch (error) {
// //         console.error(`❌ FATAL ERROR in handleWithdrawSuccess for reference ${reference}:`, error.message);
// //     }
// // }

// // /**
// //  * Handles transfer.completed events.
// //  */
// // async function handleTransferCompleted(data) {
// //     const reference = data.reference;
// //     try {
// //         const trade = await P2PTrade.findOne({ reference: reference });

// //         if (!trade) {
// //             return console.warn(`⚠️ Webhook: Transfer completed but P2P Trade not found for reference ${reference}.`);
// //         }

// //         // Log the final confirmation of settlement. 
// //         safeLog(trade, {
// //             message: `Settlement confirmed COMPLETED by provider webhook (tx:${data.hash}).`,
// //             actor: 'system',
// //             role: 'system',
// //             time: new Date()
// //         });
        
// //         // Save to persist the log.
// //         await trade.save();
// //         console.log(`✅ Settlement completed and confirmed for trade ${reference}.`);
// //     } catch (error) {
// //         console.error(`❌ FATAL ERROR in handleTransferCompleted for reference ${reference}:`, error.message);
// //     }
// // }

// // /**
// //  * Handles transfer.failed events.
// //  */
// // async function handleTransferFailed(data) {
// //     const reference = data.reference;
// //     try {
// //         const trade = await P2PTrade.findOne({ reference: reference });

// //         if (!trade) {
// //             return console.error(`❌ Webhook: Transfer failed but P2P Trade not found for reference ${reference}. Cannot revert status.`);
// //         }

// //         const originalStatus = trade.status;
        
// //         // Only revert from COMPLETED if the transfer was the final settlement
// //         if (originalStatus === 'COMPLETED') {
// //             // Revert the status to FAILED and flag for manual review, as funds are now lost/stuck.
// //             trade.status = 'FAILED'; 

// //             safeLog(trade, {
// //                 message: `CRITICAL: Settlement FAILED by provider webhook. Status reverted from ${originalStatus} to FAILED (tx:${data.hash}). Manual review required.`,
// //                 actor: 'system',
// //                 role: 'system',
// //                 time: new Date()
// //             });

// //             await trade.save();
// //             console.error(`❌ CRITICAL: Trade ${reference} FAILED. Status reverted to FAILED. Tx Hash: ${data.hash}.`);
// //         } else {
// //             // Handle other failure cases
// //             console.warn(`⚠️ Webhook: Transfer failed for trade ${reference} in unexpected status ${originalStatus}. Logging failure.`);
// //             safeLog(trade, {
// //                 message: `Transfer FAILED by provider webhook in status ${originalStatus}.`,
// //                 actor: 'system',
// //                 role: 'system',
// //                 time: new Date()
// //             });
// //             // Mark it FAILED if it wasn't already in a final state.
// //             if (['PENDING_PAYMENT', 'ESCROWED_AWAITING_MERCHANT_TRANSFER', 'PAYMENT_CONFIRMED_BY_BUYER'].includes(originalStatus)) {
// //                 trade.status = 'FAILED';
// //                 await trade.save();
// //             }
// //         }
// //     } catch (error) {
// //         console.error(`❌ FATAL ERROR in handleTransferFailed for reference ${reference}:`, error.message);
// //     }
// // }

// // module.exports = {
// //     handleDepositConfirmed,
// //     handleWithdrawSuccess,
// //     handleTransferCompleted,
// //     handleTransferFailed
// // };


// // LETEST (DID NOT WORK )
// // const Wallet = require ("../models/walletModel.js"); 
// // const Transaction = require("../models/transactionModel.js"); 
// // const P2PTrade = require("../models/p2pModel.js"); 

// // // CRITICAL: Define your static Master Wallet Address here. 
// // const MASTER_WALLET_ADDRESS = "0x344E565D8928e2461E078201Fb086b738b1d3c48"; 
// // const SYSTEM_AUDIT_USER = 'SYSTEM_AUDIT_USER'; // Constant for logging system transactions

// // // Helper function to log trade changes
// // function safeLog(trade, entry) {
// //     trade.logs = trade.logs || [];
// //     trade.logs.push({
// //         ...entry,
// //         time: entry.time || new Date()
// //     });
// // }

// // /**
// //  * Utility function to map Blockradar status to the Transaction Model's enum.
// //  */
// // function formatStatus(blockradarStatus) {
// //     if (typeof blockradarStatus !== 'string') {
// //         return 'PENDING'; 
// //     }
// //     const status = blockradarStatus.toUpperCase();
    
// //     if (status === 'SUCCESS') {
// //         return 'COMPLETED';
// //     }
    
// //     const validStatuses = ["PENDING", "COMPLETED", "FAILED"];
// //     if (validStatuses.includes(status)) {
// //         return status;
// //     }
    
// //     return 'PENDING'; 
// // }

// // /**
// //  * Handles deposit.confirmed events, skipping deposits to the Master Wallet, and using atomic updates.
// //  */
// // async function handleDepositConfirmed(data) {
// //     const walletAddressToCredit = data.address?.address || data.recipientAddress;
// //     const txHash = data.hash;
// //     const amount = Number(data.amount);

// //     if (!walletAddressToCredit) {
// //         return console.error("⚠️ Deposit failed: Could not determine recipient wallet address from webhook data.");
// //     }

// //     try {
// //         // --- CRITICAL FIX: Skip deposits to the system's Master Wallet ---
// //         if (walletAddressToCredit.toLowerCase() === MASTER_WALLET_ADDRESS.toLowerCase()) {
// //             return console.log(`⏩ System Deposit: Funds deposited into Master Wallet ${walletAddressToCredit}. Skipping user balance update.`);
// //         }
        
// //         // 1. Check for duplicate transaction hash (to prevent double-credit)
// //         const existingTx = await Transaction.findOne({ txHash: txHash });
// //         if (existingTx) {
// //             return console.log(`⏩ Duplicate transaction detected and ignored: ${txHash}. Status: ${data.event}`);
// //         }

// //         // 2. Look up the user's wallet 
// //         let wallet = await Wallet.findOne({ accountNumber: walletAddressToCredit });
        
// //         if (!wallet) {
// //             return console.error(`❌ Critical Error: Wallet not found for deposit address ${walletAddressToCredit}. Cannot credit user.`);
// //         }

// //         const userId = wallet.user_id; 
// //         if (!userId) {
// //             return console.error("❌ CRITICAL VALIDATION FAILURE: Wallet document is missing required 'user_id'.");
// //         }

// //         // 3. ATOMICALLY Update Wallet Balance using $inc (Production Ready Fix)
// //         const updatedWallet = await Wallet.findOneAndUpdate(
// //             { _id: wallet._id },
// //             { $inc: { balance: amount } },
// //             { new: true }
// //         );

// //         if (!updatedWallet) {
// //             return console.error(`❌ ATOMIC UPDATE FAILED: Could not update balance for wallet ${walletAddressToCredit}. Manual review required.`);
// //         }

// //         console.log(`✅ Balance updated: ${amount} ${data.asset?.symbol || data.currency} credited to wallet ${walletAddressToCredit}. New Balance: ${updatedWallet.balance}`);

// //         // 4. Log Transaction
// //         await Transaction.create({
// //             walletId: wallet._id,
// //             userId: userId, 
// //             type: "DEPOSIT",
// //             amount: amount,
// //             currency: data.asset?.symbol || data.currency, 
// //             reference: data.reference,
// //             status: formatStatus(data.status), 
// //             txHash: txHash, 
// //             network: data.blockchain?.name || data.network, 
// //             blockradarWalletId: data.wallet?.id, 
// //             metadata: {
// //                 note: data.note,
// //                 externalTransactionId: data.id, 
// //                 sourceAddress: data.senderAddress,
// //                 metadata: data.metadata || {} 
// //             }
// //         });

// //         console.log(`✅ Deposit confirmed: Transaction record created for external activity.`);
// //     } catch (error) {
// //         // Must catch all database errors and log them appropriately
// //         console.error(`❌ FATAL ERROR in handleDepositConfirmed for txHash ${txHash}:`, error.message);
// //     }
// // }


// // /**
// //  * Handles withdrawal.success events, including reconciliation for missing records.
// //  */
// // async function handleWithdrawSuccess(data) {
// //     const { reference, hash: txHash, status, recipientAddress, amount } = data;

// //     try {
// //         // 1. Try to find the existing transaction record and update it
// //         let updatedTx = await Transaction.findOneAndUpdate(
// //             { reference: reference },
// //             { 
// //                 status: formatStatus(status), 
// //                 txHash: txHash, 
// //                 network: data.blockchain?.name || data.network,
// //                 metadata: {
// //                     note: data.note,
// //                     externalTransactionId: data.id, 
// //                     recipientAddress: recipientAddress
// //                 }
// //             },
// //             { new: true }
// //         );
        
// //         if (!updatedTx) {
// //             // --- RECONCILIATION FALLBACK: Attempt to reconstruct the record ---
// //             console.warn(`⚠️ RECONCILIATION NEEDED: Transaction not found for reference ${reference}. Attempting to reconstruct record.`);

// //             // FIX: Ensure the reference is cleaned up (trimmed) before checking the prefix.
// //             const isInternalFunding = reference && reference.trim().startsWith('Master-Fund-'); 

// //             if (isInternalFunding) {
// //                 // Production ready fix: Log the system transaction for auditability
// //                 let systemWallet = await Wallet.findOne({ accountNumber: MASTER_WALLET_ADDRESS });

// //                 // CRITICAL FIX: Find or Create the Master Wallet document if it's missing from the DB
// //                 if (!systemWallet) {
// //                     console.warn(`⚠️ MASTER WALLET MISSING: Creating system audit wallet document for address ${MASTER_WALLET_ADDRESS}.`);
                    
// //                     // --- FIX FOR SCHEMA ERRORS (user_id/ObjectId and currency/Enum) ---
// //                     try {
// //                         systemWallet = await Wallet.create({
// //                             accountNumber: MASTER_WALLET_ADDRESS,
// //                             // FIX 1: Omit user_id to avoid ObjectId casting error.
// //                             balance: 0, 
// //                             // FIX 2: Use a generic, likely supported currency like 'USD' instead of data.asset?.symbol (e.g., 'USDC')
// //                             currency: 'USD', 
// //                             externalWalletId: 'SYSTEM_MASTER',
// //                         });
// //                         console.log(`✅ System Master Wallet document successfully created/reconciled.`);
// //                     } catch (walletCreationError) {
// //                         // If it fails here, something is fundamentally wrong with the Wallet schema.
// //                         console.error(`❌ FATAL ERROR: Failed to create System Wallet document:`, walletCreationError.message);
// //                         return; // Stop execution if the wallet can't be created/found.
// //                     }
// //                 }

// //                 if (systemWallet) {
// //                     // Note: We use the SYSTEM_AUDIT_USER string explicitly for the Transaction, 
// //                     // as it's an audit log, not a user-linked wallet withdrawal.
// //                     await Transaction.create({
// //                         walletId: systemWallet._id, 
// //                         userId: SYSTEM_AUDIT_USER, // Using the string constant here is appropriate for the Transaction model audit log
// //                         type: "SYSTEM_WITHDRAWAL", 
// //                         amount: Number(amount),
// //                         currency: data.asset?.symbol || data.currency, // Use the actual currency for the transaction log
// //                         reference: reference,
// //                         status: 'COMPLETED',
// //                         txHash: txHash,
// //                         network: data.blockchain?.name || data.network,
// //                         blockradarWalletId: data.wallet?.id,
// //                         metadata: {
// //                             note: data.note || 'RECONCILED: System funding record.',
// //                             externalTransactionId: data.id,
// //                             recipientAddress: recipientAddress
// //                         }
// //                     });
// //                     console.log(`✅ INTERNAL FUNDING SUCCESS: Created COMPLETED System transaction record for ${reference}.`);
// //                 } else {
// //                     // This should theoretically not be hit now
// //                     console.error(`❌ RECONCILIATION FAILED: Master Wallet record could not be found OR created in DB (${MASTER_WALLET_ADDRESS}). Manual intervention required for ${reference}.`);
// //                 }
                
// //             } else {
// //                 // 2. Find the associated P2P Trade (Original logic for non-system references)
// //                 const trade = await P2PTrade.findOne({ reference: reference }); 

// //                 if (trade && (trade.userId || trade.merchantId)) { 
// //                     // We need to fetch the wallet ID for the user who initiated the withdrawal.
// //                     const targetUserId = trade.userId || trade.merchantId; 
// //                     const targetWallet = await Wallet.findOne({ user_id: targetUserId });

// //                     if (targetWallet) {
// //                         await Transaction.create({
// //                             walletId: targetWallet._id, 
// //                             userId: targetUserId,
// //                             type: "WITHDRAWAL",
// //                             amount: Number(amount),
// //                             currency: data.asset?.symbol || data.currency,
// //                             reference: reference,
// //                             status: 'COMPLETED', // Confirmed successful by Blockradar
// //                             txHash: txHash,
// //                             network: data.blockchain?.name || data.network,
// //                             blockradarWalletId: data.wallet?.id,
// //                             metadata: {
// //                                 note: data.note || 'RECONCILED: Initial record creation failed.',
// //                                 externalTransactionId: data.id,
// //                                 recipientAddress: recipientAddress
// //                             }
// //                         });
// //                         console.log(`✅ RECONCILIATION SUCCESS: Created COMPLETED transaction record for ${reference}.`);
// //                     } else {
// //                         console.error(`❌ RECONCILIATION FAILED: Found Trade but could not find a Wallet for user ID ${targetUserId}.`);
// //                     }
// //                 } else {
// //                     console.error(`❌ RECONCILIATION FAILED: Could not find associated P2P Trade/User for reference ${reference}. Manual intervention required.`);
// //                 }
// //             }
// //         }

// //         // Only log confirmation if the previous steps didn't exit early
// //         if (updatedTx || isInternalFunding) {
// //              console.log(`✅ Withdrawal success confirmed for transaction ${reference}.`);
// //         }
       
// //     } catch (error) {
// //         console.error(`❌ FATAL ERROR in handleWithdrawSuccess for reference ${reference}:`, error.message);
// //     }
// // }

// // /**
// //  * Handles transfer.completed events.
// //  */
// // async function handleTransferCompleted(data) {
// //     const reference = data.reference;
// //     try {
// //         const trade = await P2PTrade.findOne({ reference: reference });

// //         if (!trade) {
// //             return console.warn(`⚠️ Webhook: Transfer completed but P2P Trade not found for reference ${reference}.`);
// //         }

// //         // Log the final confirmation of settlement. 
// //         safeLog(trade, {
// //             message: `Settlement confirmed COMPLETED by provider webhook (tx:${data.hash}).`,
// //             actor: 'system',
// //             role: 'system',
// //             time: new Date()
// //         });
        
// //         // Save to persist the log.
// //         await trade.save();
// //         console.log(`✅ Settlement completed and confirmed for trade ${reference}.`);
// //     } catch (error) {
// //         console.error(`❌ FATAL ERROR in handleTransferCompleted for reference ${reference}:`, error.message);
// //     }
// // }

// // /**
// //  * Handles transfer.failed events.
// //  */
// // async function handleTransferFailed(data) {
// //     const reference = data.reference;
// //     try {
// //         const trade = await P2PTrade.findOne({ reference: reference });

// //         if (!trade) {
// //             return console.error(`❌ Webhook: Transfer failed but P2P Trade not found for reference ${reference}. Cannot revert status.`);
// //         }

// //         const originalStatus = trade.status;
        
// //         // Only revert from COMPLETED if the transfer was the final settlement
// //         if (originalStatus === 'COMPLETED') {
// //             // Revert the status to FAILED and flag for manual review, as funds are now lost/stuck.
// //             trade.status = 'FAILED'; 

// //             safeLog(trade, {
// //                 message: `CRITICAL: Settlement FAILED by provider webhook. Status reverted from ${originalStatus} to FAILED (tx:${data.hash}). Manual review required.`,
// //                 actor: 'system',
// //                 role: 'system',
// //                 time: new Date()
// //             });

// //             await trade.save();
// //             console.error(`❌ CRITICAL: Trade ${reference} FAILED. Status reverted to FAILED. Tx Hash: ${data.hash}.`);
// //         } else {
// //             // Handle other failure cases
// //             console.warn(`⚠️ Webhook: Transfer failed for trade ${reference} in unexpected status ${originalStatus}. Logging failure.`);
// //             safeLog(trade, {
// //                 message: `Transfer FAILED by provider webhook in status ${originalStatus}.`,
// //                 actor: 'system',
// //                 role: 'system',
// //                 time: new Date()
// //             });
// //             // Mark it FAILED if it wasn't already in a final state.
// //             if (['PENDING_PAYMENT', 'ESCROWED_AWAITING_MERCHANT_TRANSFER', 'PAYMENT_CONFIRMED_BY_BUYER'].includes(originalStatus)) {
// //                 trade.status = 'FAILED';
// //                 await trade.save();
// //             }
// //         }
// //     } catch (error) {
// //         console.error(`❌ FATAL ERROR in handleTransferFailed for reference ${reference}:`, error.message);
// //     }
// // }

// // module.exports = {
// //     handleDepositConfirmed,
// //     handleWithdrawSuccess,
// //     handleTransferCompleted,
// //     handleTransferFailed
// // };
// const Wallet = require ("../models/walletModel.js"); 
// const Transaction = require("../models/transactionModel.js"); 
// const P2PTrade = require("../models/p2pModel.js"); 

// // CRITICAL: Define your static Master Wallet Address here. 
// const MASTER_WALLET_ADDRESS = "0x344E565D8928e2461E078201Fb086b738b1d3c48"; 


// // FIX: Define a static, valid ObjectId for system audit records. 
// const SYSTEM_USER_ID_AUDIT = 'ffffffffffffffffffffffff'; // A static, valid 24-character hexadecimal ObjectId
// const SYSTEM_AUDIT_USER_REFERENCE = 'SYSTEM_AUDIT_USER'; // Constant for human-readable logging

// // Helper function to log trade changes
// function safeLog(trade, entry) {
//     trade.logs = trade.logs || [];
//     trade.logs.push({
//         ...entry,
//         time: entry.time || new Date()
//     });
// }

// /**
//  * Utility function to map Blockradar status to the Transaction Model's enum.
//  */
// function formatStatus(blockradarStatus) {
//     if (typeof blockradarStatus !== 'string') {
//         return 'PENDING'; 
//     }
//     const status = blockradarStatus.toUpperCase();
    
//     if (status === 'SUCCESS') {
//         return 'COMPLETED';
//     }
    
//     const validStatuses = ["PENDING", "COMPLETED", "FAILED"];
//     if (validStatuses.includes(status)) {
//         return status;
//     }
    
//     return 'PENDING'; 
// }

// /**
//  * Handles deposit.confirmed events, skipping deposits to the Master Wallet, and using atomic updates.
//  */
// async function handleDepositConfirmed(data) {
//     const walletAddressToCredit = data.address?.address || data.recipientAddress;
//     const txHash = data.hash;
//     const amount = Number(data.amount);

//     if (!walletAddressToCredit) {
//         return console.error("⚠️ Deposit failed: Could not determine recipient wallet address from webhook data.");
//     }

//     try {
//         // --- CRITICAL FIX: Skip deposits to the system's Master Wallet ---
//         if (walletAddressToCredit.toLowerCase() === MASTER_WALLET_ADDRESS.toLowerCase()) {
//             return console.log(`⏩ System Deposit: Funds deposited into Master Wallet ${walletAddressToCredit}. Skipping user balance update.`);
//         }
        
//         // 1. Check for duplicate transaction hash (to prevent double-credit)
//         const existingTx = await Transaction.findOne({ txHash: txHash });
//         if (existingTx) {
//             return console.log(`⏩ Duplicate transaction detected and ignored: ${txHash}. Status: ${data.event}`);
//         }

//         // 2. Look up the user's wallet 
//         let wallet = await Wallet.findOne({ accountNumber: walletAddressToCredit });
        
//         if (!wallet) {
//             return console.error(`❌ Critical Error: Wallet not found for deposit address ${walletAddressToCredit}. Cannot credit user.`);
//         }

//         const userId = wallet.user_id; 
//         if (!userId) {
//             return console.error("❌ CRITICAL VALIDATION FAILURE: Wallet document is missing required 'user_id'.");
//         }

//         // 3. ATOMICALLY Update Wallet Balance using $inc (Production Ready Fix)
//         const updatedWallet = await Wallet.findOneAndUpdate(
//             { _id: wallet._id },
//             { $inc: { balance: amount } },
//             { new: true }
//         );

//         if (!updatedWallet) {
//             return console.error(`❌ ATOMIC UPDATE FAILED: Could not update balance for wallet ${walletAddressToCredit}. Manual review required.`);
//         }

//         console.log(`✅ Balance updated: ${amount} ${data.asset?.symbol || data.currency} credited to wallet ${walletAddressToCredit}. New Balance: ${updatedWallet.balance}`);

//         // 4. Log Transaction
//         await Transaction.create({
//             walletId: wallet._id,
//             userId: userId, 
//             type: "DEPOSIT",
//             amount: amount,
//             currency: data.asset?.symbol || data.currency, 
//             reference: data.reference,
//             status: formatStatus(data.status), 
//             txHash: txHash, 
//             network: data.blockchain?.name || data.network, 
//             blockradarWalletId: data.wallet?.id, 
//             metadata: {
//                 note: data.note,
//                 externalTransactionId: data.id, 
//                 sourceAddress: data.senderAddress,
//                 metadata: data.metadata || {} 
//             }
//         });

//         console.log(`✅ Deposit confirmed: Transaction record created for external activity.`);
//     } catch (error) {
//         // Must catch all database errors and log them appropriately
//         console.error(`❌ FATAL ERROR in handleDepositConfirmed for txHash ${txHash}:`, error.message);
//     }
// }


// /**
//  * Handles withdrawal.success events, including reconciliation for missing records.
//  */
// async function handleWithdrawSuccess(data) {
//     const { reference, hash: txHash, status, recipientAddress, amount } = data;

//     try {
//         // CRITICAL FIX: Define isInternalFunding in the try block scope.
//         // Check if the reference starts with 'Master-Fund-', indicating a system operation.
//         const isInternalFunding = reference && reference.trim().startsWith('Master-Fund-'); 

//         // 1. Try to find the existing transaction record and update it
//         let updatedTx = await Transaction.findOneAndUpdate(
//             { reference: reference },
//             { 
//                 status: formatStatus(status), 
//                 txHash: txHash, 
//                 network: data.blockchain?.name || data.network,
//                 metadata: {
//                     note: data.note,
//                     externalTransactionId: data.id, 
//                     recipientAddress: recipientAddress
//                 }
//             },
//             { new: true }
//         );
        
//         if (!updatedTx) {
//             // --- RECONCILIATION FALLBACK: Attempt to reconstruct the record ---
//             console.warn(`⚠️ RECONCILIATION NEEDED: Transaction not found for reference ${reference}. Attempting to reconstruct record.`);

//             if (isInternalFunding) {
//                 // Production ready fix: Log the system transaction for auditability
//                 let systemWallet = await Wallet.findOne({ accountNumber: MASTER_WALLET_ADDRESS });

//                 // CRITICAL FIX: Find or Create the Master Wallet document if it's missing from the DB
//                 if (!systemWallet) {
//                     console.warn(`⚠️ MASTER WALLET MISSING: Creating system audit wallet document for address ${MASTER_WALLET_ADDRESS}.`);
                    
//                     try {
//                         systemWallet = await Wallet.create({
//                             accountNumber: MASTER_WALLET_ADDRESS,
//                             // user_id is now optional in the schema 
//                             userId: SYSTEM_USER_ID_AUDIT, // Use the static valid ObjectId
//                             walletType: 'SYSTEM', // Added based on WalletModel fix
//                             balance: 0, 
//                             currency: 'USD', 
//                             externalWalletId: 'SYSTEM_MASTER',
//                         });
//                         console.log(`✅ System Master Wallet document successfully created/reconciled.`);
//                     } catch (walletCreationError) {
//                         console.error(`❌ FATAL ERROR: Failed to create System Wallet document:`, walletCreationError.message);
//                         return; // Stop execution if the wallet can't be created/found.
//                     }
//                 }

//                 if (systemWallet) {
//                     // Note: We use the SYSTEM_USER_ID_AUDIT for the Transaction, as it's an audit log.
//                     await Transaction.create({
//                         walletId: systemWallet._id, 
//                         userId: SYSTEM_USER_ID_AUDIT, // Use the static valid ObjectId
//                         type: "WITHDRAWAL", 
//                         amount: Number(amount),
//                         currency: data.asset?.symbol || data.currency, 
//                         reference: reference,
//                         status: 'COMPLETED',
//                         txHash: undefined, // CRITICAL FIX: DO NOT use txHash for system audit withdrawals to avoid E11000 conflict with deposit record
//                         network: data.blockchain?.name || data.network,
//                         blockradarWalletId: data.wallet?.id,
//                         metadata: {
//                             note: data.note || 'RECONCILED: System funding record.',
//                             externalTransactionId: data.id,
//                             recipientAddress: recipientAddress
//                         }
//                     });
//                     console.log(`✅ INTERNAL FUNDING SUCCESS: Created COMPLETED System transaction record for ${reference}.`);
//                 } else {
//                     console.error(`❌ RECONCILIATION FAILED: Master Wallet record could not be found OR created in DB (${MASTER_WALLET_ADDRESS}). Manual intervention required for ${reference}.`);
//                 }
                
//             } else {
//                 // 2. Find the associated P2P Trade (Original logic for non-system references)
//                 const trade = await P2PTrade.findOne({ reference: reference }); 

//                 if (trade && (trade.userId || trade.merchantId)) { 
//                     // We need to fetch the wallet ID for the user who initiated the withdrawal.
//                     const targetUserId = trade.userId || trade.merchantId; 
//                     const targetWallet = await Wallet.findOne({ user_id: targetUserId });

//                     if (targetWallet) {
//                         await Transaction.create({
//                             walletId: targetWallet._id, 
//                             userId: targetUserId,
//                             type: "WITHDRAWAL",
//                             amount: Number(amount),
//                             currency: data.asset?.symbol || data.currency,
//                             reference: reference,
//                             status: 'COMPLETED', // Confirmed successful by Blockradar
//                             txHash: txHash,
//                             network: data.blockchain?.name || data.network,
//                             blockradarWalletId: data.wallet?.id,
//                             metadata: {
//                                 note: data.note || 'RECONCILED: Initial record creation failed.',
//                                 externalTransactionId: data.id,
//                                 recipientAddress: recipientAddress
//                             }
//                         });
//                         console.log(`✅ RECONCILIATION SUCCESS: Created COMPLETED transaction record for ${reference}.`);
//                     } else {
//                         console.error(`❌ RECONCILIATION FAILED: Found Trade but could not find a Wallet for user ID ${targetUserId}.`);
//                     }
//                 } else {
//                     console.error(`❌ RECONCILIATION FAILED: Could not find associated P2P Trade/User for reference ${reference}. Manual intervention required.`);
//                 }
//             }
//         }
        
//         // This final check now works because isInternalFunding is defined in the outer scope
//         if (updatedTx || isInternalFunding) {
//              console.log(`✅ Withdrawal success confirmed for transaction ${reference}.`);
//         } else {
//              console.log(`⚠️ Withdrawal success processed, but no transaction record was found or created for ${reference}.`);
//         }
       
//     } catch (error) {
//         console.error(`❌ FATAL ERROR in handleWithdrawSuccess for reference ${reference}:`, error.message);
//     }
// }

// /**
//  * Handles transfer.completed events.
//  */
// async function handleTransferCompleted(data) {
//     const reference = data.reference;
//     try {
//         const trade = await P2PTrade.findOne({ reference: reference });

//         if (!trade) {
//             return console.warn(`⚠️ Webhook: Transfer completed but P2P Trade not found for reference ${reference}.`);
//         }

//         // Log the final confirmation of settlement. 
//         safeLog(trade, {
//             message: `Settlement confirmed COMPLETED by provider webhook (tx:${data.hash}).`,
//             actor: 'system',
//             role: 'system',
//             time: new Date()
//         });
        
//         // Save to persist the log.
//         await trade.save();
//         console.log(`✅ Settlement completed and confirmed for trade ${reference}.`);
//     } catch (error) {
//         console.error(`❌ FATAL ERROR in handleTransferCompleted for reference ${reference}:`, error.message);
//     }
// }

// /**
//  * Handles transfer.failed events.
//  */
// async function handleTransferFailed(data) {
//     const reference = data.reference;
//     try {
//         const trade = await P2PTrade.findOne({ reference: reference });

//         if (!trade) {
//             return console.error(`❌ Webhook: Transfer failed but P2P Trade not found for reference ${reference}. Cannot revert status.`);
//         }

//         const originalStatus = trade.status;
        
//         // Only revert from COMPLETED if the transfer was the final settlement
//         if (originalStatus === 'COMPLETED') {
//             // Revert the status to FAILED and flag for manual review, as funds are now lost/stuck.
//             trade.status = 'FAILED'; 

//             safeLog(trade, {
//                 message: `CRITICAL: Settlement FAILED by provider webhook. Status reverted from ${originalStatus} to FAILED (tx:${data.hash}). Manual review required.`,
//                 actor: 'system',
//                 role: 'system',
//                 time: new Date()
//             });

//             await trade.save();
//             console.error(`❌ CRITICAL: Trade ${reference} FAILED. Status reverted to FAILED. Tx Hash: ${data.hash}.`);
//         } else {
//             // Handle other failure cases
//             console.warn(`⚠️ Webhook: Transfer failed for trade ${reference} in unexpected status ${originalStatus}. Logging failure.`);
//             safeLog(trade, {
//                 message: `Transfer FAILED by provider webhook in status ${originalStatus}.`,
//                 actor: 'system',
//                 role: 'system',
//                 time: new Date()
//             });
//             // Mark it FAILED if it wasn't already in a final state.
//             if (['PENDING_PAYMENT', 'ESCROWED_AWAITING_MERCHANT_TRANSFER', 'PAYMENT_CONFIRMED_BY_BUYER'].includes(originalStatus)) {
//                 trade.status = 'FAILED';
//                 await trade.save();
//             }
//         }
//     } catch (error) {
//         console.error(`❌ FATAL ERROR in handleTransferFailed for reference ${reference}:`, error.message);
//     }
// }

// module.exports = {
//     handleDepositConfirmed,
//     handleWithdrawSuccess,
//     handleTransferCompleted,
//     handleTransferFailed
// };
// services/transactionHandlers.js

const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");
const FeeLog = require("../models/feeLogModel");
const Decimal = require("decimal.js"); // <--- ADDED: Import Decimal.js

// UPDATED: Calculate the fee percentage using Decimal for precision
const DEPOSIT_FEE_PERCENT_DECIMAL = new Decimal(process.env.DEPOSIT_FEE_PERCENT || "1").dividedBy(100);

async function handleDepositConfirmed(eventData = {}) {
    // IMPORTANT: Convert gross amount to string before passing to Decimal constructor for max precision
    const grossAmountStr = String(eventData.amount || 0); 
    const currency = eventData.asset || eventData.currency || "USDC";

    const wallet = await Wallet.findOne({ externalWalletId: eventData.walletId });
    if (!wallet) {
        console.warn("Deposit for unknown wallet:", eventData.walletId);
        return null;
    }

    // --- Decimal.js Logic for Deposit Fee Calculation ---
    const grossAmt = new Decimal(grossAmountStr);

    // Calculate Fee (keeping 8 decimals for crypto/stablecoin standard)
    const feeAmountDecimal = grossAmt.mul(DEPOSIT_FEE_PERCENT_DECIMAL).toDecimalPlaces(8);
    // Calculate Net Amount
    const netAmountDecimal = grossAmt.sub(feeAmountDecimal).toDecimalPlaces(8);

    // Convert results back to standard Number for Mongoose storage
    const grossAmount = Number(grossAmt.toString());
    const feeAmount = Number(feeAmountDecimal.toString());
    const netAmount = Number(netAmountDecimal.toString());
    // --- END Decimal.js Logic ---

    await Wallet.updateOne(
        { _id: wallet._id },
        { $inc: { balance: netAmount } } // Use the precise net amount
    );

    const tx = await Transaction.create({
        walletId: wallet._id,
        userId: wallet.user_id,
        type: "DEPOSIT",
        amount: grossAmount,
        currency,
        status: "COMPLETED",
        reference: eventData.reference || `deposit-${Date.now()}`,
        metadata: { providerData: eventData },
        feeDetails: {
            totalFee: feeAmount,
            currency,
            platformFee: feeAmount,
            networkFee: 0,
            isDeductedFromAmount: true
        }
    });

    await FeeLog.create({
        userId: wallet.user_id,
        transactionId: tx._id,
        type: "DEPOSIT",
        currency,
        grossAmount,
        feeAmount,
        platformFee: feeAmount,
        networkFee: 0,
        reference: eventData.reference,
        metadata: { providerData: eventData }
    });

    return tx;
}

async function handleWithdrawSuccess(eventData = {}) {
    const reference = eventData.reference;

    if (!reference) {
        console.warn("withdraw.success missing reference:", eventData);
        return null;
    }

    const tx = await Transaction.findOne({ reference });
    if (!tx) {
        console.warn("withdraw.success for unknown tx ref:", reference);
        return null;
    }

    // Mark transaction completed
    tx.status = "COMPLETED";
    tx.metadata = tx.metadata || {};
    tx.metadata.providerData = eventData;

    // --- NEW: Save provider network fee (if provided) ---
    if (eventData.providerNetworkFee) {
        const networkFee = Number(eventData.providerNetworkFee);

        if (!tx.feeDetails) tx.feeDetails = {};
        tx.feeDetails.networkFee = networkFee;

        tx.markModified("feeDetails");

        await FeeLog.findOneAndUpdate(
            { transactionId: tx._id },
            { $set: { networkFee } }
        );
    }

    await tx.save();
    return tx;
}

module.exports = { handleDepositConfirmed, handleWithdrawSuccess };