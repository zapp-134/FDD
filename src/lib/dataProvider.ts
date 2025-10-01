import { createFetcher } from "./apiClient";
import { SAMPLE_DATA } from "../data/sampleData";
import type { KpisResponse, FinancialsResponse, IngestResponse, ReportResponse, AssistantResponse, IngestStatus } from "../types/api";

const useRemote = (import.meta.env.VITE_USE_REMOTE_API === "true");

const fetchKpis = createFetcher<KpisResponse>("/kpis");
const fetchFinancials = createFetcher<any>("/financials");
const fetchIngestion = createFetcher<any>("/ingestion/history");
const fetchChat = createFetcher<AssistantResponse>("/assistant/query");

function normalizeIngestion(run: any): IngestResponse {
  return {
    runId: run.runId || run.id || `RUN-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
    status: run.status || run.state || 'completed',
    fileName: run.fileName || run.name || (run.file && run.file.name) || 'unknown',
    createdAt: run.createdAt || run.uploadDate || run.uploadedAt || new Date().toISOString(),
    fileSize: run.fileSize || run.size || (run.file && run.file.size) || undefined,
    processingTime: run.processingTime || run.duration || undefined,
  } as IngestResponse;
}

function normalizeFinancials(apiResponse: any): FinancialsResponse {
  if (!apiResponse) return {} as FinancialsResponse;
  if (apiResponse.monthly) return apiResponse as FinancialsResponse;
  return {
    monthly: apiResponse.series || apiResponse.monthly || [],
    ...apiResponse,
  } as FinancialsResponse;
}

export async function getKpis(): Promise<KpisResponse> {
  if (!useRemote) return (SAMPLE_DATA.kpis ?? {}) as KpisResponse;
  return fetchKpis();
}

export async function getFinancials(): Promise<FinancialsResponse> {
  if (!useRemote) return (SAMPLE_DATA.financials ?? {}) as FinancialsResponse;
  const raw = await fetchFinancials();
  return normalizeFinancials(raw);
}

export async function getIngestionHistory(): Promise<IngestResponse[]> {
  if (!useRemote) return (SAMPLE_DATA.ingestionHistory ?? []) as IngestResponse[];
  const raw = await fetchIngestion();
  return (raw || []).map(normalizeIngestion);
}

export async function getChatResponse(query: string): Promise<AssistantResponse> {
  if (!useRemote) return { text: SAMPLE_DATA.chatResponses?.[query] ?? SAMPLE_DATA.chatResponses?.default ?? `Echo: ${query}` } as AssistantResponse;
  return fetchChat({ query } as any);
}

