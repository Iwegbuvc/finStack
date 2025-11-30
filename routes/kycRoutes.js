const express = require("express");
const kycController = require("../controllers/kycController");
const { validateKYC } = require("../middlewares/validation");
const { verifyToken, isAdmin } = require("../middlewares/validateToken");
const { upload, uploadErrorHandler } = require("../utilities/fileUpload");
const { kycRateLimit } = require("../middlewares/rateLimit");

const router = express.Router();

router.post(
  "/submitKyc",
  verifyToken, // ensures req.user is populated
  upload.fields([
    { name: "selfie", maxCount: 1 },
    { name: "proof_id_front", maxCount: 1 },
    { name: "proof_id_back", maxCount: 1 },
    { name: "proof_address", maxCount: 1 },
  ]),
  uploadErrorHandler,
  kycController.submitKYC
);

// admin updates KYC status
// router.put(
//   "/admin/updateKyc",
//   verifyToken,
//   isAdmin,
//   kycController.adminUpdateKycStatus
// );

// admin gets all records
// router.get(
//   "/admin/getAllKycs",
//   verifyToken,
//   isAdmin,
//   kycController.getAllKycRecords
// );

// get single KYC record
// - ADMIN: can fetch any user's KYC
// - USER: can only fetch their own KYC
router.get(
  "/getSingleKyc/:id",
  verifyToken,
  kycController.getSingleKyc
);

module.exports = router;
