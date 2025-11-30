const { 
    createWallet, 
    getWalletBalance,
    getWallet, 
    getAllWallets,
    // 💡 1. DESTRUCTURE NEW FUNCTIONS
    initiateWithdrawal, 
    completeWithdrawal,
    // depositFundsNinepsb,
    addTestFunds
} = require("../controllers/walletController");

const { verifyToken, isAdmin } = require("../middlewares/validateToken");
const { walletLimiter, transactionLimiter } = require("../middlewares/rateLimiter");


const router = require("express").Router();

// router.post("/createWallet", createWallet);
// router.get("/walletBalance", verifyToken, walletLimiter, getWalletBalance);
// router.get("/getAllWallets", verifyToken, isAdmin, getAllWallets);

// Note: Assuming depositFunds is now also destructured from the controller
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