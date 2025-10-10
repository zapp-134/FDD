import { z } from "zod";

export const KpisSchema = z.object({
  revenue: z.number(),
  growth: z.number().optional(),
  activeUsers: z.number().optional(),
});
export type KpisResponse = z.infer<typeof KpisSchema>;
export const parseKpis = (v: unknown): KpisResponse => KpisSchema.parse(v);

export const FinancialRow = z.object({
  date: z.string(),
  revenue: z.number(),
  cost: z.number(),
  profit: z.number(),
});
export const FinancialsSchema = z.array(FinancialRow);
export type FinancialsResponse = z.infer<typeof FinancialsSchema>;
export const parseFinancials = (v: unknown): FinancialsResponse => FinancialsSchema.parse(v);

export const IngestSchema = z.object({
  runId: z.string(),
  status: z.string().optional(),
  uploadedAt: z.string().optional(),
  fileName: z.string().optional(),
  createdAt: z.string().optional(),
  fileSize: z.number().optional(),
});
export type IngestResponse = z.infer<typeof IngestSchema>;
export const parseIngest = (v: unknown): IngestResponse => IngestSchema.parse(v);

export const ReportStatusSchema = z.object({
  reportId: z.string(),
  status: z.enum(["pending", "processing", "ready", "failed"]),
  downloadUrl: z.string().url().optional(),
  progress: z.number().min(0).max(100).optional(),
});
export type ReportStatus = z.infer<typeof ReportStatusSchema>;
export const parseReportStatus = (v: unknown): ReportStatus => ReportStatusSchema.parse(v);

export const AssistantSchema = z.object({
  text: z.string(),
});
export type AssistantResponse = z.infer<typeof AssistantSchema>;
export const parseAssistant = (v: unknown): AssistantResponse => AssistantSchema.parse(v);
