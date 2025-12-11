const mongoose = require("mongoose"); 
const P2PTrade = require("../models/p2pModel");
const User = require("../models/userModel");
const Kyc = require("../models/kycModel");
const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");
const { getOrCreateStablecoinAddress, createWalletRecord, createVirtualAccountIfMissing, createVirtualAccountForChildAddress } = require("../services/providers/blockrader");


/* ===========  ADMIN: Get All Users   =========== */
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
  const { id: kycId, status, rejectionReason } = req.body;
  const normalizedStatus = status?.toUpperCase();

  if (!kycId || !mongoose.Types.ObjectId.isValid(kycId)) {
    return res.status(400).json({ success: false, message: "Invalid or missing KYC ID." });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const kycRecord = await Kyc.findById(kycId).populate('user_id', 'email').session(session);
    if (!kycRecord) throw new Error("KYC record not found.");

    if (normalizedStatus === "APPROVED") {
      // ✅ Step 1: Get or create stablecoin child address
      const { externalWalletId, cryptoAddress, accountName } = await getOrCreateStablecoinAddress(kycRecord.user_id);

      // ✅ Step 2: Create USDC and cNGN wallets
      await createWalletRecord({ userId: kycRecord.user_id._id, currency: "USDC", externalWalletId, walletAddress: cryptoAddress, accountName: `${accountName} - USDC`, session });
      await createWalletRecord({ userId: kycRecord.user_id._id, currency: "cNGN", externalWalletId, walletAddress: cryptoAddress, accountName: `${accountName} - cNGN`, session });

      // ✅ Step 3: NGN account for Nigerian users
    //   if (kycRecord.country?.toLowerCase() === "nigeria") {
    //     const kycData = { firstName: kycRecord.firstname, lastName: kycRecord.lastname, email: kycRecord.user_id.email, phoneNo: kycRecord.phone_number };
    //     const virtualAccountDetails = await createVirtualAccountIfMissing(kycRecord.user_id, externalWalletId, kycData);

    //     await createWalletRecord({
    //       userId: kycRecord.user_id._id,
    //       currency: "NGN",
    //       accountNumber: virtualAccountDetails.accountNumber,
    //       accountName: virtualAccountDetails.accountName,
    //       session,
    //     });
    //   }
    // ✅ Step 3: NGN account for Nigerian users (idempotent)
// ✅ Step 3: NGN account for Nigerian users (Idempotent and Efficient)
// if (kycRecord.country?.toLowerCase() === "nigeria") {
//     const kycData = {
//         firstName: kycRecord.firstname,
//         lastName: kycRecord.lastname,
//         email: kycRecord.user_id.email,
//         phoneNo: kycRecord.phone_number,
//     };

//     // 1️⃣ Check if NGN wallet exists (using the more efficient .exists() check)
//     // .exists() is better than .findOne() when you only need to know IF a document is there.
//     const ngnWalletExists = await Wallet.exists({ user_id: kycRecord.user_id._id, currency: "NGN" }).session(session);

//     if (!ngnWalletExists) {
//         // 2️⃣ Create NGN Virtual Account on Blockrader (Non-idempotent API call)
//         const virtualAccount = await createVirtualAccountForChildAddress(externalWalletId, kycData);

//         // 3️⃣ Save NGN wallet using upsert (Idempotent DB save)
//         await Wallet.updateOne(
//             { user_id: kycRecord.user_id._id, currency: "NGN" },
//             {
//                 $setOnInsert: {
//                     externalWalletId: externalWalletId,
//                     account_number: virtualAccount.accountNumber,
//                     account_name: virtualAccount.accountName,
//                     bankName: virtualAccount.bankName,
//                     balance: 0,
//                     provider: "BLOCKRADAR",
//                     status: "ACTIVE",
//                 },
//             },
//             { upsert: true, session }
//         );
       
//     }
// }
// ✅ Step 3: NGN account for Nigerian users (idempotent)
if (kycRecord.country?.toLowerCase() === "nigeria") {
   const kycData = { 
    firstName: kycRecord.firstname || kycRecord.user_id.firstName,
    lastName: kycRecord.lastname || kycRecord.user_id.lastName,
    email: kycRecord.user_id.email,
    phoneNo: kycRecord.phone_number,
};


    // Use the helper that checks if NGN wallet exists and creates it if missing
    const virtualAccountDetails = await createVirtualAccountIfMissing(
        kycRecord.user_id,
        externalWalletId, // child address ID
        kycData
    );

    // Upsert the wallet record (idempotent)
    await createWalletRecord({
        userId: kycRecord.user_id._id,
        currency: "NGN",
        accountNumber: virtualAccountDetails.accountNumber,
        accountName: virtualAccountDetails.accountName,
        session,
    });
}


      // ✅ Step 4: Finalize KYC & user record
      kycRecord.status = "APPROVED";
      await kycRecord.save({ session });
      await User.findByIdAndUpdate(kycRecord.user_id._id, { kycVerified: true }, { session });

      await session.commitTransaction();
      return res.status(200).json({ success: true, message: "KYC approved. Wallets provisioned successfully.", data: kycRecord });
    }

    if (normalizedStatus === "REJECTED") {
      if (!rejectionReason?.trim()) throw new Error("rejectionReason is required when rejecting KYC.");

      kycRecord.status = "REJECTED";
      kycRecord.rejectionReason = rejectionReason;
      await kycRecord.save({ session });
      await User.findByIdAndUpdate(kycRecord.user_id._id, { kycVerified: false }, { session });

      await session.commitTransaction();
      return res.status(200).json({ success: true, message: "KYC rejected and updated.", data: kycRecord });
    }

    throw new Error("Invalid status: must be APPROVED or REJECTED.");
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ KYC Update Failed:", error);
    return res.status(500).json({ success: false, message: "Failed to process KYC update", error: error.message });
  } finally {
    session.endSession();
  }
};

/* ===========  ADMIN: Get All KYC Records   =========== */
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
/* ==========   USER/ADMIN: Get Single KYC Record  ==========  */
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

// =========== ADMIN: Fetch all transactions
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