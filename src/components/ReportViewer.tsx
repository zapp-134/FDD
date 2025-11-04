/* LABELED_BY_TOOL
 * File: src/components/ReportViewer.tsx
 * Inferred role: Frontend source (React + Vite)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, ChevronDown, ChevronRight, ExternalLink, AlertTriangle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { motion } from 'framer-motion';

interface ReportData {
  run_id: string;
  job_id: string;
  summary: string;
  analysis: {
    kpis: {
      revenue: string;
      gross_margin: string;
      ebitda: string;
      ar_days: string;
      cash_runway: string;
    };
    red_flags: Array<{
      id: string;
      title: string;
      severity: 'high' | 'medium' | 'low';
      description: string;
      evidence: Array<{
        doc: string;
        snippet: string;
      }>;
    }>;
    trends: any[];
    reconciliations: any[];
    raw_extractions: any[];
    documents: string[];
  };
}

interface ReportViewerProps {
  runId: string;
}

export const ReportViewer = ({ runId }: ReportViewerProps) => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    summary: true,
    kpis: true,
    red_flags: true,
  });
  const { apiBaseUrl } = useApp();

  const fetchReport = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try fetching the real report produced by the backend.
      const resp = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}/reports/${runId}`);
      if (!resp.ok) {
        throw new Error(`Report not found (status ${resp.status})`);
      }
      const json = await resp.json();

      // Normalize the backend report shape to the frontend ReportData interface where possible
      const normalized: ReportData = {
        run_id: json.runId || json.run_id || runId,
        job_id: json.runId || json.run_id || `job_${runId}`,
        summary: json.summary || json.summary_text || 'No summary available',
        analysis: {
          kpis: {
            revenue: (json.kpis && json.kpis.revenue) || (json.analysis && json.analysis.kpis && json.analysis.kpis.revenue) || '$0',
            gross_margin: (json.analysis && json.analysis.kpis && json.analysis.kpis.gross_margin) || '-',
            ebitda: (json.kpis && json.kpis.ebitda) || '-',
            ar_days: '-',
            cash_runway: '-',
          },
          red_flags: (json.redFlags || json.analysis?.red_flags || []).map((f: any) => ({
            id: f.id || f.flag_id || String(Math.random()).slice(2, 8),
            title: f.title || f.name || 'Unnamed',
            severity: (f.severity || 'low') as 'high' | 'medium' | 'low',
            description: f.description || f.detail || '',
            evidence: (f.evidence || f.evidence || []).map((e: any) => ({ doc: e.doc || e.document || 'unknown', snippet: e.snippet || e.text || '' })),
          })),
          trends: json.trends || [],
          reconciliations: json.reconciliations || [],
          raw_extractions: json.raw_extractions || [],
          documents: json.files || json.analysis?.documents || [],
        },
      };

      setReportData(normalized);
    } catch (err) {
      // Do not fall back to mock data; surface a clear error so the UI shows missing report explicitly
      // eslint-disable-next-line no-console
      console.warn('Failed to fetch real report. Error:', err);
      setReportData(null);
      setError((err && (err as Error).message) || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [runId, apiBaseUrl]);

  const copyCurl = async () => {
    const url = `${apiBaseUrl.replace(/\/+$/, '')}/reports/${runId}`;
    const cmd = `curl -v ${url}`;
    try {
      await navigator.clipboard.writeText(cmd);
      // eslint-disable-next-line no-console
      console.debug('Copied to clipboard:', cmd);
    } catch (e) {
      // ignore clipboard errors
    }
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const exportToPDF = () => {
    // Mock PDF export
    console.log('Exporting report to PDF...');
  };

  const exportToJSON = () => {
    if (reportData) {
      const dataStr = JSON.stringify(reportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `report_${runId}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">Report Not Found</h2>
        <p className="text-muted-foreground">{error || 'The requested report could not be loaded.'}</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button onClick={() => fetchReport()} size="sm">Retry</Button>
          <Button onClick={() => copyCurl()} size="sm" variant="outline">Copy curl</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Financial Due Diligence Report</h1>
          <p className="text-muted-foreground">Report ID: {reportData.run_id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportToJSON}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button variant="outline" onClick={exportToPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <Card>
        <Collapsible open={openSections.summary} onOpenChange={() => toggleSection('summary')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span>Executive Summary</span>
                {openSections.summary ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{reportData.summary}</p>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* KPIs */}
      <Card>
        <Collapsible open={openSections.kpis} onOpenChange={() => toggleSection('kpis')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span>Key Performance Indicators</span>
                {openSections.kpis ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.entries(reportData.analysis.kpis).map(([key, value]) => (
                  <div key={key} className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground capitalize">{key.replace('_', ' ')}</p>
                    <p className="text-lg font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Red Flags */}
      <Card>
        <Collapsible open={openSections.red_flags} onOpenChange={() => toggleSection('red_flags')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Red Flags & Risk Factors
                </span>
                {openSections.red_flags ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-4">
                {reportData.analysis.red_flags.map((flag) => (
                  <div key={flag.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{flag.title}</h4>
                          <Badge variant={flag.severity === 'high' ? 'destructive' : flag.severity === 'medium' ? 'secondary' : 'outline'}>
                            {flag.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{flag.description}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Evidence:</h5>
                      {flag.evidence.map((evidence, index) => (
                        <div key={index} className="bg-muted p-3 rounded text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-primary">{evidence.doc}</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-muted-foreground">{evidence.snippet}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Source Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {reportData.analysis.documents.map((doc, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{doc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};