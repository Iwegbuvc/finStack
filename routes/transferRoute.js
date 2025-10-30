const express = require("express");
const { transferIn, transferFunds } = require("../controllers/transferController");
const { verifyToken } = require("../middlewares/validateToken");

const router = express.Router();

router.post("/transfer/in", verifyToken, transferIn);   // deposit to platform
router.post("/transfer/out", verifyToken, transferFunds); // withdraw to bank

module.exports = router;
