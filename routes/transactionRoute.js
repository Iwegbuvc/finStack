const express = require("express");
const { verifyToken} = require("../middlewares/validateToken");
const { getUserTransactions } = require("../controllers/transactionController");

const router = express.Router();

// User transaction history
router.get("/my-transactions", verifyToken, getUserTransactions);


module.exports = router;
