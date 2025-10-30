// utilities/encryptionUtils.js
const crypto = require("crypto");
const assert = require("assert");
require("dotenv").config();

// ✅ 1. Read from .env
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// ✅ 2. Check key format
// 32 bytes = 64 hex characters
assert(
  ENCRYPTION_KEY && ENCRYPTION_KEY.length === 64,
  "❌ ENCRYPTION_KEY must exist and be a 64-character hex string (use crypto.randomBytes(32).toString('hex'))"
);

// ✅ 3. Convert from hex → Buffer (for crypto)
const keyBuffer = Buffer.from(ENCRYPTION_KEY, "hex");

// ✅ AES settings
const algorithm = "aes-256-cbc";
const IV_LENGTH = 16;

// 🔒 Encrypt text
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  return iv.toString("base64") + ":" + encrypted;
}

// 🔓 Decrypt text
function decrypt(encryptedText) {
  const [ivBase64, encryptedBase64] = encryptedText.split(":");
  const iv = Buffer.from(ivBase64, "base64");
  const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
  let decrypted = decipher.update(encryptedBase64, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = { encrypt, decrypt };
