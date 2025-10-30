const P2PTrade = require("../models/p2pModel");
const User = require("../models/userModel");

/**
 * 🧾 Get all P2P trades (with filters + pagination)
 * Example: /api/admin/trades?status=COMPLETED&page=1&limit=10
 */
exports.getAllTrades = async (req, res) => {
  try {
    let { status, userId, merchantId, startDate, endDate, page = 1, limit = 20 } = req.query;

    // Convert to numbers
    page = parseInt(page);
    limit = parseInt(limit);

    // 🔍 Build filter
    const filter = {};
    if (status) filter.status = status.trim().toUpperCase();
    if (userId) filter.userId = userId;
    if (merchantId) filter.merchantId = merchantId;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // 🧮 Count total trades for pagination
    const totalTrades = await P2PTrade.countDocuments(filter);

    // 📦 Fetch trades
    const trades = await P2PTrade.find(filter)
      .populate("userId", "name email role")
      .populate("merchantId", "name email role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: "Trades retrieved successfully",
      pagination: {
        total: totalTrades,
        currentPage: page,
        totalPages: Math.ceil(totalTrades / limit),
        limit,
      },
      data: trades,
    });
  } catch (error) {
    console.error("Error fetching trades:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch trades",
      details: error.message,
    });
  }
};

/**
 * 🔎 Get detailed trade info with logs
 * Example: /api/admin/trades/REF_17290238901
 */
exports.getTradeDetails = async (req, res) => {
  try {
    const { reference } = req.params;
    if (!reference) {
      return res.status(400).json({ success: false, error: "Reference is required" });
    }

    const trade = await P2PTrade.findOne({ reference })
      .populate("userId", "name email role")
      .populate("merchantId", "name email role")
      .populate("logs.actor", "name email role");

    if (!trade) {
      return res.status(404).json({ success: false, error: "Trade not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Trade details retrieved successfully",
      data: trade,
    });
  } catch (error) {
    console.error("Error fetching trade details:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch trade details",
      details: error.message,
    });
  }
};
