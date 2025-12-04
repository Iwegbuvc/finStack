const P2PTrade = require('../models/p2pModel');
const { buildLog } = require('./tradeLogger');
const { updateStatus } = require('./tradeStatusHelper');

/**
 * updateTradeStatusAndLogSafe
 * - updates status first (with optional expectedStatus & session)
 * - then pushes a normalized log entry
 * - returns the trade document after pushing the log (lean)
 */
async function updateTradeStatusAndLogSafe(tradeId, newStatus, logData = {}, expectedStatus = null, session = null) {
  // 1) Attempt to update status
  const statusUpdated = await updateStatus(tradeId, newStatus, expectedStatus, session);
  if (!statusUpdated) {
    // give a clear error (expectedStatus mismatch or not found)
    if (expectedStatus) {
      throw new Error(`Trade ${tradeId} is not in expected status (${expectedStatus}).`);
    }
    throw new Error(`Trade ${tradeId} not found or status update failed.`);
  }

  // 2) Build normalized log entry
  const logEntry = buildLog(logData);

  // 3) Push the log entry (return the trade after pushing)
  const options = { new: true, lean: true };
  if (session) options.session = session;

  const tradeWithLog = await P2PTrade.findByIdAndUpdate(
    tradeId,
    { $push: { logs: logEntry } },
    options
  );

  // If pushing the log somehow fails (shouldn't if buildLog is sane), raise.
  if (!tradeWithLog) {
    throw new Error(`Failed to push log for trade ${tradeId} after successful status update.`);
  }

  return tradeWithLog;
}

module.exports = { updateTradeStatusAndLogSafe };
