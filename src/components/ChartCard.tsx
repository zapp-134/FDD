/* LABELED_BY_TOOL
 * File: src/components/ChartCard.tsx
 * Inferred role: Frontend source (React + Vite)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';

interface ChartCardProps {
  title: string;
  type: 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'heatmap';
  data: string;
  showFilters?: boolean;
}

export const ChartCard = ({ title, type, data, showFilters }: ChartCardProps) => {
  // No mock fallbacks — if no data is provided by the backend, show a clear empty state
  const chartData = useMemo(() => {
    try {
      // If callers pass a JSON string, attempt parse; otherwise assume no data
      return Array.isArray((data as unknown) as any[]) ? ((data as unknown) as any[]) : [];
    } catch (_) {
      return [];
    }
  }, [data]);

  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return <div className="flex items-center justify-center h-full text-muted-foreground">No chart data available</div>;
    }
    switch (type) {
      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="quarter" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }} 
            />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" strokeWidth={2} />
            <Line type="monotone" dataKey="target" stroke="hsl(var(--chart-2))" strokeDasharray="5 5" />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="quarter" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }} 
            />
            <Legend />
            <Area type="monotone" dataKey="grossMargin" stackId="1" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.6} />
            <Area type="monotone" dataKey="netMargin" stackId="2" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.6} />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey={
                'customer' in chartData[0] ? "customer" : 
                'quarter' in chartData[0] ? "quarter" : 
                'period' in chartData[0] ? "period" : "name"
              } 
              className="text-xs" 
            />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }} 
            />
            <Bar 
              dataKey={
                'revenue' in chartData[0] ? "revenue" : 
                'amount' in chartData[0] ? "amount" : "value"
              } 
              fill="hsl(var(--chart-1))" 
            />
          </BarChart>
        );

      case 'pie':
      case 'donut':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={type === 'donut' ? 60 : 80}
              innerRadius={type === 'donut' ? 30 : 0}
              fill="hsl(var(--chart-1))"
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.color || `hsl(var(--chart-${(index % 5) + 1}))`} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }} 
            />
          </PieChart>
        );

      case 'heatmap':
        return (
          <BarChart data={chartData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" className="text-xs" />
            <YAxis dataKey="period" type="category" className="text-xs" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }} 
            />
            <Bar dataKey="amount" fill="hsl(var(--chart-3))" />
          </BarChart>
        );

      default:
        return <div className="text-center text-muted-foreground">Chart type not supported</div>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};