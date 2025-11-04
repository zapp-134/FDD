/* LABELED_BY_TOOL
 * File: backend/src/types.ts
 * Inferred role: Backend project file (server)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

export interface SearchHit {
  chunkId: string;
  jobId: string;
  fileName: string;
  score: number;
  snippet: string;
}

export type Source = SearchHit;
