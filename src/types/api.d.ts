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
	[key: string]: any;
}

export type IngestStatus = "pending" | "processing" | "completed" | "failed";

export interface ReportResponse {
	reportId: string;
	[key: string]: any;
}

export interface AssistantResponse {
	text: string;
	[key: string]: any;
}
