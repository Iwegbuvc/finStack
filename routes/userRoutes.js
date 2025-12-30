const express = require("express");
const router = express.Router();
const addUserBank = require("../controllers/userController");
const { verifyToken } = require("../middlewares/validateToken");

// Route to add a bank account
router.post("/bank-account", verifyToken, addUserBank);

module.exports = router;