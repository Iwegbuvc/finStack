const p2pService = require("../services/p2pService");
const blockrader = require("../services/providers/blockrader"); 
const User = require("../models/userModel"); 
const MerchantAd = require("../models/merchantModel"); 

/* Helper function to map service errors to appropriate HTTP status codes.*/
function handleServiceError(res, error) {
  const message = error.message || "Internal server error.";
  let status = 500;
  // Map specific service errors to appropriate HTTP status codes
  if (message.includes("required") || message.includes("Unsupported currency") || message.includes("Invalid amount") || message.includes("missing destination address for target currency") || message.includes("account_number")) {
    status = 400; // Bad Request (client error/missing required data)
  } else if (message.includes("Trade not found") || message.includes("User not found") || message.includes("Wallet not found")) {
    status = 404; // Not Found
  } else if (message.includes("Not authorized") || message.includes("Only the buyer can confirm")) {
    status = 403; // Forbidden (permission/authorization issues)
  } else if (message.includes("Trade not in pending state") || message.includes("Cannot cancel a completed trade") || message.includes("failed: Escrow reversal")) {
    status = 409; // Conflict (wrong state for the action)
  }

  console.error(`Controller Error (${status}):`, message);
  return res.status(status).json({ message });
}
/*Creates or retrieves the user's Blockrader USD Wallet. */
const createUsdWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    // 1. Check if wallet already exists
    const existingWallet = await blockrader.getWalletByUserId(userId, "USD");

    if (existingWallet) {
      return res.status(200).json({
        message: "USD Wallet already exists.",
        data: existingWallet,
      });
    }
    // 2. Fetch user details needed for Blockrader metadata
    const user = await User.findById(userId).lean();
    if (!user) {
      return handleServiceError(res, new Error("User not found for wallet creation."));
    }
    // 3. Create the wallet via Blockrader service
    const newWallet = await blockrader.createUsdWallet({
      userId: user._id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      currency: "USD"
    });

    res.status(201).json({
      message: "USD Wallet created successfully.",
      data: newWallet,
    });
  } catch (error) {
    handleServiceError(res, error);
  }
}

