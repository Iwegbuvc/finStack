// controllers/transferController.js
const { logTransaction } = require("../utilities/logTransaction");


// 🧩 Mock provider transfer (for test only)
async function fakeProviderTransfer(amount, recipientAccount) {
  console.log(`💡 Mock transfer ₦${amount} → ${recipientAccount}`);

  const isSuccess = Math.random() > 0.2; // 80% chance success
  return {
    success: isSuccess,
    message: isSuccess ? "Mock transfer successful" : "Mock transfer failed",
    transactionId: `${isSuccess ? "MOCK" : "FAIL"}-${Date.now()}`,
    timestamp: new Date(),
  };
}

// 🧩 MOCK deposit (simulate incoming bank payment)
async function fakeDeposit(amount, sourceAccount) {
  console.log(`💡 Mock deposit ₦${amount} from ${sourceAccount}`);

  const isSuccess = Math.random() > 0.1; // 90% chance success
  return {
    success: isSuccess,
    message: isSuccess ? "Mock deposit credited" : "Mock deposit failed",
    transactionId: `${isSuccess ? "DEP" : "DEPFAIL"}-${Date.now()}`,
    timestamp: new Date(),
  };
}

// 🟢 TRANSFER IN → from bank to platform
const transferIn = async (req, res) => {
  try {
    const { sourceAccount, amount } = req.body;
    const userId = req.user.id;
    const walletId = req.user.walletId; // Replace with actual user's wallet ID
    const reference = `DEP-${Date.now()}`;

    const providerResponse = await fakeDeposit(amount, sourceAccount);

    await logTransaction({
      userId,
      walletId,
      type: "TRANSFER_IN",
      amount,
      status: providerResponse.success ? "COMPLETED" : "FAILED",
      reference,
      provider: "9PSB",
      metadata: providerResponse,
    });

    return res.status(200).json({
      success: providerResponse.success,
      message: providerResponse.message,
      reference,
    });
  } catch (error) {
    console.error("Transfer In error:", error.message);
    return res.status(500).json({ success: false, message: "Deposit failed" });
  }
};

// 🔴 TRANSFER OUT → from platform to external account
const transferFunds = async (req, res) => {
  try {
    const { recipientAccount, amount } = req.body;
    const userId = req.user.id;
    const walletId = req.user.walletId;
    const reference = `TRF-${Date.now()}`;

    const providerResponse = await fakeProviderTransfer(amount, recipientAccount);

    await logTransaction({
      userId,
      walletId,
      type: "TRANSFER_OUT",
      amount,
      status: providerResponse.success ? "COMPLETED" : "FAILED",
      reference,
      provider: "9PSB",
      metadata: providerResponse,
    });

    return res.status(200).json({
      success: providerResponse.success,
      message: providerResponse.message,
      reference,
    });
  } catch (error) {
    console.error("Transfer error:", error.message);
    return res.status(500).json({ success: false, message: "Transfer failed" });
  }
};

module.exports = { transferFunds, transferIn };