const { Worker, QueueEvents } = require('bullmq');
const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis(process.env.REDIS_URL + '?family=0');

async function listenToAllQueues() {
  const keys = await redis.keys('bull:messages:*:id');

  const uniqueQueueNames = new Set(keys.map(key => {
    const match = key.match(/^bull:(messages:[^:]+):/);
    return match ? match[1] : null;
  }).filter(Boolean));

  for (const queueName of uniqueQueueNames) {
    console.log(`🎧 Escutando fila: ${queueName}`);

    new Worker(queueName, async job => {
      console.log(`📩 Mensagem processada na fila ${queueName}:`, job.data);
      // Aqui vai sua lógica real
    }, {
      connection: redis,
    });

    const queueEvents = new QueueEvents(queueName, { connection: redis });

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.error(`❌ Job ${jobId} falhou na fila ${queueName}:`, failedReason);
    });
  }
}

listenToAllQueues();
