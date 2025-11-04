/* LABELED_BY_TOOL
 * File: backend/src/mlClient.types.ts
 * Inferred role: Backend project file (server)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

export interface ProcessFileResult {
  jobId: string;
  numChunks: number;
  indexed: boolean;
}

export interface GenerateResult {
  answer: string;
  sources: {
    chunkId: string;
    jobId: string;
    fileName: string;
    score: number;
    snippet: string;
  }[];
}

export interface GeneratedReportResult {
  reportJsonText: string; // raw JSON text the model returned for the Report
  analysisJsonText?: string; // optional separate analysis JSON text
}

export type SearchHit = {
  chunkId: string;
  jobId: string;
  fileName: string;
  score: number;
  snippet: string;
};
