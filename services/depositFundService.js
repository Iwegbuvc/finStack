const axios = require("axios");
const logger = require("../utilities/logger");

const { NODE_ENV, PROVIDER_BASE_URL, PROVIDER_API_KEY } = process.env;

// depositFundsService
 
const depositFundsService = async (accountNumber, amount) => {
  try {
    // ✅ 1. Validate inputs
    if (!accountNumber || !amount) {
      throw new Error("Account number and amount are required");
    }

    // ✅ 2. MOCK MODE (For testing or dev environment)
    if (NODE_ENV !== "production") {
      logger.info(`💡 Mock deposit ₦${amount} to account ${accountNumber}`);

      return {
        success: true,
        message: "Mock deposit successful",
        walletId: accountNumber, // mock as wallet ref
        reference: `MOCK-DEP-${Date.now()}`,
        amount,
        provider: "MockProvider",
      };
    }

    // ✅ 3. LIVE MODE (Real API call to provider)
    const response = await axios.post(
      `${PROVIDER_BASE_URL}/deposit`, // example endpoint, update for your provider
      {
        accountNo: accountNumber,
        amount,
      },
      {
        headers: {
          Authorization: `Bearer ${PROVIDER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;

    // ✅ 4. Handle provider response
    if (!data || data.status !== "success") {
      throw new Error(data?.message || "Deposit failed at provider");
    }

    logger.info(`✅ Deposit successful: ₦${amount} → ${accountNumber}`);

    return {
      success: true,
      message: data.message || "Deposit successful",
      walletId: data.walletId || accountNumber,
      reference: data.reference || `DEP-${Date.now()}`,
      amount,
      provider: "9PSB", // or "Blockrader", based on your integration
    };
  } catch (error) {
    logger.error(`❌ Deposit Service Error: ${error.message}`);
    throw new Error(error.response?.data?.message || error.message);
  }
};

module.exports = depositFundsService;







// // NEW_UPDATE_FOR_DEPOSIT_SERVICE
// // controllers/depositController.js
// import { createDepositAddress } from "../services/blockraderService.js";
// import Deposit from "../models/depositModel.js"; // optional model if you track deposits

// export const initiateDeposit = async (req, res) => {
//   try {
//     const user = req.user;
//     const { walletId } = req.body; // walletId stored from account creation

//     if (!user || !user._id) {
//       return res.status(401).json({ success: false, message: "Authentication required." });
//     }

//     const addressData = await createDepositAddress(walletId, user);

//     await Deposit.create({
//       userId: user._id,
//       walletId,
//       depositAddress: addressData.address,
//       status: "PENDING",
//     });

//     res.status(200).json({
//       success: true,
//       message: "Deposit address generated successfully.",
//       data: addressData,
//     });
//   } catch (error) {
//     console.error("[Deposit Error]", error.message);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
