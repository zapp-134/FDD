import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SAMPLE_DATA } from '@/data/sampleData';
import { useState, useEffect } from 'react';
import { useReportsGenerate } from '@/hooks/api/useReportsGenerate';
import useReportStatus from '@/hooks/api/useReportStatus';
import { getIngestionHistory } from '@/lib/dataProvider';
import { toast } from '@/hooks/use-toast';
import type { ReportResponse } from '@/types/api';

export const ReportViewer = () => {
  const useRemote = (import.meta.env.VITE_USE_REMOTE_API === 'true');
  const reportsGen = useReportsGenerate();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  // We'll use useReportStatus to poll when we have a reportId
  const downloadPDF = () => {
    // Simulate PDF download using browser print
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
      // expect { reportId } or { reportId, downloadUrl }
      const report: ReportResponse = res as any;
      const reportId = (report.reportId || (report as any).id) as string;
      if (!reportId) throw new Error('No reportId returned from server');
      // start polling via hook
      const statusQuery = useReportStatus(reportId);
      // wait until ready or failed
      // poll until status is ready
      let finalStatus = 'pending';
      for (let i = 0; i < 60; i++) {
        // read latest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // @ts-ignore - statusQuery may be undefined in this scope; use api client as fallback
        const s = statusQuery?.data as any;
        if (s?.status === 'ready') {
          finalStatus = 'ready';
          // download
          const downloadUrl = s.downloadUrl || `/api/reports/${reportId}/download`;
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `due-diligence-report-${reportId}.md`;
          a.click();
          break;
        }
        if (s?.status === 'failed') {
          finalStatus = 'failed';
          break;
        }
        await new Promise(r => setTimeout(r, 1000));
      }
      setGenerating(false);
    } catch (err: any) {
      setGenerating(false);
      toast({ title: 'Failed to generate report', description: String(err?.message ?? err) });
    }
  };

  const generateMarkdownReport = () => {
    return `# Financial Due Diligence Report

## ${SAMPLE_DATA.company.name}

**Analysis Date:** ${SAMPLE_DATA.company.analysisDate}  
**Run ID:** ${SAMPLE_DATA.company.runId}  
**Analyst:** ${SAMPLE_DATA.company.analyst}  
**Report Version:** ${SAMPLE_DATA.company.reportVersion}

---

## Executive Summary

TechCorp Solutions Inc. demonstrates strong operational performance with revenue growth of 11.2% and significant improvement in profitability metrics. However, several red flags warrant careful consideration in the due diligence process.

### Key Findings

- **Revenue Growth**: $12.45M (+11.2% YoY)
- **Net Margin**: 12.4% (+2.1% improvement)
- **Operational Leverage**: 41.1% increase in operating income
- **Critical Concerns**: 7 red flags identified, including revenue concentration and customer dependency

---

## Financial Performance Overview

### Key Performance Indicators

| Metric | Current Value | Change | Status |
|--------|---------------|--------|--------|
| Net Margin | 12.4% | +2.1% | ✅ Positive |
| Current Ratio | 1.82 | -0.3 | ⚠️ Declining |
| Customer Concentration | 34% | +5% | ❌ Risk |
| Red Flags | 7 | +2 | ❌ Concern |

### Profit & Loss Analysis

| Line Item | ${SAMPLE_DATA.financials.currentYear} | ${SAMPLE_DATA.financials.priorYear} | Variance |
|-----------|------------|------------|----------|
${SAMPLE_DATA.financials.lineItems.map(item => 
`| ${item.category} | $${item.currentYear.toLocaleString()} | $${item.priorYear.toLocaleString()} | ${item.variance}% |`
).join('\n')}

---

## Risk Assessment

### High-Severity Red Flags

${SAMPLE_DATA.redFlags.filter(flag => flag.severity === 'High').map(flag => 
`#### ${flag.category}
- **Description**: ${flag.description}
- **Impact**: ${flag.impact}
- **Recommendation**: ${flag.recommendation}
`).join('\n')}

### Medium-Severity Red Flags

${SAMPLE_DATA.redFlags.filter(flag => flag.severity === 'Medium').map(flag => 
`#### ${flag.category}
- **Description**: ${flag.description}
- **Impact**: ${flag.impact}
- **Recommendation**: ${flag.recommendation}
`).join('\n')}

---

## Recommendations

1. **Revenue Quality Review**: Conduct detailed analysis of Q4 revenue recognition practices
2. **Customer Diversification**: Assess strategies to reduce concentration risk
3. **Cash Flow Analysis**: Deep dive into working capital management
4. **Operational Efficiency**: Leverage strong cost management for future growth

---

## Conclusion

While TechCorp shows strong financial performance and growth trajectory, the identified red flags require thorough investigation before finalizing any investment or acquisition decision.

**Overall Risk Rating**: Medium-High  
**Recommendation**: Proceed with enhanced due diligence focus on revenue quality and customer relationships.
`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6">
      {/* Report Header */}
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
          <Button variant="outline">
            📧 Share Report
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Executive Summary</h3>
        <div className="prose max-w-none">
          <p className="text-muted-foreground mb-4">
            TechCorp Solutions Inc. demonstrates strong operational performance with revenue growth of 11.2% 
            and significant improvement in profitability metrics. However, several red flags warrant careful 
            consideration in the due diligence process.
          </p>
          
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
              <div className="text-2xl font-bold kpi-negative">7</div>
              <div className="text-sm text-muted-foreground">Red Flags</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Key Performance Indicators</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Current Value</th>
                <th>Change</th>
                <th>Status</th>
                <th>Commentary</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(SAMPLE_DATA.kpis).map(([key, kpi]) => (
                <tr key={key}>
                  <td className="font-semibold">{kpi.label}</td>
                  <td className="font-mono">{kpi.value}</td>
                  <td className={`kpi-${kpi.trend}`}>{kpi.change}</td>
                  <td>
                    <Badge className={`status-${kpi.trend === 'positive' ? 'completed' : kpi.trend === 'negative' ? 'error' : 'processing'}`}>
                      {kpi.trend === 'positive' ? 'Good' : kpi.trend === 'negative' ? 'Concern' : 'Neutral'}
                    </Badge>
                  </td>
                  <td className="text-sm text-muted-foreground">{kpi.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Analysis */}
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

      {/* Chart Placeholder */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Revenue Trend Analysis</h3>
        <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="text-4xl mb-2">📈</div>
            <p className="text-sm">Revenue trend chart would be embedded here</p>
            <p className="text-xs">Showing 8-quarter revenue progression with key milestones</p>
          </div>
        </div>
      </div>

      {/* Red Flags Analysis */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Red Flags Analysis</h3>
        <div className="space-y-4">
          {SAMPLE_DATA.redFlags.map((flag, index) => (
            <div key={index} className="border border-border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold">{flag.category}</h4>
                <Badge className={`status-${flag.severity === 'High' ? 'error' : 'processing'}`}>
                  {flag.severity}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Description:</span> {flag.description}
                </div>
                <div>
                  <span className="font-medium">Impact:</span> {flag.impact}
                </div>
                <div>
                  <span className="font-medium">Recommendation:</span> {flag.recommendation}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Final Recommendations</h3>
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">🔍 Due Diligence Focus Areas</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Detailed review of Q4 revenue recognition practices and customer contracts</li>
              <li>Analysis of customer concentration risk and retention strategies</li>
              <li>Investigation of working capital management and cash flow patterns</li>
            </ul>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">💡 Investment Considerations</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Strong operational leverage provides good foundation for growth</li>
              <li>Revenue quality concerns may impact valuation multiples</li>
              <li>Customer diversification strategy critical for risk mitigation</li>
            </ul>
          </div>
          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold mb-2">Overall Risk Assessment</div>
              <Badge className="status-processing text-lg px-4 py-2">Medium-High Risk</Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Proceed with enhanced due diligence focus on revenue quality and customer relationships
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};