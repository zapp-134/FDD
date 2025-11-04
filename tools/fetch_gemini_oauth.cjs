const fs = require('fs');
const path = require('path');
const {GoogleAuth} = require('google-auth-library');
const fetch = require('node-fetch');

async function main(){
  const keyPath = path.join(__dirname, '..', 'keys', 'sa-key.json');
  if(!fs.existsSync(keyPath)){
    console.error('Service account key not found at', keyPath);
    process.exit(2);
  }

  const auth = new GoogleAuth({
    keyFilename: keyPath,
    // Request both generative-language and cloud-platform scopes to ensure coverage for all methods
    scopes: [
      'https://www.googleapis.com/auth/generative-language',
      'https://www.googleapis.com/auth/cloud-platform'
    ]
  });

  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  const accessToken = (typeof tokenRes === 'string') ? tokenRes : (tokenRes && tokenRes.token) ? tokenRes.token : null;

  if(!accessToken){
    console.error('Failed to obtain access token');
    process.exit(3);
  }

  console.log('Got access token length', accessToken.length);

  const outDir = path.join(__dirname, '..', 'backend', 'reports');
  if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, {recursive:true});

  async function saveFetch(name, url, opts){
    console.log('Requesting', url);
    let r;
    try{
      r = await fetch(url, opts);
    }catch(err){
      const out = {error: err.message};
      fs.writeFileSync(path.join(outDir, name), JSON.stringify(out, null, 2));
      return out;
    }
    const headers = {};
    r.headers.forEach((v,k)=> headers[k]=v);
    const bodyText = await r.text();
    const out = {status: r.status, statusText: r.statusText, headers, body: bodyText};
    fs.writeFileSync(path.join(outDir, name), JSON.stringify(out, null, 2));
    return out;
  }

  const modelsUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  await saveFetch('gemini_models_oauth_ping.json', modelsUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  const genUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';
  // Try a few different payload shapes to account for v1/v1beta differences
  const tries = [
    { name: 'gemini_generate_oauth_try_input.json', url: genUrl, body: { input: { content: 'Hello from FDD OAuth test' } } },
    { name: 'gemini_generate_oauth_try_prompt.json', url: genUrl, body: { prompt: { text: 'Hello from FDD OAuth test' } } },
    // Try the v1-style generateText endpoint with a simple text field
    { name: 'gemini_generate_oauth_try_generateText.json', url: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateText', body: { text: 'Hello from FDD OAuth test' } }
    ,{ name: 'gemini_generate_oauth_try_generateText_prompt.json', url: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateText', body: { prompt: { text: 'Hello from FDD OAuth test' } } }
  ];

  for(const t of tries){
    await saveFetch(t.name, t.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(t.body)
    });
  }

  console.log('Saved responses to backend/reports');
}

main().catch(err=>{ console.error(err); process.exit(1); });
