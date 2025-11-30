// const p2pService = require("../services/p2pService");
// const blockrader = require("../services/providers/blockrader"); 
// const User = require("../models/userModel"); 
// // const MerchantAd = require("../models/merchantModel"); 

// /**
//  * Helper function to map service errors to appropriate HTTP status codes.
//  * This function remains unchanged as it's solid.
//  */
// function handleServiceError(res, error) {
//   const message = error.message || "Internal server error.";
//   let status = 500;
  
//   // Map specific service errors to appropriate HTTP status codes
//   if (message.includes("required") || message.includes("Unsupported currency") || message.includes("Invalid amount") || message.includes("missing destination address for target currency") || message.includes("account_number")) {
//     status = 400; // Bad Request (client error/missing required data)
//   } else if (message.includes("Trade not found") || message.includes("User not found") || message.includes("Wallet not found")) {
//     status = 404; // Not Found
//   } else if (message.includes("Not authorized") || message.includes("Only the buyer can confirm")) {
//     status = 403; // Forbidden (permission/authorization issues)
//   } else if (message.includes("Trade not in pending state") || message.includes("Cannot cancel a completed trade") || message.includes("failed: Escrow reversal")) {
//     status = 409; // Conflict (wrong state for the action)
//   }

//   console.error(`Controller Error (${status}):`, message);
//   return res.status(status).json({ message });
// }

// /**
//  * 🧩 NEW CONTROLLER FUNCTION: Creates or retrieves the user's Blockrader USD Wallet.
//  * This must be called by the user before initiating any P2P trade that pays out in USD.
//  * Endpoint: POST /api/wallets/usd
//  */
// const createUsdWallet = async (req, res) => {
//   try {
//     const userId = req.user.id;
    
//     // 1. Check if wallet already exists
//     const existingWallet = await blockrader.getWalletByUserId(userId, "USD");

//     if (existingWallet) {
//       return res.status(200).json({
//         message: "USD Wallet already exists.",
//         data: existingWallet,
//       });
//     }

//     // 2. Fetch user details needed for Blockrader metadata
//     const user = await User.findById(userId).lean();
//     if (!user) {
//       return handleServiceError(res, new Error("User not found for wallet creation."));
//     }

//     // 3. Create the wallet via Blockrader service
//     const newWallet = await blockrader.createUsdWallet({
//       userId: user._id,
//       email: user.email,
//       name: `${user.firstName} ${user.lastName}`,
//       currency: "USD"
//     });

//     res.status(201).json({
//       message: "USD Wallet created successfully.",
//       data: newWallet,
//     });
//   } catch (error) {
//     handleServiceError(res, error);
//   }
// }


// /**
//  * 🧩 Controller: Handles HTTP requests for P2P trading actions
//  */

// // 1. MOCK Trade Initiation (for testing without ads)
// const createTrade = async (req, res) => {
//   try {
//     const buyerId = req.user.id;
//     const ip = req.ip;
//     // Direct inputs for the service call
//     const { merchantId, amountSource, currencySource, currencyTarget, rate } = req.body; 

//     // Basic Input Validation for mock scenario
//     if (!merchantId || typeof amountSource !== 'number' || amountSource <= 0 || !currencySource || !currencyTarget || !rate) {
//         return handleServiceError(res, new Error("Missing or invalid required trade details: merchantId, amountSource, currencySource, currencyTarget, and rate are required for trade initiation."));
//     }

//     // Calculate amountTarget based on the provided rate
//     const amountTarget = amountSource * rate;

//     // Initiate the trade using the service layer
//     const trade = await p2pService.initiateTrade(
//       buyerId,
//       merchantId,
//       {
//         amountSource,
//         amountTarget,
//         currencySource,
//         currencyTarget,
//         rate,
//         // adId is intentionally omitted in this mock scenario
//       },
//       ip
//     );

//     res.status(201).json({
//       message: "Trade created successfully (currently using mock logic, bypasses Ad lookup)",
//       data: trade,
//     });
//   } catch (error) {
//     handleServiceError(res, error);
//   }
// }


// // 2. Buyer confirms they’ve paid (starts escrow, POST /trade/:reference/confirm-buyer-payment)
// const buyerConfirmPayment = async (req, res) => {
//   try {
//     const buyerId = req.user.id;
//     const { reference } = req.params; 
//     const ip = req.ip;

//     if (!reference) {
//       return handleServiceError(res, new Error("Trade reference is required in the URL path."));
//     }
    
//     const trade = await p2pService.confirmBuyerPayment(reference, buyerId, ip);

//     res.status(200).json({
//       message: "Buyer payment confirmed, merchant asset moved to escrow (for external trades)",
//       data: trade,
//     });
//   } catch (error) {
//     handleServiceError(res, error);
//   }
// }

