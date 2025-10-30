const Kyc = require("../models/kycModel");

const kycRateLimit = async (req, res, next) => {
  try {
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



module.exports = { kycRateLimit };
