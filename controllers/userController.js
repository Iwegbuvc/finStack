const UserBankAccount = require("../models/userBankAccountModel");

const addUserBank = async (req, res) => {
  try {
    const { bankName, accountNumber, accountName, bankCode } = req.body;
    const userId = req.user.id;

    // 1. Set all existing accounts for this user to isPrimary: false
    await UserBankAccount.updateMany(
      { userId },
      { isPrimary: false }
    );

    // 2. Create the new account as the Primary one
    const newBank = await UserBankAccount.create({
      userId,
      bankName,
      accountNumber,
      accountName,
      bankCode,
      isPrimary: true
    });

    res.status(201).json({
      success: true,
      message: "Bank account added and set as primary.",
      data: newBank
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = addUserBank;