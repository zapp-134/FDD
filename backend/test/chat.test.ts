/* LABELED_BY_TOOL
 * File: backend/test/chat.test.ts
 * Inferred role: Backend project file (server)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

import request from 'supertest';
import app from '../src/ingest';

// mock mlClient
jest.mock('../src/mlClient', () => ({
  generate: jest.fn(async (jobId: string, question: string, topK: number) => ({
    answer: 'This is a mocked answer.',
    sources: [
      { chunkId: 'ck-1', jobId, fileName: 'sample.pdf', score: 0.9, snippet: 'sample text' }
    ]
  }))
}));

describe('POST /api/chat', () => {
  it('returns answer and sources', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ jobId: 'test-job', question: 'What is revenue?' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('answer');
    expect(res.body).toHaveProperty('sources');
    expect(Array.isArray(res.body.sources)).toBe(true);
  });
});
