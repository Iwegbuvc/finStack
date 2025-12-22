require('dotenv').config();
const mongoose = require('mongoose');
const { Worker } = require('bullmq');
const Redis = require('ioredis');

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => console.log('🟢 Worker MongoDB connected'))
  .catch(console.error);


const { getUserBatch } = require('../services/userBatchService');
const sendMail = require('../utilities/sendMail');
const { generateAnnouncementMail } = require('../utilities/mailGenerator');
const AnnouncementLog = require('../models/announcementLogModel');

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

new Worker(
  'announcementQueue',
  async (job) => {
    const { announcementId, title, body } = job.data;
    let page = 0;

    while (true) {
      const users = await getUserBatch(page);
      if (users.length === 0) break;

      for (const user of users) {
        try {
           console.log(`📨 Sending announcement to ${user.email}`);
          const html = generateAnnouncementMail(
            title,
            body,
            user.firstName
          );

          await sendMail(user.email, title, html);

          await AnnouncementLog.create({
            announcementId,
            email: user.email,
            status: 'sent',
          });
        } catch (err) {
           console.error(`❌ Failed to send to ${user.email}:`, err.message);
          await AnnouncementLog.create({
            announcementId,
            email: user.email,
            status: 'failed',
            error: err.message,
          });
        }
      }

      page++;
    }

    return { success: true };
  },
  { connection }
);
console.log('WORKER Redis:', process.env.REDIS_URL);
console.log('📢 Announcement worker running...');

