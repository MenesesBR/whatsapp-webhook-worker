const IORedis = require('ioredis');
require('dotenv');

function connection() {
  return new IORedis(process.env.REDIS_URL, {
    family: 0,
    maxRetriesPerRequest: null,
  });
}


module.exports = { connection };