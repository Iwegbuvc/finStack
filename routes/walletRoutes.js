const { 
    initiateWithdrawal, 
    completeWithdrawal,
    addTestFunds,
    getDashboardBalances
} = require("../controllers/walletController");

const { verifyToken, isAdmin } = require("../middlewares/validateToken");
const { walletLimiter, transactionLimiter } = require("../middlewares/rateLimiter");


const router = require("express").Router();

router.get("/wallet/user-balances", verifyToken, getDashboardBalances);
// router.post("/deposit", depositFundsNinepsb); 
router.post("/test/addFunds", 
    verifyToken,
    isAdmin, // Recommended: Ensure only admins or special users can hit this
    addTestFunds
);
// (PHASE 1: INITIATE WITHDRAWAL/SEND OTP)
// This is the first step, sending the request and receiving the OTP.
router.post("/withdraw/initiate", 
    verifyToken, 
    transactionLimiter, // Use walletLimiter or a dedicated rate limit if initiation is separate
    initiateWithdrawal
);

// NEW ROUTE (PHASE 2: VERIFY OTP AND COMPLETE WITHDRAWAL)
// This is the final step, verifying the OTP and executing the external transaction.
router.post("/withdraw/complete", 
    verifyToken, 
    transactionLimiter, // Apply the transaction limiter here as it hits the external service
    completeWithdrawal
);

// router.get("/:id", verifyToken, isAdmin, getWallet);

module.exports = router;