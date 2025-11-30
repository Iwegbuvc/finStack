const mongoose = require("mongoose"); 
const P2PTrade = require("../models/p2pModel");
const User = require("../models/userModel");
const Kyc = require("../models/kycModel");
const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");
// const { createUsdWallet, createVirtualAccountForChildAddress } = require("../services/providers/blockrader");
const { createStablecoinAddress, createWalletRecord, createVirtualAccountForChildAddress } = require("../services/providers/blockrader");
const { verifyBVN, verifyNIN } = require("../services/prembly");
const { decrypt } = require("../utilities/encryptionUtils");

// 🚨 CRITICAL FIX 2: Placeholder function to prevent ReferenceError
const generateNinUserIdFallback = () => {
    // Implement your actual logic for generating a fallback ID here
    return `NIN_FALLBACK_${Date.now()}`;
};


const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const users = await User.find()
            .select("name email phone role createdAt")
            .skip(skip)
            .limit(limit);

        const totalUsers = await User.countDocuments();

        res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            page,
            totalPages: Math.ceil(totalUsers / limit),
            totalUsers,
            users,
        });
    } catch (error) {
        console.error("❌ Error fetching users:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// Update User Role (for admin) 
const updateUserRole = async (req, res) => {
    try {
        const { userId, role } = req.body;

        // Validate input
        if (!userId || !role) {
            return res.status(400).json({ message: "User ID and role are required" });
        }


        if (!["user", "merchant", "admin"].includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        // Find user and update role
        const updatedUser = await User.findByIdAndUpdate(userId, { role }, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "User role updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// --------------------- Admin Updates KYC ---------------------

const adminUpdateKycStatus = async (req, res) => {
    const { kycId, status, rejectionReason } = req.body;
    
    // CRITICAL: Start a session for transactional integrity
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Must populate user_id to get email and ID for wallet creation
        const kycRecord = await Kyc.findById(kycId).populate('user_id', 'email').session(session);

        if (!kycRecord) {
            throw new Error("KYC record not found.");
        }
        
        if (status === "APPROVED") {
            // ----------------------------------------------------------------------
            // 🚀 STEP 1: CREATE DEDICATED CHILD ADDRESS (The single Blockrader destination)
            const { externalWalletId, cryptoAddress, accountName } = await createStablecoinAddress({ 
                userId: kycRecord.user_id._id,
                email: kycRecord.user_id.email,
                name: `${kycRecord.firstname} ${kycRecord.lastname}`,
            });
            const childAddressId = externalWalletId;
            console.log("✅ Step 1 Complete: Stablecoin Address provisioned.");

            // ----------------------------------------------------------------------
            // 🚀 STEP 2: CREATE MULTIPLE DB WALLET RECORDS (The separate balances)

            // 2a. CREATE WALLET RECORD FOR USDC (Always necessary for crypto users)
            const usdcWalletDB = await createWalletRecord({
                userId: kycRecord.user_id._id,
                currency: "USDC", // <-- CURRENCY FOR DISPLAY
                externalWalletId: childAddressId,
                walletAddress: cryptoAddress, // The 0x... address 
                accountName: `${accountName} - USDC`,
                session, // <-- PASS THE SESSION
            });
            console.log(`✅ Step 2a Complete: USDC Wallet DB record created.`);

            // ----------------------------------------------------------------------
            // 🚀 CONDITIONAL LOGIC FOR NIGERIAN USERS (cNGN / Fiat Rail)
            const isNigerian = kycRecord.country && kycRecord.country.toLowerCase() === "nigeria";
            
            if (isNigerian) {
                console.log("✅ Detected Nigerian User. Proceeding with NGN/cNGN wallet setup...");

                const kycData = {
                    firstName: kycRecord.firstname,
                    lastName: kycRecord.lastname,
                    email: kycRecord.user_id.email,
                    phoneNo: kycRecord.phone_number,
                };

                // 2b. CREATE WALLET RECORD FOR CNGN (Link to the same crypto address)
                const cngnWalletDB = await createWalletRecord({
                    userId: kycRecord.user_id._id,
                    currency: "cNGN", 
                    externalWalletId: childAddressId,
                    walletAddress: cryptoAddress, // The 0x... address (same as USDC)
                    accountName: `${accountName} - cNGN`,
                    session, 
                });
                console.log(`✅ Step 2b Complete: CNGN Wallet DB record created.`);

                // ----------------------------------------------------------------------
                // 🚀 STEP 3: CREATE VIRTUAL ACCOUNT (Fiat Rail)
                const virtualAccountDetails = await createVirtualAccountForChildAddress(
                    childAddressId, // <-- Uses the single Address ID
                    kycData
                );
                console.log("✅ Step 3 Complete: Virtual Account created on Blockrader.");

                // ----------------------------------------------------------------------
                // 🚀 STEP 4: CREATE DATABASE WALLET RECORD FOR FIAT DEPOSIT MECHANISM (NGN)
                await createWalletRecord({
                    userId: kycRecord.user_id._id,
                    currency: "NGN", // <-- FIAT CURRENCY
                    accountNumber: virtualAccountDetails.accountNumber, // Bank Account Number (900...)
                    accountName: virtualAccountDetails.accountName,
                    session, 
                });
                console.log(`✅ Step 4 Complete: NGN Virtual Account DB record created.`);

            } else {
                console.log(`⚠️ Detected Non-Nigerian User (Country: ${kycRecord.country}). Skipping NGN/cNGN wallet and Virtual Account creation.`);
            }

            // ----------------------------------------------------------------------
            // 🚀 STEP 5: FINAL KYC UPDATE AND COMMIT
            kycRecord.status = "APPROVED";
            // Set kycVerified on the user model if necessary here
            // await User.findByIdAndUpdate(kycRecord.user_id._id, { kycVerified: true }, { session });
            await kycRecord.save({ session });
            
            await session.commitTransaction();

            return res.status(200).json({
                success: true,
                message: "KYC approved and wallets provisioned successfully.",
                data: kycRecord
            });
            
        } else if (status === "REJECTED") {
           // 1. Validation check for rejection reason
            if (!rejectionReason || rejectionReason.trim().length === 0) {
                // This is a business-logic error, so throw a descriptive error
                throw new Error("A rejectionReason is required when status is REJECTED.");
            }

            // 2. Update KYC record status and reason
            kycRecord.status = "REJECTED";
            kycRecord.rejectionReason = rejectionReason;
            await kycRecord.save({ session });

            // 3. Update User model's kycVerified status
            // Crucially, set the user's kycVerified flag to false upon rejection
            await User.findByIdAndUpdate(
                kycRecord.user_id._id,
                { kycVerified: false }, 
                { session }
            );

            console.log(`❌ KYC Rejected: Status and reason updated for ${kycRecord.user_id.email}`);

            // 4. Commit transaction
            await session.commitTransaction();
            
            // 5. Send response
            return res.status(200).json({
                success: true,
                message: "KYC rejected and status updated successfully.",
                data: kycRecord
            });

        } else {
            throw new Error("Invalid status provided in the request body. Must be APPROVED or REJECTED.");
        }
    } catch (error) {
        // Rollback transaction on any failure to maintain database integrity
        await session.abortTransaction();
        console.error("KYC Approval/Update failed. Transaction rolled back:", error);

        return res.status(500).json({
            success: false,
            message: `Failed to update KYC status or provision wallets: ${error.message}`,
            details: error.message
        });
    } finally {
        session.endSession();
    }
};
/* -------------------------------------------------------------------------- */
/*                            ADMIN: Get All KYC Records                      */
/* -------------------------------------------------------------------------- */
const getAllKycRecords = async (req, res) => {
    try {
        const kycRecords = await Kyc.find().populate(
            "user_id",
            "email firstName lastName"
        );
        return res.status(200).json({
            message: "KYC records fetched successfully",
            data: kycRecords,
        });
    } catch (error) {
        console.error("❌ Error fetching KYC records:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};

/* -------------------------------------------------------------------------- */
/*                          USER/ADMIN: Get Single KYC Record                 */
/* -------------------------------------------------------------------------- */
const getSingleKyc = async (req, res) => {
    try {
        const { id } = req.params;
        const { searchByUserId = false } = req.query;
        let kycRecord;

        if (req.user.role === "admin") {
            if (searchByUserId === "true") {
                kycRecord = await Kyc.findOne({ user_id: id }).populate(
                    "user_id",
                    "email firstName lastName"
                );
            } else {
                kycRecord = await Kyc.findById(id).populate(
                    "user_id",
                    "email firstName lastName"
                );
            }
        } else {
            kycRecord = await Kyc.findOne({ user_id: req.user._id }).populate(
                "user_id",
                "email firstName lastName"
            );
        }

        if (!kycRecord) {
            return res.status(404).json({ message: "KYC record not found" });
        }

        return res.status(200).json({
            message: "KYC record fetched successfully",
            data: kycRecord,
        });
    } catch (error) {
        console.error("❌ Error fetching single KYC record:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};

// ADMIN: Fetch all transactions
const getAllTransactions = async (req, res) => {
    try {
        const { type, status, userId } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Dynamic filtering
        const filter = {};
        if (type) filter.type = type;
        if (status) filter.status = status;
        if (userId) filter.userId = userId;

        // Fetch and populate related info
        // 🛑 CRITICAL FIX 12: Corrected model name from 'transactionModel' to 'Transaction'
        const transactions = await Transaction.find(filter) 
            .populate("userId", "name email")
            .populate("walletId", "accountNumber")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Total count for pagination metadata
        const total = await Transaction.countDocuments(filter);

        res.status(200).json({
            success: true,
            message: "All transactions fetched successfully",
            page,
            totalPages: Math.ceil(total / limit),
            totalTransactions: total,
            count: transactions.length,
            transactions,
        });
    } catch (error) {
        console.error("❌ Error fetching all transactions:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};
/**
 * 🧾 Get all P2P trades (with filters + pagination)
 * Example: /api/admin/trades?status=COMPLETED&page=1&limit=10
 */
const getAllTrades = async (req, res) => {
    try {
        let { status, userId, merchantId, startDate, endDate, page = 1, limit = 20 } = req.query;

        // Convert to numbers
        page = parseInt(page);
        limit = parseInt(limit);

        // 🔍 Build filter
        const filter = {};
        if (status) filter.status = status.trim().toUpperCase();
        if (userId) filter.userId = userId;
        if (merchantId) filter.merchantId = merchantId;

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        // 🧮 Count total trades for pagination
        const totalTrades = await P2PTrade.countDocuments(filter);

        // 📦 Fetch trades
        const trades = await P2PTrade.find(filter)
            .populate("userId", "name email role")
            .populate("merchantId", "name email role")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        return res.status(200).json({
            success: true,
            message: "Trades retrieved successfully",
            pagination: {
                total: totalTrades,
                currentPage: page,
                totalPages: Math.ceil(totalTrades / limit),
                limit,
            },
            data: trades,
        });
    } catch (error) {
        console.error("Error fetching trades:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch trades",
            details: error.message,
        });
    }
};

/**
 * 🔎 Get detailed trade info with logs
 * Example: /api/admin/trades/REF_17290238901
 */
const getTradeDetails = async (req, res) => {
    try {
        const { reference } = req.params;
        if (!reference) {
            return res.status(400).json({ success: false, error: "Reference is required" });
        }

        const trade = await P2PTrade.findOne({ reference })
            .populate("userId", "name email role")
            .populate("merchantId", "name email role")
            .populate("logs.actor", "name email role");

        if (!trade) {
            return res.status(404).json({ success: false, error: "Trade not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Trade details retrieved successfully",
            data: trade,
        });
    } catch (error) {
        console.error("Error fetching trade details:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch trade details",
            details: error.message,
        });
    }
};

module.exports = {getAllUsers, updateUserRole, adminUpdateKycStatus, getAllKycRecords, getSingleKyc, getAllTransactions, getAllTrades, getTradeDetails};