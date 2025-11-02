const axios = require("axios");
const Wallet = require("../../models/walletModel"); // Assuming this path is correct

// --- Environment Config ---
// CRITICAL: You must replace these with your actual 9PSB credentials.
// NINEPSB_BASE_URL: e.g., 'http://102.216.128.75:9090/waas' (from docs)
const NINEPSB_BASE_URL = process.env.NINEPSB_WAAS_BASE_URL;
const NINEPSB_CLIENT_ID = process.env.NINEPSB_WAAS_CLIENT_ID;
const NINEPSB_CLIENT_SECRET = process.env.NINEPSB_WAAS_CLIENT_SECRET;
const NINEPSB_API_KEY = process.env.NINEPSB_API_KEY; 

// CRITICAL: This is the account number 9PSB support MUST provide you.
const NINEPSB_FLOAT_ACCOUNT = process.env.NINEPSB_FLOAT_ACCOUNT; 

let NINEPSB_BEARER_TOKEN = null;
let TOKEN_EXPIRY_TIME = 0;

// ----------------------------
// 🧩 Utility: Centralized Error Logger
// ----------------------------
function logNinepsbError(context, error) {
  if (error.response) {
    const apiMessage = error.response.data?.message;
    console.error(
      `[9PSB] ${context} failed with status ${error.response.status}. API Message: ${apiMessage}`
    );
    throw new Error(`9PSB API Error during ${context}: ${apiMessage || error.response.statusText}`);
  } else {
    console.error(`[9PSB] ${context} failed:`, error.message);
    throw new Error(`9PSB Connection Error during ${context}: ${error.message}`);
  }
}

// ----------------------------
// 🔑 Authentication & Token Management
// ----------------------------

/**
 * @name authenticate
 * @description Generates and caches the bearer token for 9PSB API calls.
 */
async function authenticate() {
  if (NINEPSB_BEARER_TOKEN && Date.now() < TOKEN_EXPIRY_TIME) {
    console.log("🔄 NINEPSB WAAS token still valid. Using cached token.");
    return NINEPSB_BEARER_TOKEN;
  }

  console.log("🔄 NINEPSB WAAS token expired or missing. Generating new token...");
  try {
    const url = `${NINEPSB_BASE_URL}/api/v1/user/authenticate`;
    const response = await axios.post(url, {
      clientId: NINEPSB_CLIENT_ID,
      clientSecret: NINEPSB_CLIENT_SECRET,
    }, {
      headers: { "Content-Type": "application/json" }
    });

    const token = response.data?.accessToken;
    const expiresIn = response.data?.expiresIn || 3600; // Default to 1 hour if not provided

    if (token) {
      NINEPSB_BEARER_TOKEN = token;
      // Set expiry 5 minutes before actual expiry for buffer
      TOKEN_EXPIRY_TIME = Date.now() + (expiresIn * 1000) - (5 * 60 * 1000); 
      console.log("✅ New NINEPSB WAAS token generated successfully.");
      return NINEPSB_BEARER_TOKEN;
    } else {
      throw new Error("Authentication successful but no access token received.");
    }
  } catch (error) {
    logNinepsbError("authenticate", error);
  }
}


// ----------------------------
// 💰 Core P2P Transaction Logic
// ----------------------------

/**
 * @name intraBankTransfer
 * @description Generic function to execute an Intra-Bank Transfer between two 9PSB accounts.
 */
async function intraBankTransfer(sourceAccount, destinationAccount, amount, reference, narration, context) {
    if (!NINEPSB_FLOAT_ACCOUNT) {
        throw new Error("Missing NINEPSB_FLOAT_ACCOUNT environment variable. Cannot proceed with escrow/release.");
    }
    
    const token = await authenticate();
    const headers = {
        "Authorization": `Bearer ${token}`,
        "X-Trace-Id": reference, // Use trade reference as Trace ID
        "Content-Type": "application/json",
        "apikey": NINEPSB_API_KEY // Per 9PSB documentation, some endpoints require apikey header
    };

    const payload = {
        amount: parseFloat(amount).toFixed(2),
        sourceAccountNumber: sourceAccount,
        destinationAccountNumber: destinationAccount,
        transactionTrackingRef: reference, // Use trade reference for tracking
        narration: narration
    };

    try {
        console.log(`[9PSB] Executing ${context}: ${sourceAccount} -> ${destinationAccount} for NGN ${amount}`);
        
        const url = `${NINEPSB_BASE_URL}/api/v1/transaction/transfer/intra-bank`;
        const response = await axios.post(url, payload, { headers });

        if (response.data?.statusCode === "00") {
            console.log(`[9PSB] ${context} successful. Ref: ${reference}`);
            return { 
                success: true, 
                txId: response.data.data?.transactionReference || response.data?.reference, 
                message: response.data.message 
            };
        } else {
             // Handle 9PSB specific error codes
            const errorMsg = response.data?.message || `Status Code ${response.data?.statusCode}`;
            throw new Error(`9PSB Transaction Failed: ${errorMsg}`);
        }
    } catch (error) {
        logNinepsbError(context, error);
    }
}


/**
 * @name debitUserToEscrow
 * @description Debits the Buyer's NGN wallet and credits the central NGN Float/Escrow account.
 * (Source: Buyer's 9PSB Account, Destination: NINEPSB_FLOAT_ACCOUNT)
 */
async function debitUserToEscrow(buyerAccountNumber, amount, reference) {
    return intraBankTransfer(
        buyerAccountNumber, 
        NINEPSB_FLOAT_ACCOUNT, 
        amount, 
        reference, 
        "P2P Escrow: Buyer Debit",
        "DebitUserToEscrow"
    );
}

/**
 * @name creditMerchantFromEscrow
 * @description Debits the central NGN Float/Escrow account and credits the Merchant's NGN wallet.
 * (Source: NINEPSB_FLOAT_ACCOUNT, Destination: Merchant's 9PSB Account)
 */
async function creditMerchantFromEscrow(merchantAccountNumber, amount, reference) {
    return intraBankTransfer(
        NINEPSB_FLOAT_ACCOUNT, 
        merchantAccountNumber, 
        amount, 
        reference, 
        "P2P Escrow: Merchant Credit",
        "CreditMerchantFromEscrow"
    );
}

/**
 * @name creditUserFromEscrow
 * @description Reverses the escrow: Debits Float/Escrow and credits the Buyer's NGN wallet.
 * (Source: NINEPSB_FLOAT_ACCOUNT, Destination: Buyer's 9PSB Account)
 */
async function creditUserFromEscrow(buyerAccountNumber, amount, reference) {
    return intraBankTransfer(
        NINEPSB_FLOAT_ACCOUNT, 
        buyerAccountNumber, 
        amount, 
        reference, 
        "P2P Escrow: Reversal to Buyer",
        "CreditUserFromEscrow (Reversal)"
    );
}


module.exports = {
    debitUserToEscrow,
    creditMerchantFromEscrow,
    creditUserFromEscrow,
    PROVIDER_NAME: "9PSB",
};
