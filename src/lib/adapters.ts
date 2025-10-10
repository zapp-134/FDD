import {
  parseKpis,
  parseFinancials,
  parseIngest,
  parseReportStatus,
  parseAssistant,
  KpisResponse,
  FinancialsResponse,
  IngestResponse,
  ReportStatus,
  AssistantResponse,
} from "./validators";

export function adaptKpis(raw: unknown): KpisResponse {
  try {
    return parseKpis(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`adaptKpis: validation failed: ${msg}`);
  }
}

export function adaptFinancials(raw: unknown): FinancialsResponse {
  try {
    // normalize shape: accept an array or an object with 'monthly' or 'series'
    if (Array.isArray(raw)) return parseFinancials(raw as unknown);
    const r = raw as Record<string, unknown> | undefined;
    const candidate = r?.monthly ?? r?.series ?? raw;
    return parseFinancials(candidate as unknown);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`adaptFinancials: validation failed: ${msg}`);
  }
}

export function adaptIngestion(raw: unknown): IngestResponse {
  try {
    const r = raw as Record<string, unknown> | undefined;
    type FileLike = { name?: string; size?: number; type?: string };
    const file = r && (r['file'] as unknown) as FileLike | undefined;
    const normalized = {
      runId: (r && (r['runId'] ?? r['id'])) ?? `RUN-${Date.now()}`,
      status: r && (r['status'] ?? r['state']),
      uploadedAt: r && (r['uploadedAt'] ?? r['uploadDate'] ?? r['createdAt']),
      fileName: r && (r['fileName'] ?? r['name'] ?? file?.name),
      createdAt: r && (r['createdAt'] ?? r['uploadedAt'] ?? r['uploadDate']),
      fileSize: r && (r['fileSize'] ?? r['size'] ?? file?.size),
    };
    // ensure required runId is present as string
    const ensured = { ...normalized, runId: String(normalized.runId) };
    return parseIngest(ensured as unknown);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`adaptIngestion: validation failed: ${msg}`);
  }
}

export function adaptReportStatus(raw: unknown): ReportStatus {
  try {
    const r = raw as Record<string, unknown> | undefined;
    const normalized = {
      reportId: r && (r['reportId'] ?? r['id']),
      status: r && (r['status'] ?? r['state']),
      downloadUrl: r && (r['downloadUrl'] ?? r['url'] ?? r['download_link']),
      progress: r && (r['progress'] ?? r['pct'] ?? r['percentage']),
    };
    return parseReportStatus(normalized as unknown);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`adaptReportStatus: validation failed: ${msg}`);
  }
}

export function adaptAssistant(raw: unknown): AssistantResponse {
  try {
    const r = raw as Record<string, unknown> | undefined;
    const textVal = (r && (r['text'] ?? r['response'])) ?? String(raw ?? '');
    const normalized = { text: String(textVal) };
    return parseAssistant(normalized as unknown);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`adaptAssistant: validation failed: ${msg}`);
  }
}
