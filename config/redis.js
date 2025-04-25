const IORedis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

const redis = new IORedis(process.env.REDIS_URL + '?family=0'); // Ex: redis://localhost:6379

module.exports = redis;
