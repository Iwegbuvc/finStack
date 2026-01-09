const express = require("express");
const { verifyToken, isAdmin } = require("../middlewares/validateToken");
const {
  createAnnouncementAndSendMail,
  setFee,
} = require("../controllers/adminController");
const p2pController = require("../controllers/p2pController");
const {
  getAllTrades,
  getTradeDetails,
  getAllTransactions,
  getAllUsers,
  getAllMerchants,
  updateUserRole,
  adminUpdateKycStatus,
  getPendingKycRecords,
  getAllKycRecords,
  getSingleKyc,
  getFeeSummary,
  getPlatformVolume,
  getAdminDashboardStats,
} = require("../controllers/adminController");
const {
  walletLimiter,
  transactionLimiter,
} = require("../middlewares/rateLimiter");
const router = express.Router();

// Create announcement and send mail to users
router.post(
  "/admin/announcements",
  verifyToken,
  isAdmin,
  transactionLimiter,
  createAnnouncementAndSendMail
);
// User Management (Strict limits for role and KYC updates)
router.put(
  "/admin/update-user-role",
  verifyToken,
  isAdmin,
  transactionLimiter,
  updateUserRole
);
router.put(
  "/admin/updateKyc",
  verifyToken,
  isAdmin,
  transactionLimiter,
  adminUpdateKycStatus
);

// 2.  Now uses the imported function getAllUsers directly(Data Retrieval)
router.get("/admin/users", verifyToken, isAdmin, walletLimiter, getAllUsers);
// 2a. Get all users with role 'merchant'
router.get(
  "/admin/merchants",
  verifyToken,
  isAdmin,
  walletLimiter,
  getAllMerchants
);
// 4. Now uses the imported function getSingleKyc directly
router.get("/getSingleKyc/:id", verifyToken, walletLimiter, getSingleKyc);
// 4a. Get all pending KYC records
router.get(
  "/admin/pending-kycs",
  verifyToken,
  isAdmin,
  walletLimiter,
  getPendingKycRecords
);
// 5. Now uses the imported function getAllKycRecords directly
router.get("/admin/getAllKycs", verifyToken, isAdmin, getAllKycRecords);
// Admin fee management
router.post(
  "/admin/fees-update",
  verifyToken,
  isAdmin,
  transactionLimiter,
  setFee
);
// Admin trade management
router.get("/admin/trades", verifyToken, isAdmin, walletLimiter, getAllTrades);
router.post(
  "/admin/resolve-trade/:reference",
  verifyToken,
  isAdmin,
  transactionLimiter,
  p2pController.adminResolveTrade
);
router.get(
  "/admin/disputes",
  verifyToken,
  walletLimiter,
  p2pController.getAllDisputes
);
router.get(
  "/admin/trades/:reference",
  verifyToken,
  isAdmin,
  walletLimiter,
  getTradeDetails
);

// Admin only routes for transactions
router.get(
  "/admin/all-transaction",
  verifyToken,
  isAdmin,
  walletLimiter,
  getAllTransactions
);
router.get("/admin/fees", verifyToken, isAdmin, walletLimiter, getFeeSummary);
// Admin route for total transaction volume
router.get(
  "/admin/volume",
  verifyToken,
  isAdmin,
  walletLimiter,
  getPlatformVolume
);
// Admin dashboard stats route
router.get(
  "/admin/dashboard-summary",
  verifyToken,
  isAdmin,
  walletLimiter,
  getAdminDashboardStats
);

module.exports = router;
