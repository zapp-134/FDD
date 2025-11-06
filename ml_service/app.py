from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import uuid
from typing import List, Dict
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np
import pickle

ROOT = os.path.dirname(__file__)
INDEX_DIR = os.path.join(ROOT, 'index')
if not os.path.exists(INDEX_DIR):
    os.makedirs(INDEX_DIR)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory simple index
vectorizer: TfidfVectorizer = None
documents: List[str] = []
meta: List[Dict] = []
X = None

class ProcessFileRequest(BaseModel):
    jobId: str
    file_path: str
    file_name: str

class GenerateRequest(BaseModel):
    jobId: str
    question: str
    topK: int = 5

@app.post('/process-file')
async def process_file(req: ProcessFileRequest):
    # read file
    fp = req.file_path
    if not os.path.exists(fp):
        raise HTTPException(status_code=404, detail='file not found')
    try:
        with open(fp, 'r', encoding='utf-8', errors='ignore') as f:
            text = f.read()
    except Exception:
        text = ''
    # If CSV-like, parse numeric columns and append a short numeric summary as an extra document
    summary_text = ''
    try:
        lower = req.file_name.lower()
        if lower.endswith('.csv') or lower.endswith('.tsv'):
            import io, csv
            reader = csv.reader(io.StringIO(text))
            rows = []
            header = None
            for i, r in enumerate(reader):
                if i == 0:
                    header = r
                else:
                    rows.append(r)
                if i >= 50:
                    break
            # identify numeric columns
            numeric_idx = []
            col_sums = {}
            col_counts = {}
            if header:
                for ci in range(len(header)):
                    col_sums[ci] = 0.0
                    col_counts[ci] = 0
                for r in rows:
                    for ci, v in enumerate(r):
                        try:
                            val = float(v.replace('$','').replace(',',''))
                            col_sums[ci] += val
                            col_counts[ci] += 1
                        except Exception:
                            continue
                numeric_cols = []
                for ci in range(len(header)):
                    if col_counts.get(ci,0) > 0:
                        avg = col_sums[ci] / col_counts[ci]
                        numeric_cols.append((header[ci] if ci < len(header) else f'col{ci}', col_sums[ci], col_counts[ci], avg))
                if numeric_cols:
                    parts = [f"CSV numeric summary for {req.file_name}:"]
                    for name, s, c, a in numeric_cols:
                        parts.append(f"{name}=sum:{s:.2f}@count:{c}@avg:{a:.2f}")
                    summary_text = '\n'.join(parts)
    except Exception:
        # best-effort: ignore parsing errors
        summary_text = ''
    # naive chunking: split by 1000 chars
    chunks = [text[i:i+1000] for i in range(0, len(text), 1000)] if text else []
    for i, c in enumerate(chunks):
        documents.append(c)
        meta.append({'chunkId': str(uuid.uuid4()), 'jobId': req.jobId, 'fileName': req.file_name})
    if summary_text:
        # add the summary as an extra mini-document so the generator can use it
        documents.append(summary_text)
        meta.append({'chunkId': str(uuid.uuid4()), 'jobId': req.jobId, 'fileName': req.file_name + '::summary'})
    # (re)fit vectorizer
    global vectorizer, X
    if documents:
        vectorizer = TfidfVectorizer(stop_words='english', max_features=2000)
        X = vectorizer.fit_transform(documents)
        # persist
        with open(os.path.join(INDEX_DIR, 'vectorizer.pkl'), 'wb') as vf:
            pickle.dump(vectorizer, vf)
        with open(os.path.join(INDEX_DIR, 'meta.pkl'), 'wb') as mf:
            pickle.dump(meta, mf)
        with open(os.path.join(INDEX_DIR, 'docs.pkl'), 'wb') as df:
            pickle.dump(documents, df)
    return {'jobId': req.jobId, 'numChunks': len(chunks), 'indexed': True}


@app.get('/health')
async def health():
    return {'status': 'ok', 'now': __import__('datetime').datetime.utcnow().isoformat() + 'Z'}

@app.get('/search')
async def search(q: str, k: int = 5):
    if X is None or vectorizer is None:
        return {'hits': []}
    vec = vectorizer.transform([q])
    sims = (X @ vec.T).toarray().squeeze()
    idxs = np.argsort(-sims)[:k]
    hits = []
    for i in idxs:
        if sims[i] <= 0: continue
        hits.append({'chunkId': meta[i]['chunkId'], 'jobId': meta[i]['jobId'], 'fileName': meta[i]['fileName'], 'score': float(sims[i]), 'snippet': documents[i][:200]})
    return {'hits': hits}

@app.post('/generate')
async def generate(req: GenerateRequest):
    # retrieve top-k
    if X is None or vectorizer is None:
        return {'answer': 'No documents indexed yet.', 'sources': []}
    vec = vectorizer.transform([req.question])
    sims = (X @ vec.T).toarray().squeeze()
    idxs = np.argsort(-sims)[:req.topK]
    sources = []
    assembled = []
    for i in idxs:
        if sims[i] <= 0: continue
        sources.append({'chunkId': meta[i]['chunkId'], 'jobId': meta[i]['jobId'], 'fileName': meta[i]['fileName'], 'score': float(sims[i]), 'snippet': documents[i][:400]})
        # If the source looks like a CSV or a transactions file, include a larger slice to surface numeric rows
        fn = meta[i].get('fileName','') if isinstance(meta[i], dict) else ''
        if fn.lower().endswith('.csv') or 'transaction' in fn.lower() or 'invoice' in fn.lower() or 'receipt' in fn.lower():
            assembled.append(documents[i][:2000])
        else:
            assembled.append(documents[i][:2000])
    # Assemble a longer context to help the external LLM (Gemini) reason across documents.
    answer = ' '.join([s.strip() for s in assembled])
    if not answer:
        answer = "I couldn't find relevant information in the indexed documents."
    else:
        # cap to a few thousand chars to avoid extremely large payloads
        answer = answer[:4000]
    return {'answer': answer, 'sources': sources}
