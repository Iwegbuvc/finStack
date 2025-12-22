const mongoose = require('mongoose');

const announcementLogSchema = new mongoose.Schema(
  {
    announcementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Announcement',
      required: true,
    },
    email: String,
    status: {
      type: String,
      enum: ['sent', 'failed'],
    },
    error: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('AnnouncementLog', announcementLogSchema);
