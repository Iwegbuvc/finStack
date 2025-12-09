const express = require("express");
const { verifyToken, isAdmin } = require("../middlewares/validateToken");
const { getAllTrades, getTradeDetails, getAllTransactions, getAllUsers, updateUserRole, adminUpdateKycStatus, getAllKycRecords, getSingleKyc} = require("../controllers/adminController");

const router = express.Router();

// 1. FIX: Now uses the imported function updateUserRole directly
router.put("/admin/update-user-role", verifyToken, isAdmin, updateUserRole);

// 2. FIX: Now uses the imported function getAllUsers directly
router.get("/admin/users", verifyToken, isAdmin, getAllUsers);

// 3. FIX: Now uses the imported function adminUpdateKycStatus directly
router.put("/admin/updateKyc", verifyToken, isAdmin, adminUpdateKycStatus);

// 4. FIX: Now uses the imported function getSingleKyc directly
router.get("/getSingleKyc/:id", verifyToken, getSingleKyc);

// 5. FIX: Now uses the imported function getAllKycRecords directly
router.get("/admin/getAllKycs", verifyToken, isAdmin, getAllKycRecords);

// Admin trade management 
router.get("/admin/trades", verifyToken, isAdmin, getAllTrades);
router.get("/admin/trades/:reference", verifyToken, isAdmin, getTradeDetails);

// Admin only routes for transactions
router.get("/admin/all-transaction", verifyToken, isAdmin, getAllTransactions);

module.exports = router;