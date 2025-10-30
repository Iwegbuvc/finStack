const express = require("express");
const { isAdmin } = require("../middlewares/authMiddleware");
const { getAllTrades, getTradeDetails } = require("../controllers/adminP2PController");

const router = express.Router();

// Admin trade management
router.get("/trades", isAdmin, getAllTrades);
router.get("/trades/:reference", isAdmin, getTradeDetails);

module.exports = router;
