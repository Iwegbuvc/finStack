const axios = require("axios");
const Wallet = require("../../models/walletModel");

// --- Environment Config ---
// Variables are safely accessed via process.env
const BLOCKRADER_API_KEY = process.env.BLOCKRADER_API_KEY;
const BLOCKRADER_BASE_URL = process.env.BLOCKRADER_BASE_URL; 

// Using the correct environment variable names from your .env file
const BLOCKRADER_MASTER_WALLET_UUID = process.env.COMPANY_ESCROW_ACCOUNT_ID;
const BLOCKRADER_USD_ASSET_ID = process.env.BLOCKRADER_USD_ASSET_ID; 
const ESCROW_DESTINATION_ADDRESS = process.env.MASTER_WALLET_ADDRESS; // Exported for use in p2pService

// --- Headers (Define once) ---
const headers = {
  // Use the x-api-key header for Blockrader authentication
  "x-api-key": BLOCKRADER_API_KEY,
  "Content-Type": "application/json",
};

// -----------------------------
// 🧩 Utility: Centralized Error Logger
// -----------------------------
function logBlockraderError(context, error) {
  if (error.response) {
    // Attempt to log specific message from the response data if available
    const apiMessage = error.response.data?.message;
    console.error(
      `[Blockrader] ${context} failed with status ${error.response.status}:`,
      apiMessage || error.response.data
    );
  } else if (error.request) {
    console.error(`[Blockrader] ${context} failed: No response from server`, error.request);
  } else {
    console.error(`[Blockrader] ${context} error:`, error.message);
  }
}

// -----------------------------
// 💰 Create USD Wallet Address (Under Master Wallet)
// -----------------------------
/**
 * Creates a new user address (account) nested under the Master Company Wallet.
 * @param {string} userId - MongoDB User _id
 * @param {string} email - User's email
 * @param {string} name - User full name
 * @returns {Promise<Object>} Newly created wallet object (MongoDB)
 */
async function createUsdWallet({ userId, email, name, currency = "USD" }) {
  try {
    if (!BLOCKRADER_MASTER_WALLET_UUID) {
        throw new Error("FATAL: Master Wallet UUID (COMPANY_ESCROW_ACCOUNT_ID) is missing or undefined.");
    }

    // CRITICAL: We create a new ADDRESS under the MASTER WALLET, not a new top-level wallet.
    const response = await axios.post(
      `${BLOCKRADER_BASE_URL}/wallets/${BLOCKRADER_MASTER_WALLET_UUID}/addresses`,
      {
        disableAutoSweep: true,
        metadata: { userId, email },
        name: `${name}'s Escrow Address`,
      },
      { headers }
    );

    const data = response.data;
    if (!data.id || !data.address) {
      throw new Error("Invalid response from Blockrader API: Missing address ID or crypto address.");
    }

    // The 'externalWalletId' stored in MongoDB is the Address ID (UUID)
    const newWallet = new Wallet({
      user_id: userId,
      currency,
      externalWalletId: data.id, // This is the Address ID (UUID)
      account_number: data.address, // This is the Crypto Address (0x...)
      account_name: `${name}'s Escrow Address`,
      provider: "blockrader",
      status: "ACTIVE",
    });

    await newWallet.save();
    console.log(`[Blockrader] New Address created under Master Wallet for ${email}. ID: ${data.id}`);
    return newWallet;

  } catch (error) {
    logBlockraderError("Create USD Wallet Address", error);
    throw new Error(`Unable to create user address on Blockrader: ${error.message}`);
  }
}

// -----------------------------
// 🧾 Get User Address ID (Now returns the Address UUID)
// -----------------------------
async function getUserAddressId(userId) {
  const wallet = await Wallet.findOne({ user_id: userId, currency: "USD" }); // Add currency filter if needed

  if (!wallet) {
    // This addresses Error 1: Wallet not found
    throw new Error(`Wallet document not found for user ${userId} and currency USD.`);
  }
  
  if (!wallet.account_number) {
    // This addresses Error 1 and 3: The 0x address is missing from the DB record
    throw new Error(`Wallet found for user ${userId}, but the required 'account_number' (crypto address) is missing.`);
  }

  // We return the Address UUID (stored as externalWalletId)
  return {
    addressId: wallet.externalWalletId,
    cryptoAddress: wallet.account_number
  };
}

