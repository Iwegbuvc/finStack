const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/validateToken");
const { merchantOnly, allowRoles } = require("../middlewares/auth");
const {createMerchantAd, getAllAds, getMerchantAds, deactivateAd,} = require("../controllers/merchantController");

//  PUBLIC ROUTES
// Anyone (no token required) can view all active ads.
router.get("/ads", getAllAds);

//  MERCHANT ROUTES
// Require authentication (verifyToken) and merchant role.
router.post("/ads", verifyToken, merchantOnly, createMerchantAd);          // Create ad
router.get("/my-ads", verifyToken, merchantOnly, getMerchantAds);          // Get merchant’s ads
router.patch("/ads/:id/deactivate", verifyToken, merchantOnly, deactivateAd); // Deactivate ad

//  ADMIN OR MERCHANT ROUTES
router.get("/all-ads", verifyToken, allowRoles("admin", "merchant"), getMerchantAds);

module.exports = router;
