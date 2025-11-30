const Transaction = require("../models/transactionModel");


// USER: Fetch their own transactions
const getUserTransactions = async (req, res) => {
  try {
    const userId = req.user.id; // logged-in user
    const { type, status } = req.query;
    const page = parseInt(req.query.page) || 1;   // convert to number
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter dynamically
    const filter = { userId };
    if (type) filter.type = type;
    if (status) filter.status = status;

    // Fetch transactions with pagination
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v");

    // Total count for pagination info
    const total = await Transaction.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "User transactions fetched successfully",
      page,
      totalPages: Math.ceil(total / limit),
      totalTransactions: total,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error("❌ Error fetching user transactions:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


// ADMIN: Fetch all transactions
// const getAllTransactions = async (req, res) => {
//   try {
//     const { type, status, userId } = req.query;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;

//     // Dynamic filtering
//     const filter = {};
//     if (type) filter.type = type;
//     if (status) filter.status = status;
//     if (userId) filter.userId = userId;

//     // Fetch and populate related info
//     const transactions = await Transaction.find(filter)
//       .populate("userId", "name email")
//       .populate("walletId", "accountNumber")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit);

//     // Total count for pagination metadata
//     const total = await Transaction.countDocuments(filter);

//     res.status(200).json({
//       success: true,
//       message: "All transactions fetched successfully",
//       page,
//       totalPages: Math.ceil(total / limit),
//       totalTransactions: total,
//       count: transactions.length,
//       transactions,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching all transactions:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

module.exports = {
  getUserTransactions,
};
