/* LABELED_BY_TOOL
 * File: backend/src/reportGenerator.ts
 * Inferred role: Backend project file (server)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Minimal CSV parser (split by line, comma) tolerant to simple CSVs used in samples
function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((ln) => {
    const parts = ln.split(',');
    const obj: any = {};
    for (let i = 0; i < headers.length; i++) obj[headers[i]] = (parts[i] || '').trim();
    return obj;
  });
  return { headers, rows };
}

function parseAmount(v: string) {
  if (!v) return 0;
  const cleaned = v.replace(/[^0-9.\-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export async function generateLocalReport(jobId: string, uploadsDir: string, files: string[]) {
  // Attempt to read first CSV/text file and compute simple KPIs
  const resultReport: any = {
    runId: jobId,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    summary: `Report for job ${jobId}`,
    kpis: {},
    redFlags: [],
    trends: [],
    files: files,
  };

  const resultAnalysis: any = {
    analysisId: `an-${uuidv4()}`,
    reportRunId: jobId,
    createdAt: new Date().toISOString(),
    sections: [],
    insights: [],
  };

  for (const f of files) {
    const p = path.join(uploadsDir, f);
    if (!fs.existsSync(p)) continue;
    try {
      const text = await fs.promises.readFile(p, 'utf8');
      // If file looks like CSV (has commas and header), parse
      if (text.indexOf(',') !== -1) {
        const { headers, rows } = parseCSV(text);
        // try to detect Amount column
  const amountKey = headers.length ? (headers.find((h) => /amount|amt|value|total|price/i.test(h)) || headers[0]) : undefined;
        // try to detect Date column
        const dateKey = headers.find((h) => /date/i.test(h));
        // compute simple aggregations
        let revenue = 0;
        let expenses = 0;
        const monthly: Record<string, { revenue: number; expenses: number }> = {};
        for (const r of rows) {
          const a = amountKey ? parseAmount(r[amountKey]) : 0;
          if (a >= 0) revenue += a; else expenses += -a;
          // monthly key
          if (dateKey && r[dateKey]) {
            const d = new Date(r[dateKey]);
            if (!isNaN(d.getTime())) {
              const mk = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
              monthly[mk] = monthly[mk] || { revenue: 0, expenses: 0 };
              if (a >= 0) monthly[mk].revenue += a; else monthly[mk].expenses += -a;
            }
          }
          // red flags simple: large negative amount
          if (a < 0 && Math.abs(a) > 100000) {
            resultReport.redFlags.push({ id: uuidv4(), title: 'Large outflow', severity: 'high', description: `Large negative transaction ${a} in file ${f}` });
          }
        }
        // KPIs
        resultReport.kpis = resultReport.kpis || {};
        resultReport.kpis[`revenue_${f}`] = `$${revenue.toFixed(2)}`;
        resultReport.kpis[`expenses_${f}`] = `$${expenses.toFixed(2)}`;
        resultReport.kpis['revenue_total'] = `$${( (parseFloat(resultReport.kpis['revenue_total']?.replace(/[^0-9.]/g,'')||0) + revenue)).toFixed(2)}`;
        // compute ebitda approx
        const ebitda = revenue - expenses;
        resultReport.kpis['ebitda'] = `$${ebitda.toFixed(2)}`;

        // trends: month-over-month revenue change (simple)
        const months = Object.keys(monthly).sort();
        const trends: any[] = [];
        for (let i = 1; i < months.length; i++) {
          const prev = monthly[months[i-1]].revenue || 0;
          const cur = monthly[months[i]].revenue || 0;
          const pct = prev === 0 ? (cur === 0 ? 0 : 100) : ((cur - prev) / Math.abs(prev) * 100);
          trends.push({ title: `Revenue change ${months[i-1]} -> ${months[i]}`, description: `${pct.toFixed(1)}%` });
        }
        resultReport.trends = resultReport.trends.concat(trends);

        // analysis sections
        resultAnalysis.sections.push({ title: `File ${f} extraction`, content: `Detected ${rows.length} rows with headers: ${headers.join(', ')}.` });
        resultAnalysis.insights.push(`Total revenue ${resultReport.kpis[`revenue_${f}`]}, total expenses ${resultReport.kpis[`expenses_${f}`]}, ebitda ${resultReport.kpis['ebitda']}.`);
      } else {
        // treat as text: simple length and snippets
        const snippet = text.slice(0, 1000);
        resultAnalysis.sections.push({ title: `File ${f} text`, content: `Text snippet: ${snippet}` });
      }
    } catch (e) {
      // ignore read errors but add a red flag
      resultReport.redFlags.push({ id: uuidv4(), title: 'File read error', severity: 'medium', description: `Could not read file ${f}: ${e}` });
    }
  }

  // Build summary
  resultReport.summary = `Generated deterministic report for job ${jobId}: revenue ${resultReport.kpis['revenue_total'] || 'N/A'}, ebitda ${resultReport.kpis['ebitda'] || 'N/A'}`;

  return { report: resultReport, analysis: resultAnalysis };
}