// -----------------------------
// 💸 Get Transfer Fee (Using a placeholder for internal transfers)
// -----------------------------
async function getTransferFee(asset = "USD") {
  try {
    const { data } = await axios.get(`${BLOCKRADER_BASE_URL}/fees?asset=${asset}`, { headers });
    return data;
  } catch (error) {
    logBlockraderError("Get Transfer Fee", error);
    throw new Error("Failed to fetch transfer fee from Blockrader.");
  }
}

// -----------------------------
// ⬆️ CORE FUNDING FUNCTION: Fund Child Wallet (Master -> Child)
// -----------------------------
/**
 * Funds a child address (user sub-account) by initiating a withdrawal from the Master Wallet.
 * This uses the Master Wallet /withdraw endpoint.
 *
 * @param {string} destinationCryptoAddress - The Child Wallet's 0x... address (account_number)
 * @param {number} amount - Amount to transfer.
 * @param {string} currency - The currency symbol (e.g., 'USD').
 * @param {string} [p2pReference] - The P2P trade reference to use for reconciliation.
 */
async function fundChildWallet(destinationCryptoAddress, amount, currency, p2pReference = null) {
  try {
    console.log(
      `[Blockrader] Attempting internal funding of ${amount} ${currency} from Master Wallet → Child Crypto Address ${destinationCryptoAddress}`
    );
    
    // CRITICAL: Ensure Master UUID is present
    if (!BLOCKRADER_MASTER_WALLET_UUID) {
        throw new Error("FATAL: Master Wallet UUID (COMPANY_ESCROW_ACCOUNT_ID) is missing or undefined.");
    }

    // Using the documented Master Wallet Withdrawal endpoint for Master -> Child funding
    const url = `${BLOCKRADER_BASE_URL}/wallets/${BLOCKRADER_MASTER_WALLET_UUID}/withdraw`;
    
    console.log(`[Blockrader] Target API URL: ${url}`);
    
    // Use the P2P reference if provided, otherwise fall back to a generic one
    const reference = p2pReference || `Master-Fund-${Date.now()}`;

    // Step 2: Perform the withdrawal from Master
    const { data } = await axios.post(
      url,
      {
        assetId: BLOCKRADER_USD_ASSET_ID,
        // The child wallet's crypto address (0x...) goes in the 'address' field
        address: destinationCryptoAddress, 
        amount: amount.toString(),
        // ✅ FIX 1: Use the P2P reference for reconciliation
        reference: reference
      },
      { headers }
    );

    console.log("[Blockrader] Child Wallet funding successful. Transaction ID:", data.transferId || data.id);
    return data;

  } catch (error) {
    logBlockraderError("Fund Child Wallet (Master -> Child)", error);
    throw new Error("Funding transfer failed at provider level. Check Master balance and destination address.");
  }
}

// -----------------------------
// 🔁 P2P Function Wrapper: Handles Escrow and Settlement transfers
// -----------------------------
/**
 * P2P Wrapper: Transfers funds between two internal addresses (one of which is always the Master Wallet).
 * Routes the transfer to the correct Blockrader API endpoint based on source/destination.
 *
 * @param {string} sourceAddressId - The internal Address ID (UUID) or BLOCKRADER_MASTER_WALLET_UUID.
 * @param {string} destinationAddressId - The internal Address ID (UUID) or BLOCKRADER_MASTER_WALLET_UUID.
 * @param {number} amount - Amount to transfer.
 * @param {string} currency - The currency symbol (e.g., 'USD').
 * @param {string} destinationCryptoAddress - The recipient's 0x... address (account_number) for the API body.
 * @param {string} [p2pReference] - The P2P trade reference to use for reconciliation. (NEW PARAMETER)
 * @returns {Promise<Object>} Transfer result data.
 */
