// models/kycAuditLog.js
const mongoose = require("mongoose");

const kycAuditLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  kyc_id: { type: mongoose.Schema.Types.ObjectId, ref: "Kyc", default: null },
  type: { type: String, required: true }, // e.g., "LIVELINESS_CHECK", "BVN_CHECK"
  status: { type: String, required: true }, // e.g., "VERIFIED", "FAILED"
  provider: { type: String, default: "PREMBLY" },
  provider_reference: { type: String, default: null },
  confidence: { type: Number, default: null },
  raw_response: { type: Object, default: null }, // be careful with size
  ip: String,
  userAgent: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("KycAuditLog", kycAuditLogSchema);
