/* LABELED_BY_TOOL
 * File: src/components/EmptyState.tsx
 * Inferred role: Frontend source (React + Vite)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileX, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export const EmptyState = ({ title, description, action }: EmptyStateProps) => {
  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="pt-8 pb-6 text-center">
        <div className="mb-4">
          <FileX className="h-16 w-16 mx-auto text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>
        {action && (
          <Button asChild>
            <Link to={action.href} className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {action.label}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};