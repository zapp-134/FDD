import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { SAMPLE_DATA } from '@/data/sampleData';

interface DashboardProps {
  onKpiClick: (kpi: string) => void;
}

export const Dashboard = ({ onKpiClick }: DashboardProps) => {
  const revenueChartRef = useRef<HTMLCanvasElement>(null);
  const profitChartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Load Chart.js from CDN and create charts
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
    script.onload = () => {
      createCharts();
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const createCharts = () => {
    // @ts-ignore - Chart.js loaded from CDN
    if (typeof Chart === 'undefined') return;

    // Revenue Trend Chart
    if (revenueChartRef.current) {
      // @ts-ignore
      new Chart(revenueChartRef.current, {
        type: 'line',
        data: {
          labels: SAMPLE_DATA.revenueTrend.map(d => d.quarter),
          datasets: [{
            label: 'Revenue',
            data: SAMPLE_DATA.revenueTrend.map(d => d.revenue),
            borderColor: 'hsl(210, 100%, 45%)',
            backgroundColor: 'hsl(210, 100%, 45%, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: false,
              ticks: {
                callback: function(value: any) {
                  return '$' + (value / 1000000).toFixed(1) + 'M';
                }
              }
            }
          }
        }
      });
    }

    // Quarterly Profit Chart
    if (profitChartRef.current) {
      // @ts-ignore
      new Chart(profitChartRef.current, {
        type: 'bar',
        data: {
          labels: SAMPLE_DATA.quarterlyProfit.map(d => d.quarter),
          datasets: [{
            label: 'Profit',
            data: SAMPLE_DATA.quarterlyProfit.map(d => d.profit),
            backgroundColor: 'hsl(142, 70%, 45%)',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value: any) {
                  return '$' + (value / 1000).toFixed(0) + 'K';
                }
              }
            }
          }
        }
      });
    }
  };

  const formatValue = (value: string) => {
    return value;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'positive':
        return '↗️';
      case 'negative':
        return '↘️';
      default:
        return '➡️';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analysis Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(SAMPLE_DATA.kpis).map(([key, kpi]) => (
          <div
            key={key}
            className="kpi-card"
            onClick={() => onKpiClick(key)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-sm text-muted-foreground">{kpi.label}</h3>
              <span className="text-lg">{getTrendIcon(kpi.trend)}</span>
            </div>
            <div className={`kpi-value kpi-${kpi.trend}`}>
              {formatValue(kpi.value)}
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-sm kpi-${kpi.trend}`}>
                {kpi.change}
              </span>
              <span className="text-xs text-muted-foreground">vs prior</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {kpi.description}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="chart-container">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Revenue Trend</h3>
            <span className="text-sm text-muted-foreground">Last 8 Quarters</span>
          </div>
          <div className="h-64">
            <canvas ref={revenueChartRef}></canvas>
          </div>
        </div>

        {/* Quarterly Profit */}
        <div className="chart-container">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Quarterly Profit</h3>
            <span className="text-sm text-muted-foreground">2024 Performance</span>
          </div>
          <div className="h-64">
            <canvas ref={profitChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => onKpiClick('analysis')}>
            View Detailed P&L
          </Button>
          <Button variant="outline" onClick={() => onKpiClick('report')}>
            Generate Report
          </Button>
          <Button variant="outline">
            Export Data
          </Button>
          <Button variant="outline">
            Schedule Analysis
          </Button>
        </div>
      </div>

      {/* Red Flags Summary */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Critical Red Flags</h3>
          <span className="text-sm text-destructive font-medium">
            {SAMPLE_DATA.kpis.redFlags.value} flags identified
          </span>
        </div>
        <div className="space-y-3">
          {SAMPLE_DATA.redFlags.filter(flag => flag.severity === 'High').map((flag, index) => (
            <div key={index} className="border-l-4 border-destructive pl-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{flag.category}</h4>
                  <p className="text-sm text-muted-foreground">{flag.description}</p>
                </div>
                <span className="text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded">
                  {flag.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};