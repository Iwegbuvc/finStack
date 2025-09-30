const express = require("express")
const router = express.Router()
const authController = require("../controllers/authController")
const {validateNewUser, validateLogin, validatePassword} = require("../middlewares/validation")


router.post("/register",validateNewUser, authController.registerUser)
router.get("/verify/:verificationCode", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerificationCode)
router.post("/login", validateLogin, authController.loginUser)
router.post("/forgot-password", authController.forgotPassword)
router.post("/reset-password", validatePassword, authController.resetPassword)





module.exports = router