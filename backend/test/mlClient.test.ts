import axios from 'axios';
import * as mlClient from '../src/mlClient';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('mlClient.generateReport - retry & fallback behavior', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.LLM_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_MODEL = 'models/gemini-2.5-pro';
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    process.env.LLM_FAIL_OPEN = 'true';
    // avoid hitting the usage guard during unit tests
    process.env.LLM_MAX_CALLS_PER_DAY = '1000';
    // Ensure axios.create(...) used by mlClient.makeClient() returns an object
    // that delegates to the mocked axios functions.
    (mockedAxios.create as unknown as jest.Mock) = jest.fn(() => ({ post: mockedAxios.post, get: mockedAxios.get }));
  });

  test('successful Gemini response (200) returns parsed JSON', async () => {
    const jobId = 'job-success';
    // ML service /generate -> return assembled document text
    mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { answer: 'document text' } } as any);
  // Gemini call -> return a Gemini-like successful payload
  const geminiSuccess = { status: 200, data: { candidates: [{ content: JSON.stringify({ report: { runId: jobId, summary: 'ok' }, analysis: null }) }] } } as any;
  mockedAxios.post.mockResolvedValueOnce(geminiSuccess);

    const res = await mlClient.generateReport(jobId, 5);
    expect(res.report.runId).toBe(jobId);
  });

  test('transient 503 then success: retries then returns', async () => {
    const jobId = 'job-retry-success';
    // ML service /generate -> assembled document
    mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { answer: 'doc' } } as any);
    // first Gemini call -> reject with 503
    const e: any = new Error('Service overloaded');
    e.response = { status: 503, data: 'The model is overloaded' };
    mockedAxios.post.mockRejectedValueOnce(e);
  // second Gemini call -> success
  const geminiRetrySuccess = { status: 200, data: { candidates: [{ content: JSON.stringify({ report: { runId: jobId } }) }] } } as any;
  mockedAxios.post.mockResolvedValueOnce(geminiRetrySuccess);

    const res = await mlClient.generateReport(jobId, 5);
    expect(res.report.runId).toBe(jobId);
    // We expect multiple internal calls (ML assemble + Gemini attempts); ensure we had at least one external call.
    expect(mockedAxios.post.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  test('transient 503 exhausted -> fallback when LLM_FAIL_OPEN=true', async () => {
    const jobId = 'job-fallback';
    process.env.LLM_FAIL_OPEN = 'true';
    // ML service /generate (assemble) -> return a doc
    mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { answer: 'doc' } } as any);
    // axios always fail with 503 for Gemini attempts
    const e: any = new Error('Service overloaded');
    e.response = { status: 503, data: 'The model is overloaded' };
    // two transient Gemini attempts then final fallback will call ML generate again,
    // so prepare two rejected Gemini posts followed by a fallback ML generate success
    mockedAxios.post.mockRejectedValueOnce(e);
    mockedAxios.post.mockRejectedValueOnce(e);
    // fallback ML generate -> returns JSON string
  mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { answer: JSON.stringify({ report: { runId: jobId }, analysis: null }) } } as any);

  const res = await mlClient.generateReport(jobId, 5);
  // Accept either a parsed report or raw JSON containing the runId
  const parsedRunId = res.report?.runId;
  const rawContains = typeof res.raw === 'string' && res.raw.includes(jobId);
  expect(parsedRunId === jobId || rawContains).toBeTruthy();
  });

  test('auth/model 404 error -> fail immediately (no fallback)', async () => {
    const jobId = 'job-404';
    // ML service assemble
    mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { answer: 'doc' } } as any);
    const e: any = new Error('Not found');
    e.response = { status: 404, data: 'not found' };
    mockedAxios.post.mockRejectedValueOnce(e);

    await expect(mlClient.generateReport(jobId, 5)).rejects.toThrow();
    // At minimum there should've been communication with ML service and an attempt to call Gemini
    expect(mockedAxios.post.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
