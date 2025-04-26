const { Queue } = require('bullmq');
const redis = require('../config/redis');
require('dotenv').config();

function createQueue(identifier) {
  const queueName = `messages:${identifier}`;
  return new Queue(queueName, { connection: redis.connection() });
}

module.exports = { createQueue };