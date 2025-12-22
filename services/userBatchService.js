const User = require('../models/userModel');

const BATCH_SIZE = 200;

const getUserBatch = async (page) => {
  return User.find({})
    .select('email firstName')
    .skip(page * BATCH_SIZE)
    .limit(BATCH_SIZE)
    .lean();
};

module.exports = {
  BATCH_SIZE,
  getUserBatch,
};
