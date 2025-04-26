const { Worker, QueueEvents, Queue } = require('bullmq');
const redis = require('../config/redis');
const blipSdkApi = require('./callBlipSkdApi');
require('dotenv').config();

const redisConnection = redis.connection()

// 👉 Guarda os workers já criados
const workersMap = new Map(); // queueName => Worker
const lastActivityMap = new Map(); // queueName => timestamp (Date.now())

const INACTIVITY_LIMIT_MS = 1800000; // 30 minutos 1800000

async function listenToAllQueues() {
    while (true) {
        const keys = await redisConnection.keys('bull:messages:*:id');
        await new Promise(resolve => setTimeout(resolve, 50)); // Espera 0.1 segundo antes de verificar novamente
        await queueHandler(keys);
    }
}

async function queueHandler(keys) {
    const uniqueQueueNames = new Set(keys.map(key => {
        const match = key.match(/^bull:(messages:[^.]+(?:\.[^:]+)*):/);
        return match ? match[1] : null;
    }).filter(Boolean));

    for (const queueName of uniqueQueueNames) {
        if (workersMap.has(queueName)) {
            continue; // Já tem worker, pula
        }
        console.log(`🎧 Escutando fila: ${queueName}`);
        createWorker(queueName);
    }
}

async function createWorker(queueName) {
    const worker = new Worker(queueName, async job => {
        console.log(`📩 Mensagem processada na fila ${queueName}:`, job.data);
        // Atualiza o tempo da última atividade
        lastActivityMap.set(queueName, Date.now());

        await blipSdkApi.callBlipSdkMessagesApi(job.data)

    }, {
        connection: redis.connection(),
    });

    const queueEvents = new QueueEvents(queueName, { connection: redis.connection() });

    queueEvents.on('failed', ({ jobId, failedReason }) => {
        console.error(`❌ Job ${jobId} falhou na fila ${queueName}:`, failedReason);
    });

    workersMap.set(queueName, worker);
    lastActivityMap.set(queueName, Date.now());
}

// 🧹 Verifica filas inativas e remove
async function cleanupInactiveQueues() {
    setInterval(async () => {
        const now = Date.now();

        for (const [queueName, lastActive] of lastActivityMap.entries()) {
            if (now - lastActive > INACTIVITY_LIMIT_MS) {
                console.log(`🧹 Fila ${queueName} inativa há mais de 30min. Deletando.`);

                const worker = workersMap.get(queueName);

                const queue = new Queue(queueName, { connection: redis.connection() });
                await queue.drain(); // Limpa jobs pendentes
                await queue.obliterate({ force: true }); // Remove completamente a fila

                lastActivityMap.delete(queueName); // Remove a fila do mapa de atividades

                if (worker) {
                    await worker.close(); // Fecha o worker corretamente
                    workersMap.delete(queueName);
                }

                console.log(`🗑️ Fila ${queueName} apagada do Redis.`);
            }
        }
    }, 1800000); // Roda a cada 30 minutos
}

listenToAllQueues();
cleanupInactiveQueues();
