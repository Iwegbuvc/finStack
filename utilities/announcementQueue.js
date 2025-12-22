require('dotenv').config();
const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const announcementQueue = new Queue('announcementQueue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
console.log('QUEUE Redis:', process.env.REDIS_URL);


module.exports = announcementQueue;
