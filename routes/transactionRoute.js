const express = require("express");
const { verifyToken } = require("../middlewares/validateToken");
const { getUserTransactions } = require("../controllers/transactionController");
const { walletLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

// User transaction history
router.get("/my-transactions", verifyToken, walletLimiter, getUserTransactions);

module.exports = router;
