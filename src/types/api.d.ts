export interface KpisResponse {
	totalUsers?: number;
	activeUsers?: number;
	revenue?: number;
	[key: string]: any;
}

export interface FinancialsResponse {
	monthly?: Array<{ month: string; revenue: number; expenses: number }>;
	[key: string]: any;
}

export interface IngestResponse {
	runId: string;
	status: 'queued' | 'processing' | 'completed' | 'error' | 'failed';
	fileName: string;
	createdAt?: string;
	fileSize?: string;
	processingTime?: string;
	[key: string]: any;
}

export type IngestStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'error';

export interface ReportResponse {
	reportId: string;
	downloadUrl?: string;
	status?: string;
	[key: string]: any;
}

export interface ReportStatus {
  reportId: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  progress?: number;
  downloadUrl?: string;
}

export interface AssistantResponse {
	text: string;
	[key: string]: any;
}
