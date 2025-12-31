const express = require("express");
const router = express.Router();
const {addUserBank, getMe, updateMe} = require("../controllers/userController");
const { verifyToken } = require("../middlewares/validateToken");

// The "Get Me" endpoint
router.get("/me", verifyToken, getMe);
// Route to update user profile information
router.patch("/update-me", verifyToken, updateMe);
// Route to add a bank account
router.post("/bank-account", verifyToken, addUserBank);

module.exports = router;