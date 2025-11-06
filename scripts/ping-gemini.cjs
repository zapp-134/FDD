const https = require('https');
const { URL } = require('url');
const modelEnv = process.env.GEMINI_MODEL || 'models/gemini-2.5-pro';
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const urlStr = `https://generativelanguage.googleapis.com/v1/${modelEnv}` + (GEMINI_KEY ? `?key=${encodeURIComponent(GEMINI_KEY)}` : '');

function fetchUrl(urlStr, timeout = 10000) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(urlStr);
      const req = https.request(
        { hostname: urlObj.hostname, path: urlObj.pathname + urlObj.search, method: 'GET', timeout },
        (res) => {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve({ status: res.statusCode, data }));
        }
      );
      req.on('error', (e) => reject(e));
      req.on('timeout', () => { req.destroy(new Error('timeout')); });
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

(async () => {
  console.log('Pinging Gemini model metadata endpoint:', urlStr);
  try {
    const resp = await fetchUrl(urlStr, 10000);
    console.log('Status:', resp.status);
    try {
      const parsed = JSON.parse(resp.data || '{}');
      console.log('Model metadata keys:', Object.keys(parsed).slice(0, 20));
    } catch (e) {
      console.log('Response preview:', String(resp.data).slice(0, 1000));
    }
  } catch (err) {
    const e = err || {};
    const status = e.code || 'no-status';
    const dataPreview = e.message || 'no-data';
    console.error('Ping failed; code:', status);
    console.error('Error preview:', dataPreview);
    if (!GEMINI_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) console.error('No GEMINI_API_KEY or GOOGLE_APPLICATION_CREDENTIALS set in environment — this will usually return 401/403.');
    process.exit(2);
  }
})();