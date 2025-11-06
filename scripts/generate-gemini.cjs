const https = require('https');
const { URL } = require('url');

const modelEnv = process.env.GEMINI_MODEL || 'models/gemini-2.5-pro';
const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) {
  console.error('No GEMINI_API_KEY in environment');
  process.exit(2);
}

const urlStr = `https://generativelanguage.googleapis.com/v1/${modelEnv}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`;

function postUrl(urlStr, body, timeout = 20000) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(urlStr);
      const opts = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body, 'utf8')
        },
        timeout
      };

      const req = https.request(opts, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', (e) => reject(e));
      req.on('timeout', () => { req.destroy(new Error('timeout')); });
      req.write(body);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

(async () => {
  const bodyObj = {
    contents: [
      { role: 'user', parts: [{ text: 'Respond briefly. First line: HELLO. Second line: a JSON object exactly like {"test": true, "echo": "hello"} with no extra commentary.' }] }
    ]
  };
  const body = JSON.stringify(bodyObj);
  console.log('POST', urlStr);
  try {
    const resp = await postUrl(urlStr, body, 20000);
    console.log('Status:', resp.status);
    try {
      const parsed = JSON.parse(resp.data || '{}');
      console.log('Response keys:', Object.keys(parsed));
      console.log('Full response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Non-JSON response preview:', String(resp.data).slice(0, 2000));
    }
  } catch (err) {
    console.error('Request error:', err && err.message ? err.message : String(err));
    process.exit(2);
  }
})();