/**🧩 Controller: Handles HTTP requests for P2P trading actions */
const createTrade = async (req, res) => {
  try {
    const userId = req.user.id;
    const ip = req.ip;

    const { adId } = req.params;
    const { amountSource } = req.body;

    if (!adId || !amountSource) {
      return handleServiceError(res, new Error("Ad ID and amountSource are required."));
    }

    if (isNaN(amountSource) || amountSource <= 0) {
      return handleServiceError(res, new Error("Invalid amountSource."));
    }

    // Fetch the ad
    const merchantAd = await MerchantAd.findById(adId);
    if (!merchantAd) {
      return res.status(404).json({ success: false, message: "Ad not found." });
    }

    if (merchantAd.status !== "ACTIVE") {
      return res.status(400).json({ success: false, message: "Ad is not active." });
    }

    // Prevent user from trading on their own ad
    if (String(merchantAd.userId) === String(userId)) {
      return res.status(400).json({ success: false, message: "You cannot trade on your own ad." });
    }

    // Validate limits
    if (amountSource < merchantAd.minLimit || amountSource > merchantAd.maxLimit) {
      return res.status(400).json({
        success: false,
        message: `Amount must be between ${merchantAd.minLimit} and ${merchantAd.maxLimit} ${merchantAd.fiat}.`
      });
    }
     // We pass the document here, but the service uses the ID for the atomic update
    const rate = merchantAd.price;
    const amountTarget = parseFloat((amountSource / rate).toFixed(8));

    const tradeDetails = {
      userId,
      merchantId: merchantAd.userId,
      adId: merchantAd._id,
      amountSource,
      amountTarget,
      rate,
      currencySource: merchantAd.fiat,
      currencyTarget: merchantAd.asset,
      provider: "BLOCKRADAR",
      ip,
      timeLimit: merchantAd.timeLimit, // ✅ Pass timeLimit
    };    
    // Initiate the trade using the service layer
    const newTrade = await p2pService.initiateTrade(userId, merchantAd, tradeDetails, ip);

    res.status(201).json({
      success: true,
      message: "Trade initiated successfully.",
      data: newTrade,
    });

  } catch (error) {
    handleServiceError(res, error);
  }
};
// 2. Buyer confirms they’ve paid (starts escrow, POST /trade/:reference/confirm-buyer-payment)
const buyerConfirmPayment = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { reference } = req.params; 
    const ip = req.ip;

    if (!reference) {
      return handleServiceError(res, new Error("Trade reference is required in the URL path."));
    }
    
    const trade = await p2pService.confirmBuyerPayment(reference, buyerId, ip);

    res.status(200).json({
      message: "Buyer payment confirmed, merchant asset moved to escrow (for external trades)",
      data: trade,
    });
  } catch (error) {
    handleServiceError(res, error);
  }
}
// // 3a. Initiate Merchant Confirm Payment (POST /trade/:reference/initiate-merchant-payment-confirmation)
const initiateMerchantConfirmPayment = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { reference } = req.params;
    const ip = req.ip;
    
    if (!reference) {
      return handleServiceError(res, new Error("Trade reference is required in the URL path."));
    }

    // Call the new service function to send the OTP
    const result = await p2pService.initiateMerchantPaymentConfirmation(reference, merchantId, ip);

    res.status(200).json({
      message: result.message,
      success: true,
    });
  } catch (error) {
    handleServiceError(res, error);
  }
};
// 3b. Merchant confirms payment with OTP (POST /trade/:reference/confirm-merchant-payment)
const merchantConfirmPayment = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { reference } = req.params;
    // 💡 NEW: OTP Code is now required in the request body
    const { otpCode } = req.body; 
    const ip = req.ip;
    
    if (!reference) {
      return handleServiceError(res, new Error("Trade reference is required in the URL path."));
    }
    if (!otpCode) {
        return res.status(400).json({ success: false, message: "OTP code is required to complete settlement." });
    }

    // Call the service with the new otpCode argument
    // NOTE: The service layer still handles destination lookup from the Wallet model
    const trade = await p2pService.confirmMerchantPayment(reference, merchantId, otpCode, ip); 

    res.status(200).json({
      message: "Trade successfully settled. Escrow released to respective parties.",
      data: trade,
    });
  } catch (error) {
    handleServiceError(res, error);
  }
};
// 4. Cancel trade (DELETE /trade/:reference/cancel)
const cancelTrade = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reference } = req.params; 
    const ip = req.ip;

    if (!reference) {
      return handleServiceError(res, new Error("Trade reference is required in the URL path."));
    }

    const trade = await p2pService.cancelTrade(reference, userId, ip);

    res.status(200).json({
      message: `Trade cancelled successfully. Status: ${trade.status}`,
      data: trade,
    });
  } catch (error) {
    handleServiceError(res, error);
  }
}

const merchantMarkPaid = async (req, res) => {
  try {
    const { reference } = req.params;
    const trade = await p2pService.merchantMarksFiatSent(reference, req.user.id, req.ip);
    res.status(200).json({ success: true, message: "Merchant marked as paid", data: trade });
  } catch (error) {
    handleServiceError(res, error);
  }
};

const adminResolveTrade = async (req, res) => {
  try {
    const { reference } = req.params;
    const { action } = req.body; // "RELEASE" or "CANCEL"
    const trade = await p2pService.adminResolveTrade(reference, action, req.user.id, req.ip);
    res.status(200).json({ success: true, message: "Trade resolved by admin", data: trade });
  } catch (error) {
    handleServiceError(res, error);
  }
};

// Using the concise export syntax, and only exporting the functions intended for the router.
module.exports = {
  createTrade,
  buyerConfirmPayment,
  initiateMerchantConfirmPayment,
   merchantConfirmPayment,
  cancelTrade,
  createUsdWallet,
  merchantMarkPaid,
  adminResolveTrade
};