const mongoose = require("mongoose");
const crypto = require("crypto");

const kycAttemptSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  attemptId: { type: String, required: true, unique: true }, // random id given to frontend
  used: { type: Boolean, default: false },
  ip: { type: String, default: null },
  userAgent: { type: String, default: null },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// helper factory to create attemptId
kycAttemptSchema.statics.createAttempt = async function(userId, opts = {}) {
  const token = crypto.randomBytes(24).toString("hex");
  const ttlMs = opts.ttlMs || (5 * 60 * 1000); // default 5 minutes
  const doc = await this.create({
    user_id: userId,
    attemptId: token,
    ip: opts.ip || null,
    userAgent: opts.userAgent || null,
    expiresAt: new Date(Date.now() + ttlMs)
  });
  return doc;
};

kycAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto remove after expiry

module.exports = mongoose.model("KycAttempt", kycAttemptSchema);
