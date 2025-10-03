const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
firstName: {type: String, required: true, trim: true},
lastName: {type: String, required: true, trim: true},
email:{type: String, required: true, unique: true, trim: true},
password: {type: String, required: true},
role:{type: String, enum: ['user', 'merchant', 'admin'], default: "user"},
howYouHeardAboutUs:{type: String, required: true},
phoneNumber:{type: String, default: null},
refreshToken:{type: [String], default: []},
verificationCode:{type: String},
resetPasswordToken:{type: String},
isVerified:{type: Boolean, default: false}

}, {timestamps: true});

const User = new mongoose.model('User', userSchema);

module.exports = User;

// const mongoose = require("mongoose");

// const userSchema = new mongoose.Schema(
//   {
//     firstName: { type: String, required: true, trim: true },
//     lastName: { type: String, required: true, trim: true },
//     email: { type: String, required: true, unique: true, trim: true },
//     password: { type: String, required: true },

//     role: { type: String, enum: ["user", "merchant", "admin"], default: "user" },

//     howYouHeardAboutUs: { type: String, required: true },
//     phoneNumber: { type: String, default: null },

//     refreshToken: { type: [String], default: [] },

//     // ✅ OTP system
//     otp: { type: String, default: null }, // 6-digit OTP
//     otpExpires: { type: Date, default: null }, // expiration time for OTP

//     isVerified: { type: Boolean, default: false }, // account verification
//   },
//   { timestamps: true }
// );

// const User = mongoose.model("User", userSchema);

// module.exports = User;
