const express = require("express");
const { verifyToken, isAdmin } = require("../middlewares/validateToken");
const { getUserTransactions,getAllTransactions, } = require("../controllers/transactionController");

const router = express.Router();

// User transaction history
router.get("/my-transactions", verifyToken, getUserTransactions);

// Admin only routes
router.get("/admin/all", verifyToken, isAdmin, getAllTransactions);

module.exports = router;
