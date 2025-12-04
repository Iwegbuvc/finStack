// utils/tradeStatusHelper.js
const P2PTrade = require('../models/p2pModel');

/**
 * updateStatus - atomically change the trade status (optionally only if expectedStatus matches)
 * Returns the updated trade document (lean)
 */
async function updateStatus(tradeId, newStatus, expectedStatus = null, session = null) {
  const query = { _id: tradeId };
  if (expectedStatus) query.status = expectedStatus;

  const options = { new: true, lean: true };
  if (session) options.session = session;

  const updated = await P2PTrade.findOneAndUpdate(
    query,
    { $set: { status: newStatus } },
    options
  );

  return updated;
}

module.exports = { updateStatus };
