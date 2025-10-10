import { createFetcher } from "./apiClient";
import { SAMPLE_DATA } from "../data/sampleData";
import type { KpisResponse, FinancialsResponse, IngestResponse, AssistantResponse } from "./validators";
import { adaptKpis, adaptFinancials, adaptIngestion, adaptAssistant } from "./adapters";

const useRemote = (import.meta.env.VITE_USE_REMOTE_API === "true");

const fetchKpis = createFetcher<KpisResponse>("/kpis");
const fetchFinancials = createFetcher<unknown>("/financials");
const fetchIngestion = createFetcher<unknown>("/ingestion/history");
const fetchChat = createFetcher<unknown>("/assistant/query");

function normalizeIngestion(run: unknown): IngestResponse {
  const r = run as Record<string, unknown>;
  return {
    runId: String(r['runId'] ?? r['id'] ?? `RUN-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`),
    status: String(r['status'] ?? r['state'] ?? 'completed'),
    fileName: String(r['fileName'] ?? r['name'] ?? (r['file'] && (r['file'] as Record<string, unknown>)['name']) ?? 'unknown'),
    createdAt: String(r['createdAt'] ?? r['uploadDate'] ?? r['uploadedAt'] ?? new Date().toISOString()),
    fileSize: (r['fileSize'] ?? r['size'] ?? (r['file'] && (r['file'] as Record<string, unknown>)['size']) ?? undefined) as string | number | undefined,
    processingTime: (r['processingTime'] ?? r['duration'] ?? undefined) as string | number | undefined,
  } as IngestResponse;
}

function normalizeFinancials(apiResponse: unknown): FinancialsResponse {
  if (!apiResponse) return [] as FinancialsResponse;
  if (Array.isArray(apiResponse)) return apiResponse as FinancialsResponse;
  const r = apiResponse as Record<string, unknown> | undefined;
  if (r?.monthly) return r.monthly as unknown as FinancialsResponse;
  const candidate = r?.series ?? r?.monthly ?? [];
  return (candidate as unknown) as FinancialsResponse;
}

export async function getKpis(): Promise<KpisResponse> {
  if (!useRemote) return (SAMPLE_DATA.kpis ?? {}) as KpisResponse;
  const raw = await fetchKpis();
  return adaptKpis(raw);
}

export async function getFinancials(): Promise<FinancialsResponse> {
  if (!useRemote) return (SAMPLE_DATA.financials ?? {}) as FinancialsResponse;
  const raw = await fetchFinancials();
  const financials = adaptFinancials(raw);
  return financials;
}

export async function getIngestionHistory(): Promise<IngestResponse[]> {
  if (!useRemote) return (SAMPLE_DATA.ingestionHistory ?? []) as unknown as IngestResponse[];
  const raw = await fetchIngestion();
  const arr = (Array.isArray(raw) ? raw : []) as unknown[];
  return arr.map((r) => adaptIngestion(r));
}

export async function getChatResponse(query: string): Promise<AssistantResponse> {
  if (!useRemote) return { text: SAMPLE_DATA.chatResponses?.[query] ?? SAMPLE_DATA.chatResponses?.default ?? `Echo: ${query}` } as AssistantResponse;
  const raw = await fetchChat({ query } as Record<string, unknown>);
  return adaptAssistant(raw);
}

