import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SAMPLE_DATA } from '@/data/sampleData';
import { useState, useEffect } from 'react';
import { useReportsGenerate } from '@/hooks/api/useReportsGenerate';
import useReportStatus from '@/hooks/api/useReportStatus';
import { getIngestionHistory } from '@/lib/dataProvider';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SAMPLE_DATA } from '@/data/sampleData';
import { useState, useEffect } from 'react';
import { useReportsGenerate } from '@/hooks/api/useReportsGenerate';
import useReportStatus from '@/hooks/api/useReportStatus';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, generateMarkdownReport } from '@/lib/reportGenerator';
import type { ReportResponse, ReportStatus } from '@/types/api';

export const ReportViewer = () => {
  const runtimeShim = (globalThis as unknown) as { __VITE_USE_REMOTE_API?: string };
  const useRemote = String(runtimeShim.__VITE_USE_REMOTE_API ?? process.env.VITE_USE_REMOTE_API ?? 'false') === 'true';
  const reportsGen = useReportsGenerate();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reportId, setReportId] = useState<string | undefined>(undefined);

  const statusQuery = useReportStatus(reportId);

  const downloadPDF = () => {
    // Browser print is used as a quick PDF export in-app
    window.print();
  };

  const downloadMarkdown = () => {
    const markdownContent = generateMarkdownReport();
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `due-diligence-report-${SAMPLE_DATA.company.runId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateRemoteReport = async () => {
    try {
      setGenerating(true);
      setProgress(5);
      const res = await reportsGen.mutateAsync({ runId: SAMPLE_DATA.company.runId });
      const report = res as ReportResponse;
      const id = report.reportId ?? (report as any)?.id;
      if (!id) throw new Error('No reportId returned from server');
      setReportId(id);
    } catch (err: any) {
      setGenerating(false);
      const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
      toast({ title: 'Failed to generate report', description: message });
    }
  };

  useEffect(() => {
    if (!reportId) return;
    const s = statusQuery?.data as ReportStatus | undefined;
    if (!s) return;

    if (s.status === 'ready') {
      const downloadUrl = (s as any).downloadUrl ?? `/api/reports/${reportId}/download`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `due-diligence-report-${reportId}.md`;
      a.click();
      setGenerating(false);
      setReportId(undefined);
      setProgress(0);
    } else if (s.status === 'failed') {
      setGenerating(false);
      toast({ title: 'Report generation failed', description: 'Remote report generation failed' });
      setReportId(undefined);
    } else {
      if ((s as any).progress != null) setProgress(Number((s as any).progress));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusQuery.data, reportId]);

  return (
    <div className="p-6">
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold">Financial Due Diligence Report</h1>
            <h2 className="text-xl text-muted-foreground mt-2">{SAMPLE_DATA.company.name}</h2>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div>Run ID: {SAMPLE_DATA.company.runId}</div>
            <div>Date: {SAMPLE_DATA.company.analysisDate}</div>
            <div>Version: {SAMPLE_DATA.company.reportVersion}</div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={useRemote ? generateRemoteReport : downloadPDF} className="bg-primary hover:bg-primary-hover">
            📄 Download PDF
          </Button>
          <Button onClick={useRemote ? generateRemoteReport : downloadMarkdown} variant="outline">
            📝 Download Markdown
          </Button>
          <Button variant="outline">📧 Share Report</Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Executive Summary</h3>
        <div className="prose max-w-none">
          <p className="text-muted-foreground mb-4">{SAMPLE_DATA.chatResponses['default']}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold kpi-positive">$12.45M</div>
              <div className="text-sm text-muted-foreground">Revenue</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold kpi-positive">12.4%</div>
              <div className="text-sm text-muted-foreground">Net Margin</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold kpi-positive">+41.1%</div>
              <div className="text-sm text-muted-foreground">Op. Income Growth</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold kpi-negative">{SAMPLE_DATA.kpis.redFlags.value}</div>
              <div className="text-sm text-muted-foreground">Red Flags</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Profit & Loss Analysis</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Line Item</th>
                <th className="text-right">{SAMPLE_DATA.financials.currentYear}</th>
                <th className="text-right">{SAMPLE_DATA.financials.priorYear}</th>
                <th className="text-right">Variance %</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_DATA.financials.lineItems.map((item, index) => (
                <tr key={index}>
                  <td className="font-semibold">{item.category}</td>
                  <td className="text-right font-mono">{formatCurrency(item.currentYear)}</td>
                  <td className="text-right font-mono">{formatCurrency(item.priorYear)}</td>
                  <td className="text-right">
                    <span className={`font-medium ${item.variance > 10 ? 'kpi-positive' : item.variance < 0 ? 'kpi-negative' : 'kpi-neutral'}`}>
                      {item.variance > 0 ? '+' : ''}{item.variance}%
                    </span>
                  </td>
                  <td className="text-sm text-muted-foreground">{item.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Red Flags Analysis</h3>
        <div className="space-y-4">
          {SAMPLE_DATA.redFlags.map((flag, index) => (
            <div key={index} className="border border-border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold">{flag.category}</h4>
                <Badge className={`status-${flag.severity === 'High' ? 'error' : 'processing'}`}>{flag.severity}</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Description:</span> {flag.description}</div>
                <div><span className="font-medium">Impact:</span> {flag.impact}</div>
                <div><span className="font-medium">Recommendation:</span> {flag.recommendation}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportViewer;