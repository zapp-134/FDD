#!/usr/bin/env node
import Fastify from 'fastify';
import fs from 'fs';
import path from 'path';

const fastify = Fastify({ logger: true });

const dataPath = path.join(process.cwd(), 'dev', 'mock-server', 'sampleResponses.json');
function loadData() {
  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}

fastify.get('/api/kpis', async (req, reply) => {
  const data = loadData();
  return data.kpis;
});

fastify.get('/api/financials', async (req, reply) => {
  const data = loadData();
  return data.financials;
});

fastify.post('/api/ingest', async (req, reply) => {
  // pretend to accept upload and return ingestId
  return { ingestId: 'mock_ingest_1' };
});

fastify.get('/api/ingest/:id/status', async (req, reply) => {
  const data = loadData();
  const status = data.ingestionHistory.find((h) => h.runId === req.params.id);
  if (status) return status;
  return { runId: req.params.id, status: 'processing' };
});

fastify.post('/api/reports/generate', async (req, reply) => {
  // return a report id that can be polled
  return { reportId: 'mock_report_1' };
});

fastify.get('/api/reports/:id', async (req, reply) => {
  const data = loadData();
  return data.reports;
});

fastify.post('/api/assistant/query', async (req, reply) => {
  const data = loadData();
  return { reply: data.assistant.reply };
});

const start = async () => {
  try {
    await fastify.listen({ port: 5173, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
