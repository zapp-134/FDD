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
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });

  const client = await auth.getClient();
  // client.getAccessToken may return string or object {token}
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
  const body = { input: { content: 'Hello from FDD OAuth test' } };
  await saveFetch('gemini_generate_oauth_ping.json', genUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  console.log('Saved responses to backend/reports');
}

main().catch(err=>{ console.error(err); process.exit(1); });

