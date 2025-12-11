    const axios = require("axios");
    const Wallet = require("../../models/walletModel");

    // --- Environment Config ---
    // Variables are safely accessed via process.env
    const BLOCKRADER_API_KEY = process.env.BLOCKRADER_API_KEY;
    const BLOCKRADER_BASE_URL = process.env.BLOCKRADER_BASE_URL; 
    // Using the correct environment variable names from your .env file
    const BLOCKRADER_MASTER_WALLET_UUID = process.env.COMPANY_ESCROW_ACCOUNT_ID;
    const BLOCKRADER_USD_ASSET_ID = process.env.BLOCKRADER_USD_ASSET_ID; 
    const BLOCKRADER_CNGN_ASSET_ID = process.env.BLOCKRADER_CNGN_ASSET_ID;
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
                `[Blockrader] ${context} failed with status: ${error.response.status}. API Message: ${apiMessage || 'No specific message'}`
            );
        } else {
            console.error(`[Blockrader] ${context} failed:`, error.message);
        }
    }
    // -----------------------------
    // 🆕 NEW HELPER: Get Asset ID by Currency
    // -----------------------------
    function getAssetId(currency) {
        // Note: 'cNGN' and 'USDC' are used internally by p2pService
        switch (currency.toUpperCase()) {
            case "USDC":
                return BLOCKRADER_USD_ASSET_ID;
            case "CNGN":
                return BLOCKRADER_CNGN_ASSET_ID;
            default:
                console.error(`Unsupported stablecoin asset ID requested for currency: ${currency}`);
                throw new Error(`Unsupported stablecoin currency for escrow: ${currency}`);
        }
    }

    // -----------------------------
    // 💰 NEW HELPER: Create Wallet DB Record
    async function createWalletRecord({ userId, currency, externalWalletId, accountNumber, accountName, session, walletAddress}) {
   const filter = { user_id: userId, currency };
  const setOnInsert = {
    user_id: userId,
    currency,
    externalWalletId: externalWalletId || null,
    walletAddress: walletAddress || null,
    account_number: accountNumber || null,
    account_name: accountName || null,
    provider: 'BLOCKRADAR',
    status: 'ACTIVE',
 
  };

  try {
    // atomic-ish: creates once or leaves existing
   
    await Wallet.updateOne(filter, { $setOnInsert: setOnInsert }, { upsert: true, session, timestamps: false });


    // return the current wallet (existing or newly created)
    const wallet = await Wallet.findOne(filter).session(session);
    return wallet;
  } catch (err) {
    // If duplicate key slipped through, treat as success and return existing wallet
    if (err && err.code === 11000) {
      return await Wallet.findOne(filter).session(session);
    }
    throw err; // bubble other errors
  }
   
    }

    async function getOrCreateStablecoinAddress(user) {
const existing = await Wallet.findOne({ user_id: user._id, currency: "USDC" });


if (existing) {
return {
fromExisting: true,
cryptoAddress: existing.cryptoAddress,
externalWalletId: existing.externalWalletId
};
}


// 🔄 Call original unchanged low-level function
const newAddress = await createStablecoinAddress({
userId: user._id,
email: user.email,
name: user.firstName
});


// 🆕 Prevent duplicates using upsert
await Wallet.updateOne(
{ user_id: user._id, currency: "USDC" },
{
$setOnInsert: {
cryptoAddress: newAddress.cryptoAddress,
externalWalletId: newAddress.externalWalletId,
balance: 0,
// network: "Polygon"
}
},
{ upsert: true }
);


return { ...newAddress, fromExisting: false };
}

    // 🚀 REFACTORED: CREATE BLOCKRADER ADDRESS (Replaces createUsdWallet)
    async function createStablecoinAddress({ userId, email, name }) {
        try {
            if (!BLOCKRADER_MASTER_WALLET_UUID) {
                throw new Error("FATAL: Master Wallet UUID (COMPANY_ESCROW_ACCOUNT_ID) is missing or undefined.");
            }

            const response = await axios.post(
                `${BLOCKRADER_BASE_URL}/wallets/${BLOCKRADER_MASTER_WALLET_UUID}/addresses`,
                {
                    disableAutoSweep: true,
                    metadata: { userId, email },
                    name: `${name}'s Escrow Address`,
                },
                { headers }
            );

            // ✅ CRITICAL FIX: Extract the actual data payload from the nested 'data' field
            const responseData = response.data.data; 

            if (!responseData || !responseData.id || !responseData.address) {
                throw new Error("Invalid response from Blockrader API: Missing address ID or crypto address in data payload.");
            }

            console.log(`[Blockrader] New Address created under Master Wallet for ${email}. ID: ${responseData.id}`);
            
            // 💡 CHANGE: DO NOT create a Wallet record here. Just return the Blockrader address details.
            return { 
                externalWalletId: responseData.id,      // Blockrader Address ID (UUID)
                cryptoAddress: responseData.address,    // The Crypto Address (0x...)
                accountName: `${name}'s Escrow Address`
            };

        } catch (error) {
            logBlockraderError("Create Stablecoin Address", error);
            throw new Error(`Unable to create user address on Blockrader: ${error.message}`);
        }
    }

    // 🏦 CREATE VIRTUAL ACCOUNT (linked to Child Address)
    async function createVirtualAccountForChildAddress(childAddressId, kycData) {
        const context = "Create Virtual Account (cNGN Deposit) for Child Address";
        
        if (!BLOCKRADER_MASTER_WALLET_UUID) {
            throw new Error("FATAL: Master Wallet UUID (COMPANY_ESCROW_ACCOUNT_ID) is missing or undefined.");
        }
        if (!childAddressId) {
            throw new Error("CRITICAL: Child Address ID is missing for Virtual Account creation.");
        }
        
        // Ensure phone number is in the required format: +234XXXXXXXXXX
        let phoneInFormat = kycData.phoneNo;
        if (phoneInFormat && !phoneInFormat.startsWith('+')) {
            phoneInFormat = `+234${phoneInFormat.startsWith('0') ? phoneInFormat.substring(1) : phoneInFormat}`;
        }

        const payload = {
            firstname: kycData.firstName,
            lastName: kycData.lastName,
            email: kycData.email,
            phone: phoneInFormat, 
            // type: "AUTO_FUNDING" is the default.
        };
        
        // 🚀 CRITICAL ENDPOINT CHANGE 🚀
        // Endpoint: POST /wallets/{masterWalletId}/addresses/{childAddressId}/virtual-accounts
        const url = `${BLOCKRADER_BASE_URL}/wallets/${BLOCKRADER_MASTER_WALLET_UUID}/addresses/${childAddressId}/virtual-accounts`;

        try {
            console.log(`[Blockrader] Attempting to create Virtual Account for ${kycData.email} linked to Address ID: ${childAddressId}`);

            const response = await axios.post(url, payload, { headers });
            
            if (response.data.statusCode !== 201 || response.data.status === 'error') {
                throw new Error(response.data.message || "Blockrader Virtual Account creation failed with unknown error.");
            }
            
            const data = response.data.data;
            
            console.log(`[Blockrader] Virtual Account created successfully. Account Number: ${data.accountNumber}`);

            // Return the essential details
            return {
                accountName: data.accountName,
                accountNumber: data.accountNumber, // The virtual account number for deposits
                bankName: data.bankName,
                customerId: data.customer.id,
                platformWalletId: data.wallet.id, // This should be the Child Address ID
            };
        } catch (error) {
            logBlockraderError(context, error);
            throw new Error("Failed to create user's cNGN deposit account: " + (error.response?.data?.message || error.message));
        }
    }
