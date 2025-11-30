const p2pService = require("../services/p2pService");
const ninePsbService = require("../services/providers/ninePSBServices");

// 9PSB requires a 200 OK response immediately upon receipt of the webhook.
const ACKNOWLEDGEMENT_RESPONSE = {
    "success": true,
    "status": "success",
    "code": "00",
    "message": "Acknowledged"
}

/**
 * @name ninePSBWebhook
 * @description Handles incoming webhooks from 9PSB.
 * CRITICAL: The response (res.status(200)) MUST be sent immediately before any heavy processing
 * to prevent the provider from retrying the webhook unnecessarily.
 */
const ninePSBWebhook = async (req, res) => {
    // 1. Send immediate 200 OK Acknowledgment
    res.status(200).json(ACKNOWLEDGEMENT_RESPONSE); // CRITICAL: Respond immediately to prevent retries

    // 2. Asynchronous Processing
    try {
        const data = req.body;
        // console.log("DEBUG: Full 9PSB Webhook Body:", req.body); // You can remove this now

        // The event type is passed in the query params by convention: e.g., ?event=transfer
       const event = req.query.event || req.body.event || 'transfer'; // Assume 'transfer' if not provided
       
        // FINAL FIX: Extract the reference using the correct key 'transactionref'
        const reference = data.transactionref || data.nipsessionid || data.orderref; 

        console.log(`📩 9PSB webhook received [${event || 'NO_EVENT'}]: Ref: ${reference || 'N/A'}`);
        
        // --- Core P2P Logic ---
        // The logic now correctly checks for the 'transfer' event and a valid reference string
        if (event === 'transfer' && reference) { 
            // This event signals a transfer completion (e.g., Buyer NGN deposit or Escrow release).
            // The service layer will handle the mandatory TSQ call for final status confirmation.
            await p2pService.processNinePsbTransferWebhook(data);
        } else if (event === 'account-upgrade') {
            // Handle account upgrade logic here if needed
            console.log(`ℹ️ Received account-upgrade webhook for account: ${data.accountnumber}`);
        } else {
             console.log(`⚠️ Unhandled or missing event type/reference for 9PSB webhook. Event: ${event}, Ref: ${reference}`);
        }
        
    } catch (error) {
        // IMPORTANT: The response has already been sent, so we must only log errors.
        console.error("❌ 9PSB webhook error during ASYNCHRONOUS processing:", error);
    }
};

module.exports = {
    ninePSBWebhook,
};