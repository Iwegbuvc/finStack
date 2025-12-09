const rateLimit = require("express-rate-limit");
const Kyc = require("../models/kycModel"); // 💡 REQUIRED: Make sure the path to kycModel is correct

// =======================================================
// 1. EXPRESS-RATE-LIMIT Limiters (IP-based/Rolling Window)
// =======================================================

// For general wallet queries (e.g., checking balance)
const walletLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Max 10 requests per minute
  message: "Too many wallet requests, please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
});

// For sensitive routes like deposit/withdraw
const transactionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 3, // Only 3 deposits/withdrawals per minute
  message: "Too many transaction attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// For authentication routes (login, register, forgot-password)
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Max 5 requests per 5 minutes per IP
  message: "Too many login/registration attempts, please try again in 5 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
});


// 2. CUSTOM Database-Backed Limiter (24-hour KYC Cooldown)

const kycRateLimit = async (req, res, next) => {
  try {
    // ⚠️ CRITICAL: Requires req.user.id to be populated by a preceding middleware (e.g., verifyToken)
    const userId = req.user.id;

    // Find the most recent KYC submission
    const lastKYC = await Kyc.findOne({ user_id: userId }).sort({ createdAt: -1 });

    if (lastKYC) {
      const now = new Date();
      const diffMs = now - lastKYC.createdAt; // milliseconds
      const hoursSinceLast = diffMs / 1000 / 60 / 60;

      if (hoursSinceLast < 24) {
        return res.status(429).json({ message: "You can only submit KYC once every 24 hours" });
      }
    }

    next();
  } catch (error) {
    console.error("KYC rate limit error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
const kycIpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 6, // per IP
  message: { message: "Too many KYC attempts from this IP, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { kycRateLimit, kycIpLimiter, walletLimiter, transactionLimiter, authLimiter };