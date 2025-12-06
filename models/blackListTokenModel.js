const mongoose = require("mongoose");

const blacklistedTokenSchema = new mongoose.Schema({
  // The JWT itself (stored as a string)
  token: { 
    type: String, 
    required: true,
    index: true // Index for fast lookup in the middleware
  },
  
  // The token's original expiration date/time
  expiresAt: { 
    type: Date, 
    required: true,
    // 🔥 CRITICAL: The TTL Index. 
    // This tells MongoDB to automatically delete the document 0 seconds 
    // after the date/time specified in expiresAt.
    expires: 0 
  },
}, { timestamps: true }); // Optional: timestamps for debugging

module.exports = mongoose.model("BlacklistedToken", blacklistedTokenSchema);