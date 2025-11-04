/* LABELED_BY_TOOL
 * File: backend/src/chat.ts
 * Inferred role: Backend project file (server)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

import express, { Request, Response, NextFunction, Router } from 'express';
import { generate } from './mlClient';
import { Source } from './types';

const router: Router = express.Router();

router.post('/api/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId, question } = req.body || {};
    if (!jobId || !question) return res.status(400).json({ error: 'Missing jobId or question' });

    try {
      const resp = await generate(jobId, question, 5);
      return res.json(resp);
    } catch (err: any) {
      console.error('mlClient.generate error:', err && err.message ? err.message : err);
      return res.status(502).json({ error: 'Failed to generate answer from ML service', details: err && err.message ? err.message : String(err) });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
