/* LABELED_BY_TOOL
 * File: src/components/ReportViewer.tsx
 * Inferred role: Frontend source (React + Vite)
 * Note: auto-generated label. Please edit the file for a more accurate description. */
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Download, FileText, ChevronDown, ChevronRight, ExternalLink, AlertTriangle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { motion } from 'framer-motion';

interface ReportData {
  run_id: string;
  job_id: string;
  summary: string;
  analysis: {
    kpis: Record<string, any>;
    red_flags: Array<{
      id: string;
      title: string;
      severity: 'high' | 'medium' | 'low';
      description: string;
      evidence: Array<{ doc: string; snippet: string }>;
    }>;
    trends: any[];
    reconciliations: any[];
    raw_extractions: any[];
    documents: string[];
  };
}

interface ReportViewerProps { runId: string; }

export const ReportViewer = ({ runId }: ReportViewerProps) => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ summary: true, red_flags: true });
  const [activeTab, setActiveTab] = useState<'summary' | 'analysis' | 'files'>('summary');
  const { apiBaseUrl } = useApp();
  const [showRaw, setShowRaw] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parseCurrency = (val: any): number => {
    if (val == null) return 0;
    if (typeof val === 'number') return val;
    const s = String(val).replace(/\(|\)/g, '-').replace(/[^0-9.\-]/g, '');
    if (s.trim() === '') return 0;
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}/reports/${runId}`);
      if (!resp.ok) throw new Error(`Report not found (status ${resp.status})`);
      const json = await resp.json();
      let parsedCandidateJson: any = null;
      try {
        if (!json.runId && json.candidates && Array.isArray(json.candidates) && json.candidates[0]?.content?.parts?.[0]?.text) {
          const text = json.candidates[0].content.parts[0].text as string;
          const fenceMatch = text.match(/```json\s*([\s\S]*?)```/i);
          const body = fenceMatch ? fenceMatch[1] : text;
          try { parsedCandidateJson = JSON.parse(body); }
          catch { const relaxed = body.replace(/\\n/g,'\n').replace(/\\"/g,'"'); try { parsedCandidateJson = JSON.parse(relaxed); } catch { parsedCandidateJson = null; } }
        }
      } catch { parsedCandidateJson = null; }
      const effectiveJson = parsedCandidateJson && parsedCandidateJson.report ? parsedCandidateJson.report : (parsedCandidateJson || json);
      const normalizedBase: any = {
        run_id: effectiveJson.runId || effectiveJson.run_id || runId,
        job_id: effectiveJson.jobId || effectiveJson.job_id || effectiveJson.runId || effectiveJson.run_id || `job_${runId}`,
        summary: effectiveJson.summary || effectiveJson.summary_text || 'No summary available',
        analysis: {
          kpis: {},
          red_flags: (effectiveJson.redFlags || effectiveJson.analysis?.red_flags || []).map((f: any) => ({
            id: f.id || f.flag_id || Math.random().toString(36).slice(2,8),
            title: f.title || f.name || 'Unnamed',
            severity: (f.severity || 'low') as 'high'|'medium'|'low',
            description: f.description || f.detail || '',
            evidence: (f.evidence || []).map((e: any) => ({ doc: e.doc || e.document || 'unknown', snippet: e.snippet || e.text || '' }))
          })),
          trends: effectiveJson.trends || [],
          reconciliations: effectiveJson.reconciliations || [],
          raw_extractions: effectiveJson.raw_extractions || [],
          documents: effectiveJson.files || effectiveJson.analysis?.documents || []
        }
      };
      (normalizedBase as any).__rawReportOriginal = json;
      (normalizedBase as any).__rawReportParsed = parsedCandidateJson || null;
      (normalizedBase as any).__rawCandidateText = json?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      const rawKpis: Record<string, any> = effectiveJson.kpis || {};
      const perFile: Array<{ file:string; revenue:number; expenses:number; ebitda:number }> = [];
      Object.keys(rawKpis).forEach(k => {
        if (k.endsWith('_local')) return;
        if (['revenue_total','expenses_total','ebitda_total'].includes(k)) return;
        if (k.startsWith('revenue_')) { const file = k.slice('revenue_'.length); if (file==='total') return; const v=parseCurrency(rawKpis[k]); let row=perFile.find(r=>r.file===file); if(!row){row={file,revenue:0,expenses:0,ebitda:0}; perFile.push(row);} row.revenue=v; }
        if (k.startsWith('expenses_')) { const file = k.slice('expenses_'.length); if (file==='total') return; const v=parseCurrency(rawKpis[k]); let row=perFile.find(r=>r.file===file); if(!row){row={file,revenue:0,expenses:0,ebitda:0}; perFile.push(row);} row.expenses=v; }
      });
      let revenueTotal = rawKpis.revenue_total != null ? parseCurrency(rawKpis.revenue_total)
        : rawKpis.total_revenue != null ? parseCurrency(rawKpis.total_revenue)
        : rawKpis.total_amount != null ? parseCurrency(rawKpis.total_amount)
        : rawKpis.total_amount_reported != null ? parseCurrency(rawKpis.total_amount_reported)
        : perFile.reduce((s,r)=>s+(r.revenue||0),0);
      let expensesTotal = rawKpis.expenses_total != null ? parseCurrency(rawKpis.expenses_total)
        : rawKpis.total_expenses != null ? parseCurrency(rawKpis.total_expenses)
        : rawKpis.expenses != null ? parseCurrency(rawKpis.expenses)
        : perFile.reduce((s,r)=>s+(r.expenses||0),0);
      let aggregatedEbitda = 0; perFile.forEach(r=>{ r.ebitda=(r.revenue||0)-(r.expenses||0); aggregatedEbitda+=r.ebitda; });
      const reportedEbitda = (rawKpis.ebitda_total ?? rawKpis.ebitda) != null ? parseCurrency(rawKpis.ebitda_total ?? rawKpis.ebitda) : aggregatedEbitda;
      let grossMarginPct: number | null = rawKpis.gross_margin_pct != null ? parseCurrency(rawKpis.gross_margin_pct) : (revenueTotal>0 ? ((revenueTotal-expensesTotal)/revenueTotal)*100 : null);
      const findNumericKey = (candidates:string[]) => { for(const k of candidates){ if(rawKpis[k]!=null) return parseCurrency(rawKpis[k]); } const keys=Object.keys(rawKpis); for(const alias of candidates){ const found=keys.find(kk=>kk.toLowerCase().includes(alias)); if(found) return parseCurrency(rawKpis[found]); } return null; };
      const arAmount = findNumericKey(['accounts_receivable','ar_total','receivables','receivable','ar']);
      const cashAmount = findNumericKey(['cash_on_hand','cash_balance','cash','cash_total']);
      const monthlyBurn = findNumericKey(['monthly_burn','monthly_expenses']) ?? (expensesTotal>0 ? expensesTotal/12 : null);
      let ar_days = '-'; if (arAmount!=null && revenueTotal>0) ar_days = `${Math.round((arAmount/revenueTotal)*365)} days`;
      let cash_runway = '-'; if (cashAmount!=null && monthlyBurn && monthlyBurn>0){ const months=cashAmount/monthlyBurn; cash_runway = (!Number.isFinite(months)||months<0)?'-': months<1?`${(months*30).toFixed(0)} days`:`${months.toFixed(1)} months`; }
      const normalizedKpis: Record<string,any> = { ...rawKpis };
      normalizedKpis.revenue_total = `$${revenueTotal.toFixed(2)}`;
      normalizedKpis.expenses_total = `$${expensesTotal.toFixed(2)}`;
      normalizedKpis.ebitda_total = `$${reportedEbitda.toFixed(2)}`;
      normalizedKpis.gross_margin_pct = grossMarginPct==null?'-':`${grossMarginPct.toFixed(1)}%`;
      normalizedKpis.ar_days = ar_days;
      normalizedKpis.cash_runway = cash_runway;
      normalizedKpis.per_file = perFile;
      normalizedBase.analysis.kpis = normalizedKpis;
      setReportData(normalizedBase as ReportData);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to fetch real report. Error:', err);
      setReportData(null);
      setError((err && (err as Error).message) || 'Failed to load report');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    try { const params = new URLSearchParams(window.location.search || ''); const tab = params.get('tab'); if (tab==='analysis'||tab==='files'||tab==='summary') setActiveTab(tab as any); } catch {}
    fetchReport();
  }, [runId, apiBaseUrl]);

  useEffect(() => { if (!reportData) return; try { const id = activeTab==='analysis'?'section-analysis': activeTab==='files'?'section-files':'section-summary'; const el=document.getElementById(id); if(el) setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'start'}),150);} catch {} }, [activeTab, reportData]);

  const copyCurl = async () => { const url=`${apiBaseUrl.replace(/\/+$/, '')}/reports/${runId}`; const cmd=`curl -v ${url}`; try { await navigator.clipboard.writeText(cmd); } catch {} };
  const toggleSection = (s:string) => setOpenSections(p=>({ ...p, [s]: !p[s] }));
  const exportToPDF = () => {
    const el = containerRef.current;
    if (!el) return;
    // Mark printable area
    el.classList.add('printable-report');
    // Cleanup after printing
    const cleanup = () => {
      el.classList.remove('printable-report');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    // Allow styles to apply
    setTimeout(() => window.print(), 50);
  };
  const exportToJSON = () => { if(!reportData) return; const dataStr=JSON.stringify(reportData,null,2); const uri='data:application/json;charset=utf-8,'+encodeURIComponent(dataStr); const a=document.createElement('a'); a.href=uri; a.download=`report_${runId}.json`; a.click(); };

  if (loading) return (<div className="max-w-4xl mx-auto space-y-4"><div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-1/3"/><div className="h-32 bg-muted rounded"/><div className="h-48 bg-muted rounded"/></div></div>);
  if (error || !reportData) return (<div className="max-w-4xl mx-auto text-center py-12"><FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground"/><h2 className="text-xl font-semibold mb-2">Report Not Found</h2><p className="text-muted-foreground">{error || 'The requested report could not be loaded.'}</p><div className="mt-4 flex items-center justify-center gap-2"><Button onClick={() => fetchReport()} size="sm">Retry</Button><Button onClick={() => copyCurl()} size="sm" variant="outline">Copy curl</Button></div></div>);

  return (
    <motion.div ref={containerRef} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Financial Due Diligence Report</h1><p className="text-muted-foreground">Report ID: {reportData.run_id}</p></div>
        <div className="flex items-center gap-2 print-hide">
          <Button variant="outline" onClick={exportToJSON}><Download className="h-4 w-4 mr-2"/>Export JSON</Button>
          <Button variant="outline" onClick={exportToPDF}><Download className="h-4 w-4 mr-2"/>Export PDF</Button>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">{['analysis','files'].map(tab => (
        <button key={tab} className={`px-3 py-1 rounded ${activeTab===tab?'bg-primary text-white':'bg-muted'}`} onClick={()=>{ setActiveTab(tab as any); const el=document.getElementById(`section-${tab}`); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }}>{tab.charAt(0).toUpperCase()+tab.slice(1)}</button>
      ))}</div>
      <Card id="section-summary">
        <Collapsible open={openSections.summary} onOpenChange={()=>toggleSection('summary')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors"><CardTitle className="flex items-center justify-between"><span>Executive Summary</span>{openSections.summary?<ChevronDown className="h-4 w-4"/>:<ChevronRight className="h-4 w-4"/>}</CardTitle></CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{reportData.summary}</p>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">{(() => {
                const k=(reportData as any).analysis.kpis||{};
                const formatVal = (v:any) => {
                  if (v == null) return '-';
                  if (typeof v === 'number') return `$${v.toFixed(2)}`;
                  const s = String(v).trim();
                  if (s === '') return '-';
                  // already formatted
                  if (s.startsWith('$') || s.endsWith('%') || /days|months|day|month/i.test(s)) return s;
                  // try coerce numeric
                  const num = parseFloat(s.replace(/[^0-9\-\.]/g, ''));
                  if (!Number.isNaN(num)) return `$${num.toFixed(2)}`;
                  return s;
                };

                const pick = (candidates:string[]) => {
                  for (const key of candidates) {
                    if (k[key] !== undefined && k[key] !== null) return formatVal(k[key]);
                  }
                  return '-';
                };

                const items = [
                  { label: 'Revenue', value: pick(['revenue_total_local','revenue_total','revenue','total_revenue','total_amount']) },
                  { label: 'Expenses', value: pick(['expenses_total_local','expenses_total','expenses','total_expenses']) },
                  { label: 'EBITDA', value: pick(['ebitda_total_local','ebitda_total','ebitda']) },
                  { label: 'Gross margin', value: pick(['gross_margin_pct_local','gross_margin_pct']) },
                  { label: 'AR days', value: pick(['ar_days']) },
                  { label: 'Cash runway', value: pick(['cash_runway']) },
                ];
                const isEmpty = (v:any) => {
                  if (v == null) return true;
                  const s = String(v).trim();
                  if (s === '-' || s === '') return true;
                  // consider $0 or $0.00 as empty
                  if (/^\$0(?:\.0+)?$/.test(s)) return true;
                  // numeric zero
                  const n = Number(s.replace(/[^0-9\-\.]/g, ''));
                  if (!Number.isNaN(n) && n === 0) return true;
                  return false;
                };
                const filtered = items.filter(it => !isEmpty(it.value));
                if (filtered.length === 0) return null;
                return filtered.map(it=>(<div key={it.label} className="text-center p-3 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">{it.label}</p><p className="text-lg font-semibold">{it.value}</p></div>));
              })()}</div>
              {(() => { const k=(reportData as any).analysis.kpis||{}; if(!k.cash_runway||k.cash_runway==='-') return <p className="mt-2 text-xs text-muted-foreground">Hint: Upload a cash/balance file to compute cash runway.</p>; return null; })()}
              {(reportData as any).analysis.kpis?.per_file?.length>0 && (
                <div className="mt-6"><h4 className="text-lg font-medium mb-2">Per-file KPIs</h4><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="pr-4">File</th><th className="pr-4">Revenue</th><th className="pr-4">Expenses</th><th className="pr-4">EBITDA</th></tr></thead><tbody>{(reportData as any).analysis.kpis.per_file.map((row:any,idx:number)=>(<tr key={idx} className="border-t"><td className="pr-4 py-2">{row.file}</td><td className="pr-4 py-2">${(row.revenue||0).toFixed(2)}</td><td className="pr-4 py-2">${(row.expenses||0).toFixed(2)}</td><td className="pr-4 py-2">${(row.ebitda||0).toFixed(2)}</td></tr>))}</tbody></table></div></div>
              )}
              {(() => { const k=(reportData as any).analysis.kpis||{}; const hide=new Set<string>(['per_file','revenue','expenses','ebitda','revenue_total','expenses_total','ebitda_total','gross_margin_pct','ar_days','cash_runway','summary']); Object.keys(k).forEach(key=>{ if(key.endsWith('_local')) hide.add(key); }); ['total_amount_per_file','files_processed','potential_duplicate_files','transactions_per_file','total_reported_amount_all_files','average_transaction_amount'].forEach(noisy=>hide.add(noisy)); const entries=Object.entries(k).filter(([key,val])=>!hide.has(key)&&(typeof val==='string'||typeof val==='number')).map(([key,val])=>({key,label:key.replace(/_/g,' '),value:val})); if(entries.length===0) return null; return (<div className="mt-6"><h4 className="text-sm font-medium mb-2 text-muted-foreground">Other metrics</h4><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">{entries.map(e=>(<div key={e.key} className="text-center p-4 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">{e.label}</p><p className="text-sm font-semibold">{String(e.value)}</p></div>))}</div><div className="mt-3"><Button variant="ghost" size="sm" onClick={() => setShowRaw(s=>!s)}>{showRaw? 'Hide raw':'Show raw JSON'}</Button></div></div>); })()}
              {showRaw && (reportData as any).__rawReportOriginal && (<div className="mt-4 p-3 bg-black/5 rounded text-xs font-mono whitespace-pre-wrap"><strong>Raw / Parsed payload:</strong><pre className="mt-2 max-h-64 overflow-auto">{JSON.stringify((reportData as any).__rawReportParsed || (reportData as any).__rawReportOriginal,null,2)}</pre></div>)}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      <Card id="section-analysis">
        <Collapsible open={openSections.red_flags} onOpenChange={()=>toggleSection('red_flags')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors"><CardTitle className="flex items-center justify-between"><span className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning"/>Red Flags & Risk Factors</span>{openSections.red_flags?<ChevronDown className="h-4 w-4"/>:<ChevronRight className="h-4 w-4"/>}</CardTitle></CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {(() => {
                const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
                const flags = [...reportData.analysis.red_flags].sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));
                return (
                  <div className="space-y-4">
                    {flags.map((flag) => (
                      <div key={flag.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={flag.severity==='high'?'destructive': flag.severity==='medium'?'secondary':'outline'}>
                                {flag.severity.toUpperCase()}
                              </Badge>
                              <h4 className="font-semibold">{flag.title}</h4>
                            </div>

                            {/* Evidence shown immediately under the title */}
                            <div className="space-y-2 mb-3">
                              <h5 className="text-sm font-medium">Evidence{flag.evidence?.length ? ` (${flag.evidence.length})` : ''}:</h5>
                              {(flag.evidence && flag.evidence.length > 0) ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {flag.evidence.map((e, idx) => (
                                    <div key={`${flag.id}-${idx}`} className="bg-muted p-3 rounded text-sm">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-primary truncate pr-2" title={e.doc}>{e.doc}</span>
                                        <Button aria-label={`Open ${e.doc}`} title={`Open ${e.doc}`} variant="ghost" size="sm" className="h-6 w-6 p-0">
                                          <ExternalLink className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <p className="text-muted-foreground whitespace-pre-wrap">{e.snippet}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No evidence provided.</p>
                              )}
                            </div>

                            {/* Description moved below evidence for better scan order */}
                            {flag.description && (
                              <p className="text-sm text-muted-foreground">{flag.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      <Card id="section-files"><CardHeader><CardTitle>Source Documents</CardTitle></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{reportData.analysis.documents.map((doc,i)=>(<div key={i} className="flex items-center gap-2 p-2 bg-muted rounded text-sm"><FileText className="h-4 w-4 text-muted-foreground"/><span>{doc}</span></div>))}</div></CardContent></Card>
    </motion.div>
  );
};