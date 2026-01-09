const express = require("express");
const router = express.Router();
const p2pController = require("../controllers/p2pController");
const { verifyToken } = require("../middlewares/validateToken");
const {
  transactionLimiter,
  walletLimiter,
} = require("../middlewares/rateLimiter");

// router.post("/trade/initiate", verifyToken, transactionLimiter, p2pController.createTrade);
router.post(
  "/trade/initiate/:adId",
  verifyToken,
  transactionLimiter,
  p2pController.createTrade
);

router.post(
  "/trade/:reference/confirm-buyer-payment",
  verifyToken,
  transactionLimiter,
  p2pController.buyerConfirmPayment
);
// MERCHANT PAID FAIT CONFIRMATION
router.post(
  "/trade/:reference/merchant-paid",
  verifyToken,
  transactionLimiter,
  p2pController.merchantMarkPaid
);
// OTP & Settlement
router.post(
  "/trade/:reference/initiate-release",
  verifyToken,
  transactionLimiter,
  p2pController.initiateSettlementOTP
);
router.post(
  "/trade/:reference/confirm-release",
  verifyToken,
  transactionLimiter,
  p2pController.confirmAndReleaseCrypto
);
// Management
router.delete(
  "/trade/:reference/cancel",
  verifyToken,
  transactionLimiter,
  p2pController.cancelTrade
);
router.get(
  "/trade/:reference",
  verifyToken,
  walletLimiter,
  p2pController.getTradeDetails
);
module.exports = router;
