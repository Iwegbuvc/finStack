// const express = require("express");
// const router = express.Router();
// const p2pController = require("../controllers/p2pController");
// const { verifyToken } = require("../middlewares/validateToken"); 
// const { transactionLimiter } = require("../middlewares/rateLimiter")

// router.post("/trade/initiate", verifyToken, transactionLimiter, p2pController.createTrade);
// router.post("/trade/:reference/confirm-buyer-payment", verifyToken,transactionLimiter, p2pController.buyerConfirmPayment);
// router.post("/trade/:reference/confirm-merchant-payment", verifyToken, transactionLimiter, p2pController.merchantConfirmPayment);
// router.delete("/trade/:reference/cancel", verifyToken, p2pController.cancelTrade);
// module.exports = router;
const express = require("express");
const router = express.Router();
const p2pController = require("../controllers/p2pController");
const { verifyToken } = require("../middlewares/validateToken"); 
const { transactionLimiter } = require("../middlewares/rateLimiter")

// router.post("/trade/initiate", verifyToken, transactionLimiter, p2pController.createTrade);
router.post("/trade/initiate/:adId", verifyToken, transactionLimiter, p2pController.createTrade);

router.post("/trade/:reference/confirm-buyer-payment", verifyToken,transactionLimiter, p2pController.buyerConfirmPayment);

// ⬅️ CRITICAL FIX: ADD THIS ROUTE FOR OTP INITIATION
router.post("/trade/:reference/initiate-merchant-confirmation", verifyToken, transactionLimiter, p2pController.initiateMerchantConfirmPayment);

router.post("/trade/:reference/confirm-merchant-payment", verifyToken, transactionLimiter, p2pController.merchantConfirmPayment);
router.delete("/trade/:reference/cancel", verifyToken, p2pController.cancelTrade);
module.exports = router;