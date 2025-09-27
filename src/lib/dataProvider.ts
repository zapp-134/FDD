import { createFetcher } from "./apiClient";
import { SAMPLE_DATA } from "../data/sampleData";
import type { KpisResponse, FinancialsResponse, IngestResponse, ReportResponse, AssistantResponse, IngestStatus } from "../types/api";

const useRemote = (import.meta.env.VITE_USE_REMOTE_API === "true");

const fetchKpis = createFetcher<KpisResponse>("/kpis");
const fetchFinancials = createFetcher<FinancialsResponse>("/financials");
const fetchIngestion = createFetcher<IngestResponse[]>("/ingestion/history");
const fetchChat = createFetcher<AssistantResponse>("/assistant/query");

export async function getKpis(): Promise<KpisResponse> {
  if (!useRemote) return (SAMPLE_DATA.kpis ?? {}) as KpisResponse;
  return fetchKpis();
}

export async function getFinancials(): Promise<FinancialsResponse> {
  if (!useRemote) return (SAMPLE_DATA.financials ?? {}) as FinancialsResponse;
  return fetchFinancials();
}

export async function getIngestionHistory(): Promise<IngestResponse[]> {
  if (!useRemote) return (SAMPLE_DATA.ingestionHistory ?? []) as IngestResponse[];
  return fetchIngestion();
}

export async function getChatResponse(query: string): Promise<AssistantResponse> {
  if (!useRemote) return { text: SAMPLE_DATA.chatResponses?.[query] ?? SAMPLE_DATA.chatResponses?.default ?? `Echo: ${query}` } as AssistantResponse;
  return fetchChat({ query } as any);
}

