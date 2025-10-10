import request from 'supertest';
import app from './index';

describe('Reports API', () => {
  it('POST /api/reports/generate returns reportId', async () => {
    const res = await request(app).post('/api/reports/generate').send({});
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('reportId');
    expect(res.body.status).toBe('queued');
  });

  it('GET /api/reports/:id/download returns a file', async () => {
    const res = await request(app).get('/api/reports/test123/download');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.text).toContain('Report test123');
  });
});
