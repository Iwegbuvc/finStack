// utils/tradeLogger.js
const mongoose = require('mongoose');

/**
 * Build a schema-compliant log entry for P2PTrade.logs[]
 */
function buildLog({ message, actor, role, ip }) {
  return {
    message: String(message ?? '').trim(),
    // ✅ FIX: Use 'new' when invoking the ObjectId constructor.
    actor: mongoose.isValidObjectId(actor) ? new mongoose.Types.ObjectId(actor) : null,
    role: role || 'system',
    ip: ip != null ? String(ip) : null,
    time: new Date()
  };
}

module.exports = { buildLog };