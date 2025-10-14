const express = require("express")
const router = express.Router()
const authController = require("../controllers/authController")
const { verifyToken, isAdmin } = require("../middlewares/validateToken");
const {validateNewUser, validateLogin, validatePassword} = require("../middlewares/validation")


router.post("/register",validateNewUser, authController.registerUser)
router.get("/verify/:verificationCode", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerificationCode)
router.post("/login", validateLogin, authController.loginUser)
router.post("/forgot-password", authController.forgotPassword)
router.post("/reset-password", validatePassword, authController.resetPassword)
router.put("/update-user-role", verifyToken, isAdmin, authController.updateUserRole);
router.get("/admin/users", verifyToken, isAdmin, authController.getAllUsers);






module.exports = router