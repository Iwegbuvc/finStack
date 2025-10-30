const express = require("express");
const router = express.Router();
const p2pController = require("../controllers/p2pController");
const { verifyToken } = require("../middlewares/validateToken"); // ✅ add this

router.post("/trade/initiate", verifyToken, p2pController.createTrade);
router.post("/trade/:reference/confirm-buyer-payment", verifyToken, p2pController.buyerConfirmPayment);
router.post("/trade/:reference/confirm-merchant-payment", verifyToken, p2pController.merchantConfirmPayment);
router.delete("/trade/:reference/cancel", verifyToken, p2pController.cancelTrade);
module.exports = router;