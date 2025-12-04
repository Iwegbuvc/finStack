const express = require("express")
const router = express.Router()
const authController = require("../controllers/authController")
const { verifyToken, isAdmin } = require("../middlewares/validateToken");
const {validateNewUser, validateLogin, validatePassword} = require("../middlewares/validation")
const { authLimiter } = require("../middlewares/rateLimiter")


router.post("/register", authLimiter, validateNewUser, authController.registerUser)
router.get("/verify/:verificationCode",  authController.verifyEmail);
router.post("/resend-verification", authLimiter, authController.resendVerificationCode)
router.post("/login", authLimiter, validateLogin, authController.loginUser)
router.post("/refresh-token", authController.handleRefreshToken)
router.post("/forgot-password", authLimiter, authController.forgotPassword)
router.post("/reset-password", authLimiter, validatePassword, authController.resetPassword)
// router.put("/update-user-role", verifyToken, isAdmin, authController.updateUserRole);
// router.get("/admin/users", verifyToken, isAdmin, authController.getAllUsers);
router.post("/logout", authController.logoutUser);






module.exports = router