async function createVirtualAccountIfMissing(user, childAddressId, kycData) {

    // 1. Check if NGN virtual account already exists
    const existing = await Wallet.findOne({ user_id: user._id, currency: "NGN" });

    if (existing) {
        return { fromExisting: true, ...existing.toObject() };
    }

    // 2. Create a new Virtual Account (this calls Blockrader)
    const virtualAccount = await createVirtualAccountForChildAddress(
        childAddressId,  // MUST be Blockrader Address UUID
        kycData          // must contain: firstName, lastName, email, phoneNo
    );

    // 3. Save NGN Bank Account in Wallet collection (idempotent)
    await Wallet.updateOne(
        { user_id: user._id, currency: "NGN" },
        {
            $setOnInsert: {
                externalWalletId: childAddressId,
                account_number: virtualAccount.accountNumber,
                account_name: virtualAccount.accountName,
                bankName: virtualAccount.bankName,
                balance: 0,
                provider: "BLOCKRADAR",
                status: "ACTIVE"
            }
        },
        { upsert: true, timestamps: false }
    );

    return { fromExisting: false, ...virtualAccount };
}

// 💰 NEW HELPER: Get Single Wallet Balance
async function getWalletBalance(externalWalletId, currency) {
    try {
        const assetId = getAssetId(currency);
        
        // This is the correct Blockrader endpoint to get a balance for a specific asset on an address.
        const response = await axios.get(
            `${BLOCKRADER_BASE_URL}/wallets/${BLOCKRADER_MASTER_WALLET_UUID}/addresses/${externalWalletId}/assets/${assetId}`,
            { headers }
        );

        const assetData = response.data.data;
        
        if (!assetData || typeof assetData.balance === 'undefined') {
            throw new Error(`Invalid balance data received for address ${externalWalletId}.`);
        }

        return { 
            balance: parseFloat(assetData.balance), 
            currency: currency.toUpperCase() 
        };

    } catch (error) {
        logBlockraderError(`Get Balance for Address ${externalWalletId} / ${currency}`, error);
        throw new Error(`Failed to fetch live balance for ${currency}.`);
    }
}

    // 🧾 Get User Address ID (Now returns the Address UUID)
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

    // 💸 Get Transfer Fee (Using a placeholder for internal transfers)
    async function getTransferFee(asset = "USD") {
      try {
        const { data } = await axios.get(`${BLOCKRADER_BASE_URL}/fees?asset=${asset}`, { headers });
        return data;
      } catch (error) {
        logBlockraderError("Get Transfer Fee", error);
        throw new Error("Failed to fetch transfer fee from Blockrader.");
      }
    }

    // ⬆️ CORE FUNDING FUNCTION: Fund Child Wallet (Master -> Child)
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
    const assetId = getAssetId(currency);
        // Step 2: Perform the withdrawal from Master
        const { data } = await axios.post(
          url,
          {
            assetId: assetId,
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
        
        const assetId = getAssetId(currency);

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
                        assetId: assetId,
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
    // 💵 Withdraw from Blockrader (Child -> External Withdrawal)
    // -----------------------------
    /**
     * Withdraws funds from an internal address (sourceAddressId) to an external 0x... address.
     * @param {string} sourceAddressId - The internal Address ID (UUID) to withdraw from.
     * @param {string} toCryptoAddress - The external 0x... crypto address.
     * @param {number} amount - Amount to transfer.
    * @param {string} currency - The currency symbol (e.g., 'USDC', 'CNGN').
     * @param {string} idempotencyKey - Unique key for safety.
     * @param {string} [p2pReference] - Optional P2P trade reference.
     */
    async function withdrawFromBlockrader(sourceAddressId, toCryptoAddress, amount, currency, idempotencyKey, p2pReference = null) {
      if (!idempotencyKey) {
        throw new Error("External withdrawal requires a unique idempotencyKey for safety.");
      }
     
     try {
       console.log(`[Blockrader] Attempting external withdrawal of  ${amount} ${currency} from child ID ${sourceAddressId} to external ${toCryptoAddress}`);
       
       // This endpoint uses the correct documented format: /wallets/{masterId}/addresses/{sourceId}/withdraw
       const url = `${BLOCKRADER_BASE_URL}/wallets/${BLOCKRADER_MASTER_WALLET_UUID}/addresses/${sourceAddressId}/withdraw`;
    const assetId = getAssetId(currency);
        const { data } = await axios.post(
          url,
          {
            assetId: assetId,
            address: toCryptoAddress, 
            amount: amount.toString(),
            requestId: idempotencyKey, 
          
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
        createWalletRecord,
        getOrCreateStablecoinAddress,
        createStablecoinAddress,
        createVirtualAccountForChildAddress,
        createVirtualAccountIfMissing,
        getUserAddressId,    
        fundChildWallet, 
        transferFunds, 
        getAssetId,
        getTransferFee,  
        getWalletBalance,
        withdrawFromBlockrader,  
        BLOCKRADER_MASTER_WALLET_UUID,  
        ESCROW_DESTINATION_ADDRESS,
    BLOCKRADER_CNGN_ASSET_ID,  
    };
