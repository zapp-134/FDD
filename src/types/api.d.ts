export interface KpisResponse {
	revenue: number;
	growth?: number;
	activeUsers?: number;
}

export type FinancialsResponse = Array<{ date: string; revenue: number; cost: number; profit: number }>;

export interface IngestResponse {
  runId: string;
  status?: string;
  fileName?: string;
  createdAt?: string;
  fileSize?: string | number;
  processingTime?: number;
}

export type IngestStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'error';

export interface ReportResponse {
  reportId: string;
  downloadUrl?: string;
  status?: string;
}

export interface ReportStatus {
  reportId: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  progress?: number;
  downloadUrl?: string;
}

export interface AssistantResponse {
	text: string;
}
