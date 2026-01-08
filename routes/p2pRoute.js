const express = require("express");
const router = express.Router();
const p2pController = require("../controllers/p2pController");
const { verifyToken } = require("../middlewares/validateToken"); 
const { transactionLimiter } = require("../middlewares/rateLimiter")

// router.post("/trade/initiate", verifyToken, transactionLimiter, p2pController.createTrade);
router.post("/trade/initiate/:adId", verifyToken, transactionLimiter, p2pController.createTrade);

router.post("/trade/:reference/confirm-buyer-payment", verifyToken,transactionLimiter, p2pController.buyerConfirmPayment);
// MERCHANT PAID FAIT CONFIRMATION 
router.post("/trade/:reference/merchant-paid", verifyToken, p2pController.merchantMarkPaid);
// Route to request OTP (The Seller calls this)
router.post("/trade/:reference/initiate-release", verifyToken, transactionLimiter, p2pController.initiateSettlementOTP);
// Route to verify OTP and release (The Seller calls this)
router.post("/trade/:reference/confirm-release", verifyToken, transactionLimiter, p2pController.confirmAndReleaseCrypto);
// router.post("/trade/:reference/confirm-merchant-payment", verifyToken, transactionLimiter, p2pController.merchantConfirmPayment);
router.delete("/trade/:reference/cancel", verifyToken, p2pController.cancelTrade);
router.get("/trade/:reference", verifyToken, p2pController.getTradeDetails);
module.exports = router;