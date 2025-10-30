const express = require("express");
const router = express.Router();
const { handleBlockradarWebhook } = require("../controllers/webhookController");

// Blockradar will POST here
router.post("/blockradar", handleBlockradarWebhook);

module.exports = router;