async function transferFunds(sourceAddressId, destinationAddressId, amount, currency, destinationCryptoAddress, p2pReference = null) {
    if (sourceAddressId === BLOCKRADER_MASTER_WALLET_UUID) {
        // --- Flow 1: Master -> Child (Settlement/Reversal) ---
        // This is Master Wallet (source UUID) -> User Child Address (destination crypto address).
        console.log(`[Blockrader] P2P Router: Executing Master Wallet -> Child Address settlement/reversal.`);
        // Pass the p2pReference down to fundChildWallet
        return fundChildWallet(destinationCryptoAddress, amount, currency, p2pReference);
    } else if (destinationAddressId === BLOCKRADER_MASTER_WALLET_UUID) {
        // --- Flow 2: Child -> Master (Escrow) ---
        // This is User Child Address (source UUID) -> Master Wallet (destination crypto address).
        console.log(`[Blockrader] P2P Router: Executing Child Address -> Master Wallet escrow.`);

        // The P2P reference is preferred, falling back to a unique escrow ID
        const reference = p2pReference || `ESCROW-${sourceAddressId}-${Date.now()}`;
        
        // Use the source address ID (child address UUID) for the withdraw endpoint
        const url = `${BLOCKRADER_BASE_URL}/wallets/${BLOCKRADER_MASTER_WALLET_UUID}/addresses/${sourceAddressId}/withdraw`;

        try {
            const { data } = await axios.post(
                url,
                {
                    assetId: BLOCKRADER_USD_ASSET_ID,
                    address: destinationCryptoAddress, // Should be ESCROW_DESTINATION_ADDRESS
                    amount: amount.toString(),
                    requestId: reference, // Use reference as idempotency key
                    // ✅ FIX 2: Add the P2P reference for webhook reconciliation
                    reference: reference
                },
                { headers }
            );

            console.log("[Blockrader] Escrow to Master successful. Transaction ID:", data.transferId || data.id);
            return data;
        } catch (error) {
            logBlockraderError("Escrow to Master (Child -> Master)", error);
            throw new Error("Escrow transfer failed at provider level. Check user balance and API configuration.");
        }
        
    } else {
        throw new Error("Unsupported P2P transfer flow: Transfer must involve the Master Escrow Wallet.");
    }
}


// -----------------------------
// 🏦 Create Deposit Address (Now redundant, as createUsdWallet does this)
// -----------------------------
const createDepositAddress = async (walletId) => {
    // In the Single Master Wallet Model, this function is redundant because
    // the initial call to createUsdWallet already creates the one necessary
    // 'address' (deposit account) for the user under the master wallet.
    console.warn("[Blockrader] createDepositAddress is redundant in Single Master Wallet Model. Use the address/account created by createUsdWallet.");
    throw new Error("Function is disabled for the chosen architectural model.");
};


// -----------------------------
// 💵 Withdraw from Blockrader (Child -> External Withdrawal)
// -----------------------------
/**
 * Withdraws funds from an internal address (sourceAddressId) to an external 0x... address.
 * @param {string} sourceAddressId - The internal Address ID (UUID) to withdraw from.
 * @param {string} toCryptoAddress - The external 0x... crypto address.
 * @param {number} amount - Amount to transfer.
 * @param {string} idempotencyKey - Unique key for safety.
 * @param {string} [p2pReference] - Optional P2P trade reference.
 */
async function withdrawFromBlockrader(sourceAddressId, toCryptoAddress, amount, idempotencyKey, p2pReference = null) {
  if (!idempotencyKey) {
    throw new Error("External withdrawal requires a unique idempotencyKey for safety.");
  }
  
  try {
    console.log(`[Blockrader] Attempting external withdrawal of ${amount} USD from child ID ${sourceAddressId} to external ${toCryptoAddress}`);
    
    // This endpoint uses the correct documented format: /wallets/{masterId}/addresses/{sourceId}/withdraw
    const url = `${BLOCKRADER_BASE_URL}/wallets/${BLOCKRADER_MASTER_WALLET_UUID}/addresses/${sourceAddressId}/withdraw`;

    const { data } = await axios.post(
      url,
      {
        assetId: BLOCKRADER_USD_ASSET_ID,
        address: toCryptoAddress, // CRITICAL: The 0x address goes in the body 'address' field
        amount: amount.toString(),
        requestId: idempotencyKey, 
        // Use the P2P reference if provided, otherwise fall back to the idempotency key
        reference: p2pReference || idempotencyKey
      },
      { headers }
    );

    console.log("[Blockrader] External Withdrawal successful:", data);
    return data;
  } catch (error) {
    logBlockraderError("External Withdrawal (Child -> External)", error);
    throw new Error("External withdrawal failed at provider level.");
  }
}

module.exports = {
    createUsdWallet,
    getUserAddressId,    
    fundChildWallet, // Keep for Master -> Child compatibility/clarity
    transferFunds, // ✅ NOW EXPORTED: The new routing wrapper for P2P service
    getTransferFee,  
    createDepositAddress,  
    withdrawFromBlockrader,  
    BLOCKRADER_MASTER_WALLET_UUID,  
    ESCROW_DESTINATION_ADDRESS,  
};
