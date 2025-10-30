const axios = require("axios");
const logger = require("../utilities/logger");

const { NODE_ENV, PROVIDER_BASE_URL, PROVIDER_API_KEY } = process.env;

/**
 * Executes a withdrawal, handling mock mode for development and live API calls for production.
 * * @param {string} accountNumber - The source account/wallet ID.
 * @param {string} destination - The destination bank account or crypto address.
 * @param {number} amount - The amount to withdraw.
 * @param {string} [narration="Wallet withdrawal"] - The transaction description.
 * @returns {Promise<Object>} Object containing success status, reference, and provider data.
 */
const withdrawFundsService = async (
  accountNumber,
  destination,
  amount,
  narration = "Wallet withdrawal"
) => {
  try {
    if (!accountNumber || !destination || !amount) {
      throw new Error("Account number, destination, and amount are required");
    }

    // ✅ MOCK MODE (for testing/dev)
    if (NODE_ENV !== "production") {
      logger.info(`💡 Mock withdrawal ₦${amount} from ${accountNumber} → ${destination}`);

      return {
        success: true,
        message: "Mock withdrawal successful",
        walletId: accountNumber,
        reference: `MOCK-WDR-${Date.now()}`,
        amount,
        destination,
        provider: "MockProvider",
      };
    }

    // ✅ LIVE MODE
    const response = await axios.post(
      `${PROVIDER_BASE_URL}/withdraw`,
      {
        fromAccount: accountNumber,
        toAccount: destination,
        amount,
        narration,
      },
      {
        headers: {
          Authorization: `Bearer ${PROVIDER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;

    if (!data || data.status !== "success") {
      throw new Error(data?.message || "Withdrawal failed at provider");
    }

    logger.info(`✅ Withdrawal successful ₦${amount} → ${destination}`);

    return {
      success: true,
      message: data.message || "Withdrawal successful",
      walletId: data.walletId || accountNumber,
      reference: data.reference || `WDR-${Date.now()}`,
      amount,
      provider: "blockrader",
    };
  } catch (error) {
    logger.error(`❌ Withdrawal Service Error: ${error.message}`);

    // ✅ Fix: Prevent undefined 'data' access
    const providerMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error.message ||
      "Unknown error from withdrawal service";

    // Throw a generic error for the controller to catch
    throw new Error(providerMessage); 
  }
};

module.exports = withdrawFundsService; // 💡 UNCOMMENTED AND EXPORTED
