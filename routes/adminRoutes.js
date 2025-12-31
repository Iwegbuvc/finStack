const express = require("express");
const { verifyToken, isAdmin } = require("../middlewares/validateToken");
const { createAnnouncementAndSendMail, updateFlatFee } = require('../controllers/adminController');
const p2pController = require("../controllers/p2pController");
const { getAllTrades, getTradeDetails, getAllTransactions, getAllUsers, getAllMerchants, updateUserRole, adminUpdateKycStatus, getPendingKycRecords, getAllKycRecords, getSingleKyc, adminSetPlatformFees, getFeeSummary, getPlatformVolume, getAdminDashboardStats,} = require("../controllers/adminController");

const router = express.Router();


// 1a. NEW ROUTE: Create announcement and send mail to users
router.post('/admin/announcements', verifyToken,isAdmin,createAnnouncementAndSendMail);
// 1. FIX: Now uses the imported function updateUserRole directly
router.put("/admin/update-user-role", verifyToken, isAdmin, updateUserRole);
// 2. FIX: Now uses the imported function getAllUsers directly
router.get("/admin/users", verifyToken, isAdmin, getAllUsers);
// 2a. NEW ROUTE: Get all users with role 'merchant'
router.get("/admin/merchants", verifyToken, isAdmin, getAllMerchants);

// 3. FIX: Now uses the imported function adminUpdateKycStatus directly
router.put("/admin/updateKyc", verifyToken, isAdmin, adminUpdateKycStatus);

// 4. FIX: Now uses the imported function getSingleKyc directly
router.get("/getSingleKyc/:id", verifyToken, getSingleKyc);
// 4a. NEW ROUTE: Get all pending KYC records
router.get("/admin/pending-kycs", verifyToken, isAdmin, getPendingKycRecords);
// 5. FIX: Now uses the imported function getAllKycRecords directly
router.get("/admin/getAllKycs", verifyToken, isAdmin, getAllKycRecords);

router.post('/admin/setFees', verifyToken, isAdmin, adminSetPlatformFees);
// Admin trade management 
router.get("/admin/trades", verifyToken, isAdmin, getAllTrades);
router.post("/admin/resolve-trade/:reference", verifyToken, isAdmin, p2pController.adminResolveTrade);
router.get("/admin/disputes", verifyToken, p2pController.getAllDisputes);
router.get("/admin/trades/:reference", verifyToken, isAdmin, getTradeDetails);

// Admin only routes for transactions
router.get("/admin/all-transaction", verifyToken, isAdmin, getAllTransactions);

router.get("/admin/fees", verifyToken, isAdmin, getFeeSummary);

router.post("/admin/updateCharges", verifyToken, isAdmin, updateFlatFee);

// Admin route for total transaction volume
router.get("/admin/volume", verifyToken, isAdmin, getPlatformVolume);

// Admin dashboard stats route
router.get("/admin/dashboard-summary", verifyToken, isAdmin, getAdminDashboardStats);

module.exports = router;