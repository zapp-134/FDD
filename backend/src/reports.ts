import { Router, Request, Response } from 'express';

const router = Router();

// POST /api/reports/generate -> returns mock reportId
router.post('/generate', (req: Request, res: Response) => {
  // In a real app you'd validate input and enqueue a job
  const reportId = `rpt_${Math.random().toString(36).slice(2, 10)}`;
  res.status(201).json({ reportId, status: 'queued' });
});

// GET /api/reports/:id/download -> returns dummy file
router.get('/:id/download', (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  // For demo return a small text file attachment
  const content = `Report ${id}\nGenerated for demo.`;
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${id}.txt"`);
  res.send(content);
});

export default router;