// // 3. Merchant confirms receipt of fiat (releases escrow, POST /trade/:reference/confirm-merchant-payment)
// const merchantConfirmPayment = async (req, res) => {
//   try {
//     const merchantId = req.user.id;
//     const { reference } = req.params;
//     const ip = req.ip;
    
//     if (!reference) {
//       return handleServiceError(res, new Error("Trade reference is required in the URL path."));
//     }

//     // NOTE: The service layer (p2pService.js) handles destination lookup from the Wallet model, 
//     // so no address needs to be passed here.
//     const trade = await p2pService.confirmMerchantPayment(reference, merchantId, ip);

//     res.status(200).json({
//       message: "Trade successfully settled. Escrow released to respective parties.",
//       data: trade,
//     });
//   } catch (error) {
//     handleServiceError(res, error);
//   }
// }

// // 4. Cancel trade (DELETE /trade/:reference/cancel)
// const cancelTrade = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { reference } = req.params; 
//     const ip = req.ip;

//     if (!reference) {
//       return handleServiceError(res, new Error("Trade reference is required in the URL path."));
//     }

//     const trade = await p2pService.cancelTrade(reference, userId, ip);

//     res.status(200).json({
//       message: `Trade cancelled successfully. Status: ${trade.status}`,
//       data: trade,
//     });
//   } catch (error) {
//     handleServiceError(res, error);
//   }
// }

// // Using the concise export syntax, and only exporting the functions intended for the router.
// module.exports = {
//   createTrade,
//   buyerConfirmPayment,
//   merchantConfirmPayment,
//   cancelTrade,
//   createUsdWallet,
// };

const p2pService = require("../services/p2pService");
const blockrader = require("../services/providers/blockrader"); 
const User = require("../models/userModel"); 
// const MerchantAd = require("../models/merchantModel"); 

/**
 * Helper function to map service errors to appropriate HTTP status codes.
 * This function remains unchanged as it's solid.
 */
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

  console.error(`❌ Controller Error (${status}): ${message}`);
  res.status(status).json({ message });
}


// 1. Initiate trade (POST /trade/initiate)
const createTrade = async (req, res) => {
    try {
        // userId comes from the middleware (verifyToken) after successful authentication
        const userId = req.user.id; 
        const ip = req.ip;
        
        // Extract all necessary fields (including the missing currency fields)
        const { merchantId, amountSource, amountTarget, provider, rate, sourceAccountNumber, currencySource, currencyTarget, destinationAddress } = req.body;

        // Validation for required fields
        if (!merchantId || !amountSource || !amountTarget || !provider || !rate || !currencySource || !currencyTarget) {
            return handleServiceError(res, new Error("Missing or invalid required trade details: merchantId, amountSource, amountTarget, currencySource, currencyTarget, and rate are required for trade initiation."));
        }

        const tradeDetails = {
            userId,
            merchantId,
            amountSource,
            amountTarget,
            provider,
            rate,
            sourceAccountNumber, // NGN Wallet/Account (for 9PSB)
            destinationAddress,  // Crypto Address (for Blockrader)
            currencySource,
            currencyTarget,
            ip,
        };

        // 🔑 FIX IS HERE: Calling the correctly named function 'createTrade'
        const newTrade = await p2pService.createTrade(tradeDetails); 
        
        res.status(201).json({
            message: "Trade initiation successful. Awaiting buyer payment confirmation.",
            data: newTrade,
        });
    } catch (error) {
        handleServiceError(res, error);
    }
};


// 2. Buyer confirms payment (POST /trade/:reference/confirm-buyer-payment)
const buyerConfirmPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reference } = req.params;
    const ip = req.ip;

    if (!reference) {
      return handleServiceError(res, new Error("Trade reference is required in the URL path."));
    }

    const trade = await p2pService.confirmBuyerPayment(reference, userId, ip);

    res.status(200).json({
      message: "Buyer payment confirmed successfully. Awaiting merchant action.",
      data: trade,
    });
  } catch (error) {
    handleServiceError(res, error);
  }
};


// 3. Merchant confirms payment (POST /trade/:reference/confirm-merchant-payment)
const merchantConfirmPayment = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { reference } = req.params;
    const ip = req.ip;
    
    if (!reference) {
      return handleServiceError(res, new Error("Trade reference is required in the URL path."));
    }

    // NOTE: The service layer (p2pService.js) handles destination lookup from the Wallet model, 
    // so no address needs to be passed here.
    const trade = await p2pService.confirmMerchantPayment(reference, merchantId, ip);

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

module.exports = {
  createTrade, // ⬅️ Must be exported to match p2pRoute.js
  buyerConfirmPayment,
  merchantConfirmPayment,
  cancelTrade,
};