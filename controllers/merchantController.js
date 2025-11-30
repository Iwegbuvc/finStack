const MerchantAd = require('../models/merchantModel');
const logger = require('../utilities/logger');

// Create a new Merchant Ad
const createMerchantAd = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
        type, 
        asset, 
        fiat, 
        price, 
        minLimit, 
        maxLimit, 
        availableAmount,
        paymentMethods,
        timeLimit,
        instructions, 
        autoReply 
    } = req.body;

    if (!type || !asset || !fiat || !price || !minLimit || !maxLimit || !paymentMethods?.length || !timeLimit || !availableAmount) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }

    // Separated Crypto Assets and Fiat Currencies for better validation
    const validTypes = ["BUY", "SELL"];
    const validCryptoAssets = ["USDC", "CNGN"];
    const validFiatCurrencies = ["USD", "NGN", "GHS", "RMB", "XOF", "XAF"];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid ad type." });
    }
    if (!validCryptoAssets.includes(asset)) {
      return res.status(400).json({ message: "Invalid crypto asset." });
    }
    if (!validFiatCurrencies.includes(fiat)) {
        return res.status(400).json({ message: "Invalid fiat currency." });
    }

    if (isNaN(price) || isNaN(minLimit) || isNaN(maxLimit) || isNaN(timeLimit) || isNaN(availableAmount)) {
      return res.status(400).json({ message: "Price, minLimit, maxLimit, timeLimit, and availableAmount must be numeric." });
    }

    if (maxLimit < minLimit) {
      return res.status(400).json({ message: "Max limit must be greater than min limit." });
    }

    if (!req.user.kycVerified) {
      return res.status(403).json({ message: "Merchant must complete KYC verification." });
    }

    const ad = await MerchantAd.create({
      userId,
      type,
      asset,
      fiat,
      price,
      minLimit,
      maxLimit,
      availableAmount,
      paymentMethods,
       timeLimit, 
       instructions: instructions || '', 
       autoReply: autoReply || '', 
      status: "ACTIVE",
    });

    res.status(201).json({ success: true, message: "Ad created successfully", data: ad });
  } catch (error) {
    logger.error("Error creating merchant ad:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};  

// Get all active ads (public endpoint)
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

  // Get merchant’s own ads
  const getMerchantAds = async (req, res) => {
   try {
    const userId = req.user.id;
    const ads = await MerchantAd.find({ userId });
    res.status(200).json({ success: true, data: ads });
  } catch (error) {
    logger.error("Error fetching merchant ads:", error);
    res.status(500).json({ success: false, message: "Error fetching merchant ads" });
  }
  }

  //Update an Ad
const updateMerchantAd = async (req, res) => {
  try {
    const { id } = req.params; // The ID of the ad to update
    const userId = req.user.id;
    
    // Get the fields the merchant is attempting to update
    const updateFields = req.body; 

    // Find the ad and ensure it belongs to the merchant
    const ad = await MerchantAd.findOne({ _id: id, userId });
    if (!ad) {
        return res.status(404).json({ message: "Ad not found or unauthorized to update" });
    }

//  Type, Asset, and Fiat are typically NOT changeable after creation
    const allowedUpdates = ['price', 'minLimit', 'maxLimit', 'paymentMethods', 'timeLimit', 'instructions', 'autoReply', 'status', 'availableAmount'];

    // Validation (only for the fields being updated)
    if (updateFields.maxLimit && updateFields.minLimit && updateFields.maxLimit < updateFields.minLimit) {
        return res.status(400).json({ message: "New Max limit must be greater than new Min limit." });
    }

    // --- START: Robust Min/Max Limit Validation (Recommended) ---
    // Calculate new limits using updated values if provided, otherwise use current values.
    const newMinLimit = updateFields.minLimit !== undefined ? Number(updateFields.minLimit) : ad.minLimit;
    const newMaxLimit = updateFields.maxLimit !== undefined ? Number(updateFields.maxLimit) : ad.maxLimit;

    if (newMaxLimit < newMinLimit) {
        return res.status(400).json({ message: "Max limit must be greater than or equal to the min limit. Check updated values." });
    }
    // --- END: Robust Min/Max Limit Validation ---

    // Apply updates and save
    let hasUpdates = false;
    for (const key of allowedUpdates) {
        if (updateFields[key] !== undefined) {
            // Basic numeric check for critical fields
            if (['price', 'minLimit', 'maxLimit', 'timeLimit', 'availableAmount'].includes(key) && isNaN(updateFields[key])) {
                return res.status(400).json({ message: `${key} must be numeric.` });
            }
            
            // Update the field on the Mongoose document
            ad[key] = updateFields[key];
            hasUpdates = true;
        }
    }

    if (!hasUpdates) {
        return res.status(400).json({ message: "No valid fields provided for update." });
    }

    await ad.save();

    res.status(200).json({ success: true, message: "Ad updated successfully", data: ad });
  } catch (error) {
    logger.error("Error updating ad:", error);
    res.status(500).json({ success: false, message: "Error updating ad" });
  }
};

  
  // Deactivate an Ad
  const deactivateAd = async (req, res) => {
    try {
    const { id } = req.params;
    const userId = req.user.id;

    const ad = await MerchantAd.findOne({ _id: id, userId });
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
    updateMerchantAd,
    deactivateAd
  }