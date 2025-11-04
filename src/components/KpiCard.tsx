/* LABELED_BY_TOOL
 * File: src/components/KpiCard.tsx
 * Inferred role: Frontend source (React + Vite)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: LucideIcon;
}

export const KpiCard = ({ title, value, change, trend, icon: Icon }: KpiCardProps) => {
  const isPositive = trend === 'up';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center mt-2">
          <Badge 
            variant={isPositive ? "default" : "destructive"}
            className={cn(
              "text-xs",
              isPositive ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
            )}
          >
            <TrendIcon className="h-3 w-3 mr-1" />
            {change}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};