const logger = require("../utilities/logger");
// 1. Import the necessary functions from your blockradar.js file
const { withdrawFromBlockrader, getUserAddressId } = require("./providers/blockrader"); 

// Note: You may need a better way to get the network if it's not consistent
// For Paycrest, we will assume a constant or pass it in.
const CRYPTO_NETWORK = process.env.PAYCREST_CRYPTO_NETWORK || "Base"; 

/**
 * Initiates the actual on-chain crypto transfer to the Paycrest receive address 
 * by calling the Blockrader withdrawal function.
 * * @param {string} userId - The ID of the user (to find their source wallet).
 * @param {string} token - The cryptocurrency token (e.g., "USDC").
 * @param {string} receiveAddress - The unique Paycrest destination address for the order (0x...).
 * @param {number} amount - The exact crypto amount to send (gross amount, no fees).
 * @param {string} reference - Your internal transaction reference/idempotency key.
 * @returns {Promise<Object>} Object containing provider reference and transaction hash.
 */
const initiateCryptoTransfer = async ({ userId, token, receiveAddress, amount, reference }) => {
    
    // --- 1. Get the Blockrader Address ID for the source user's wallet ---
    let userAddressInfo;
    try {
        // We use the internal wallet record to find the Blockrader Address UUID (externalWalletId)
        userAddressInfo = await getUserAddressId(userId, token); // Ensure getUserAddressId accepts currency
    } catch (error) {
        logger.error(`Failed to get Blockrader Address ID for user ${userId}: ${error.message}`);
        throw new Error("Could not locate the user's crypto source wallet for transfer.");
    }

    const sourceAddressId = userAddressInfo.addressId;
    const toCryptoAddress = receiveAddress; // Paycrest's destination address
    const idempotencyKey = reference; // Use the transaction reference as the idempotency key

    if (!sourceAddressId) {
        throw new Error("Source wallet ID is missing after lookup.");
    }
    
    try {
        logger.info(`Sending ${amount} ${token} from user ${userId}'s Blockrader Address ID ${sourceAddressId} to Paycrest address ${toCryptoAddress}`);
        
        // --- 2. Call the existing Blockrader withdrawal function ---
        const data = await withdrawFromBlockrader(
            sourceAddressId, 
            toCryptoAddress, 
            amount, 
            token, // currency is token (USDC, CNGN)
            idempotencyKey 
        );

        // 3. Return the necessary details for the controller to save
        return {
            success: true,
            providerReference: data.id || data.transferId, // Blockrader's unique ID
            transactionHash: data.txHash || data.id,        // Blockrader often returns 'id' as the tx hash/ref
        };
        
    } catch (error) {
        logger.error(`❌ initiateCryptoTransfer failed for reference ${reference}: ${error.message}`);
        // Re-throw the error for the controller to catch and return to the user
        throw new Error(`Failed to execute on-chain withdrawal: ${error.message}`);
    }
};

module.exports = { initiateCryptoTransfer };