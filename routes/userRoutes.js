const express = require("express");
const router = express.Router();
const {
  addUserBank,
  getMe,
  updateMe,
} = require("../controllers/userController");
const { verifyToken } = require("../middlewares/validateToken");
const { walletLimiter } = require("../middlewares/rateLimiter");

// The "Get Me" endpoint
router.get("/me", verifyToken, walletLimiter, getMe);
// Route to update user profile information
router.patch("/update-me", verifyToken, walletLimiter, updateMe);
// Route to add a bank account
router.post("/bank-account", verifyToken, walletLimiter, addUserBank);

module.exports = router;
