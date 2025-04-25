const { Queue } = require('bullmq');
const redis = require('../config/redis');

const queue = new Queue('messages', {
  connection: redis,
});

module.exports = queue;