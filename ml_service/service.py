from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os, uuid, json, base64
from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer
import numpy as np
import faiss
import pickle

ROOT = os.path.dirname(__file__)
INDEX_DIR = os.path.join(ROOT, 'index')
if not os.path.exists(INDEX_DIR):
    os.makedirs(INDEX_DIR)

MODEL_NAME = os.getenv('EMBEDDING_MODEL', 'all-MiniLM-L6-v2')
GENERATOR_MODEL = os.getenv('GENERATOR_MODEL', None)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load embedding model lazily
embedder = None
index = None
metas = []

class ProcessFileRequest(BaseModel):
    jobId: str
    file_path: str = None
    file_name: str
    content_base64: str = None

class GenerateRequest(BaseModel):
    jobId: str
    question: str
    topK: int = 5


def ensure_embedder():
    global embedder
    if embedder is None:
        embedder = SentenceTransformer(MODEL_NAME)
    return embedder


def load_index():
    global index, metas
    vec_file = os.path.join(INDEX_DIR, 'faiss.index')
    meta_file = os.path.join(INDEX_DIR, 'meta.pkl')
    if os.path.exists(vec_file) and os.path.exists(meta_file):
        index = faiss.read_index(vec_file)
        with open(meta_file, 'rb') as f:
            metas = pickle.load(f)
    else:
        index = None
        metas = []


def save_index():
    global index, metas
    vec_file = os.path.join(INDEX_DIR, 'faiss.index')
    meta_file = os.path.join(INDEX_DIR, 'meta.pkl')
    if index is not None:
        faiss.write_index(index, vec_file)
        with open(meta_file, 'wb') as f:
            pickle.dump(metas, f)


@app.post('/process-file')
async def process_file(req: ProcessFileRequest):
    fp = None
    # If content is provided as base64, write to a temp file first
    if req.content_base64:
        tmp_name = f"/tmp/{uuid.uuid4()}_{req.file_name}"
        try:
            with open(tmp_name, 'wb') as f:
                f.write(base64.b64decode(req.content_base64))
            fp = tmp_name
        except Exception:
            fp = None
    # fallback to file_path if provided
    if not fp and req.file_path:
        fp = req.file_path
    if not fp or not os.path.exists(fp):
        raise HTTPException(status_code=404, detail='file not found')
    try:
        with open(fp, 'r', encoding='utf-8', errors='ignore') as f:
            text = f.read()
    except Exception:
        text = ''
    if not text:
        return {'jobId': req.jobId, 'numChunks': 0, 'indexed': False}

    # chunk
    CHUNK = 1000
    chunks = [text[i:i+CHUNK] for i in range(0, len(text), CHUNK)]
    # embeddings
    model = ensure_embedder()
    embs = model.encode(chunks, show_progress_bar=False, convert_to_numpy=True)

    # load existing index
    load_index()
    global index, metas
    if index is None:
        dim = embs.shape[1]
        index = faiss.IndexFlatL2(dim)
    # append and update metas
    start = len(metas)
    for i, e in enumerate(embs):
        index.add(np.expand_dims(e, axis=0))
        metas.append({'chunkId': str(uuid.uuid4()), 'jobId': req.jobId, 'fileName': req.file_name, 'text': chunks[i]})
    save_index()
    return {'jobId': req.jobId, 'numChunks': len(chunks), 'indexed': True}


@app.get('/search')
async def search(q: str, k: int = 5):
    load_index()
    if index is None:
        return {'hits': []}
    model = ensure_embedder()
    v = model.encode([q], convert_to_numpy=True)
    D, I = index.search(v, k)
    hits = []
    for dist, idx in zip(D[0], I[0]):
        if idx < 0 or idx >= len(metas):
            continue
        m = metas[idx]
        hits.append({'chunkId': m['chunkId'], 'jobId': m['jobId'], 'fileName': m['fileName'], 'score': float(dist), 'snippet': m['text'][:400]})
    return {'hits': hits}


@app.post('/generate')
async def generate(req: GenerateRequest):
    # Retrieve top-k
    load_index()
    if index is None:
        return {'answer': 'No index available', 'sources': []}
    model = ensure_embedder()
    v = model.encode([req.question], convert_to_numpy=True)
    D, I = index.search(v, req.topK)
    sources = []
    texts = []
    for dist, idx in zip(D[0], I[0]):
        if idx < 0 or idx >= len(metas):
            continue
        m = metas[idx]
        sources.append({'chunkId': m['chunkId'], 'jobId': m['jobId'], 'fileName': m['fileName'], 'score': float(dist), 'snippet': m['text'][:400]})
        texts.append(m['text'])
    # naive generator: concatenate tops
    answer = '\n\n'.join(texts)[:2000] if texts else "I couldn't find relevant information."
    return {'answer': answer, 'sources': sources}
