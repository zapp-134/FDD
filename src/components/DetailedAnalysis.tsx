import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SAMPLE_DATA } from '@/data/sampleData';
import { getFinancials } from '@/lib/dataProvider';
import { useFinancials } from '@/hooks/api/useFinancials';
import { toast } from '@/hooks/use-toast';
import type { FinancialsResponse } from '@/types/api';

export const DetailedAnalysis = () => {
  const [selectedYear, setSelectedYear] = useState(2024);
  const useRemote = (import.meta.env.VITE_USE_REMOTE_API === 'true');
  const { data: remoteFinancials, error } = useFinancials();
  const [financials, setFinancials] = useState<FinancialsResponse>(SAMPLE_DATA.financials as unknown as FinancialsResponse);

  useEffect(() => {
    if (!useRemote) return;
    if (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({ title: 'Failed to load financials', description: msg });
      return;
    }
    if (remoteFinancials) {
      // minimal adapter: if remote returns different shape, map here. For now assume compatible.
      setFinancials(remoteFinancials as FinancialsResponse);
    }
  }, [useRemote, remoteFinancials, error]);
  
  const exportCSV = () => {
    const headers = ['Line Item', 'Current Year', 'Prior Year', 'Variance %', 'Notes'];
    const rows = SAMPLE_DATA.financials.lineItems.map(item => [
      item.category,
      `$${item.currentYear.toLocaleString()}`,
      `$${item.priorYear.toLocaleString()}`,
      `${item.variance}%`,
      item.notes
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-analysis-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 10) return 'kpi-positive';
    if (variance < 0) return 'kpi-negative';
    return 'kpi-neutral';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <span>Dashboard</span>
        <span>›</span>
        <span>Analysis</span>
        <span>›</span>
        <span className="text-foreground font-medium">Profit & Loss Statement</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Detailed Financial Analysis</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive P&L breakdown with variance analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-border rounded-md bg-background"
          >
            <option value={2024}>2024</option>
            <option value={2023}>2023</option>
            <option value={2022}>2022</option>
          </select>
          <Button onClick={exportCSV} variant="outline">
            Export CSV
          </Button>
        </div>
      </div>

      {/* Financial Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-left">Line Item</th>
              <th className="text-right">Current Year ({SAMPLE_DATA.financials.currentYear})</th>
              <th className="text-right">Prior Year ({SAMPLE_DATA.financials.priorYear})</th>
              <th className="text-right">Variance %</th>
              <th className="text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_DATA.financials.lineItems.map((item, index) => (
              <tr key={index} className="hover:bg-muted/50">
                <td className="font-semibold">{item.category}</td>
                <td className="text-right font-mono">
                  {formatCurrency(item.currentYear)}
                </td>
                <td className="text-right font-mono">
                  {formatCurrency(item.priorYear)}
                </td>
                <td className="text-right">
                  <span className={`font-medium ${getVarianceColor(item.variance)}`}>
                    {item.variance > 0 ? '+' : ''}{item.variance}%
                  </span>
                </td>
                <td className="text-sm text-muted-foreground">
                  {item.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Highlights */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Performance Highlights</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Revenue Growth</span>
              <span className="kpi-positive font-medium">+11.2%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Gross Margin Expansion</span>
              <span className="kpi-positive font-medium">+3.8%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Operating Leverage</span>
              <span className="kpi-positive font-medium">+41.1%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Net Margin Improvement</span>
              <span className="kpi-positive font-medium">+2.1%</span>
            </div>
          </div>
        </div>

        {/* Anomaly Detection */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Detected Anomalies</h3>
          <div className="space-y-4">
            <div className="border-l-4 border-warning pl-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-sm">One-time Expense Spike</h4>
                  <p className="text-xs text-muted-foreground">Q3 consulting expenses 340% above average</p>
                </div>
                <Badge className="status-processing">Medium</Badge>
              </div>
            </div>
            <div className="border-l-4 border-destructive pl-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-sm">Revenue Recognition Pattern</h4>
                  <p className="text-xs text-muted-foreground">Unusual Q4 revenue concentration</p>
                </div>
                <Badge className="status-error">High</Badge>
              </div>
            </div>
            <div className="border-l-4 border-warning pl-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-sm">Working Capital Mismatch</h4>
                  <p className="text-xs text-muted-foreground">A/R growth exceeds revenue growth</p>
                </div>
                <Badge className="status-processing">Medium</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Analysis Chart */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Revenue vs Expenses Trend</h3>
          <span className="text-sm text-muted-foreground">Quarterly View</span>
        </div>
        <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-sm">Interactive chart showing revenue vs expense trends</p>
            <p className="text-xs">Would be rendered with Chart.js in full implementation</p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-semibold mb-4">AI Recommendations</h3>
        <div className="space-y-3">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">🔍 Investigation Priority</h4>
            <p className="text-sm text-muted-foreground">
              Focus due diligence on Q4 revenue recognition policies and customer contract terms 
              to validate the sustainability of growth patterns.
            </p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">💡 Operational Insight</h4>
            <p className="text-sm text-muted-foreground">
              Strong operational leverage indicates effective cost management. Consider analyzing 
              scalability of current cost structure for future growth projections.
            </p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">⚠️ Risk Assessment</h4>
            <p className="text-sm text-muted-foreground">
              High customer concentration (34%) warrants detailed customer contract analysis 
              and churn risk evaluation in final due diligence report.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};