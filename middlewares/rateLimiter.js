const rateLimit = require("express-rate-limit");

// For general wallet queries (e.g., checking balance)
const walletLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Max 10 requests per minute
  message: "Too many wallet requests, please slow down.",
});

// For sensitive routes like deposit/withdraw
const transactionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 3, // Only 3 deposits/withdrawals per minute
  message: "Too many transaction attempts, please try again later.",
});

module.exports = { walletLimiter, transactionLimiter };

