require('dotenv').config();
const { Worker } = require('bullmq');
const redis = require('../config/redis');

const worker = new Worker('messages', async (job) => {
  console.log('Processando mensagem:', job.data);
  // Aqui você pode colocar lógica para salvar no banco, responder, etc
}, {
  connection: redis,
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completado.`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} falhou:`, err);
});