import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import reportsRouter from './reports';

// Simple runtime env shim for VITE_USE_REMOTE_API-like toggles
const USE_REMOTE_API = String(process.env.VITE_USE_REMOTE_API ?? 'false') === 'true';

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api/reports', reportsRouter);

// health endpoint for liveness/readiness checks
app.get('/health', (_req, res) => {
	res.status(200).json({ status: 'ok' });
});

export default app;

