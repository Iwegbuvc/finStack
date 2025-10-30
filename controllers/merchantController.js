const MerchantAd = require('../models/merchantModel');
const logger = require('../utilities/logger');

const createMerchantAd = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { type, asset, fiat, price, minLimit, maxLimit, paymentMethods } = req.body;

    if (!type || !asset || !fiat || !price || !minLimit || !maxLimit || !paymentMethods?.length) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }

    const validTypes = ["BUY", "SELL"];
    const validAssets = ["USDT", "BTC", "GHS", "RMB", "XOF", "XAF", "USD", "NGN"];
    if (!validTypes.includes(type) || !validAssets.includes(asset)) {
      return res.status(400).json({ message: "Invalid ad type or asset." });
    }

    if (isNaN(price) || isNaN(minLimit) || isNaN(maxLimit)) {
      return res.status(400).json({ message: "Price, minLimit, and maxLimit must be numeric." });
    }

    if (maxLimit < minLimit) {
      return res.status(400).json({ message: "Max limit must be greater than min limit." });
    }

    if (!req.user.kycVerified) {
      return res.status(403).json({ message: "Merchant must complete KYC verification." });
    }

    const ad = await MerchantAd.create({
      merchantId,
      type,
      asset,
      fiat,
      price,
      minLimit,
      maxLimit,
      paymentMethods,
      status: "ACTIVE",
    });

    res.status(201).json({ success: true, message: "Ad created successfully", data: ad });
  } catch (error) {
    logger.error("Error creating merchant ad:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};



  // 📜 Get all active ads (public endpoint)
   const getAllAds = async (req, res) => {
     try {
    const { page = 1, limit = 20 } = req.query;
    const ads = await MerchantAd.find({ status: "ACTIVE" })
      .populate("merchantId", "firstName lastName email")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, data: ads });
  } catch (error) {
    logger.error("Error fetching ads:", error);
    res.status(500).json({ success: false, message: "Error fetching ads" });
  }
  }

  // 👤 Get merchant’s own ads
  const getMerchantAds = async (req, res) => {
   try {
    const merchantId = req.user.id;
    const ads = await MerchantAd.find({ merchantId });
    res.status(200).json({ success: true, data: ads });
  } catch (error) {
    logger.error("Error fetching merchant ads:", error);
    res.status(500).json({ success: false, message: "Error fetching merchant ads" });
  }
  }

  
  // 🛑 Deactivate an Ad
  const deactivateAd = async (req, res) => {
    try {
    const { id } = req.params;
    const merchantId = req.user.id;

    const ad = await MerchantAd.findOne({ _id: id, merchantId });
    if (!ad) return res.status(404).json({ message: "Ad not found or unauthorized" });

    ad.status = "INACTIVE";
    await ad.save();

    res.status(200).json({ success: true, message: "Ad deactivated successfully", data: ad });
  } catch (error) {
    logger.error("Error deactivating ad:", error);
    res.status(500).json({ success: false, message: "Error deactivating ad" });
  }
  }

  module.exports = {
    createMerchantAd,
    getAllAds,
    getMerchantAds,
    deactivateAd
  }