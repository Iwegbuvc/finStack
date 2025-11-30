const express = require("express");
const router = express.Router();
const { handleBlockradarWebhook } = require("../controllers/webhookController");
const { ninePSBWebhook } = require("../controllers/ninepsbWebhook");
const { basicAuthMiddleware } = require("../middlewares/ninepsbAuth"); 

// Blockradar PUSH notifications
router.post("/blockradar", handleBlockradarWebhook);

// NEW: 9PSB Webhook for NGN Inflow/Status (Protected by Basic Auth)
// The endpoint should be what you register with 9PSB (e.g., /webhooks/9psb/notify)
router.post("/9psb/notify", basicAuthMiddleware, ninePSBWebhook); 

module.exports = router;