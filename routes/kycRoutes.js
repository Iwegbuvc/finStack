const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/validateToken");
const {
  kycRateLimit,
  kycIpLimiter,
  walletLimiter,
} = require("../middlewares/rateLimiter");
const { upload, uploadErrorHandler } = require("../utilities/fileUpload");
const kycController = require("../controllers/kycController");

// POST: create short-lived KYC session token
router.post(
  "/kycSession",
  verifyToken,
  kycIpLimiter,
  kycController.createKycSession
);

// POST: perform liveliness check (rate limited)
router.post(
  "/kycLiveliness",
  verifyToken,
  kycIpLimiter,
  kycController.livelinessCheck
);

// POST: final KYC submission (requires liveliness proven)
router.post(
  "/submitKyc",
  verifyToken, // user must be logged in
  kycIpLimiter, // protect against IP spam
  kycRateLimit, // ensure only 1 KYC per 24 hours
  upload.fields([
    { name: "selfie", maxCount: 1 },
    { name: "proof_id_front", maxCount: 1 },
    { name: "proof_id_back", maxCount: 1 },
    { name: "proof_address", maxCount: 1 },
  ]),
  uploadErrorHandler,
  kycController.submitKYC
);
router.get(
  "/getSingleKyc/:id",
  verifyToken,
  walletLimiter,
  kycController.getSingleKyc
);

module.exports = router;
