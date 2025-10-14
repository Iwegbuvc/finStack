// routes/kycRoutes.js
const express = require("express");
const kycController = require("../controllers/kycController");
const { verifyToken, isAdmin } = require("../middlewares/validateToken");
const { upload, uploadErrorHandler } = require("../utilities/fileUpload");

const router = express.Router();

// user submits their KYC (must be logged in)
router.post(
  "/submitKyc",
  verifyToken,
  upload.fields([
    { name: "selfie", maxCount: 1 },
    { name: "proof_id", maxCount: 1 },
    { name: "proof_address", maxCount: 1 },
  ]),
  uploadErrorHandler,
  kycController.submitKYC
);

// admin updates KYC status 
router.put(
  "/admin/updateKyc",
  verifyToken,
  isAdmin,
  kycController.adminUpdateKycStatus
);

// admin gets all records
router.get(
  "/admin/getAllKycs",
  verifyToken,
  isAdmin,
  kycController.getAllKycRecords
);

// get single KYC record
// - ADMIN: can fetch any user's KYC
// - USER: can only fetch their own KYC
router.get(
  "/getSingleKyc/:id",
  verifyToken,
  kycController.getSingleKyc
);

module.exports = router;
