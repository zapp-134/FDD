/* LABELED_BY_TOOL
 * File: src/components/RedFlagsList.tsx
 * Inferred role: Frontend source (React + Vite)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink } from 'lucide-react';

interface RedFlag {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  evidence: {
    doc: string;
    snippet: string;
  }[];
}
export const RedFlagsList = ({ flags }: { flags?: RedFlag[] }) => {
  // If no flags provided, show an explicit empty-state so the UI fails loudly instead of showing mock data
  const effective = flags ?? [];
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'warning';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Red Flags & Risk Factors
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {effective.length === 0 ? (
            <div className="text-center text-muted-foreground">No red flags available (no data from backend).</div>
          ) : (
            effective.map((flag) => (
              <div key={flag.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{flag.title}</h4>
                      <Badge variant={getSeverityVariant(flag.severity)}>
                        {flag.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{flag.description}</p>
                  </div>
                </div>

                {/* Evidence */}
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
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};