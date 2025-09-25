import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export const Navigation = ({ currentView, onViewChange }: NavigationProps) => {
  return (
    <nav className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">DD</span>
          </div>
          <span className="font-semibold text-lg">Due Diligence Agent</span>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center space-x-1">
          <Button
            variant={currentView === 'upload' ? 'default' : 'ghost'}
            onClick={() => onViewChange('upload')}
            className="nav-link"
          >
            Upload
          </Button>
          <Button
            variant={currentView === 'dashboard' ? 'default' : 'ghost'}
            onClick={() => onViewChange('dashboard')}
            className="nav-link"
          >
            Dashboard
          </Button>
          <Button
            variant={currentView === 'analysis' ? 'default' : 'ghost'}
            onClick={() => onViewChange('analysis')}
            className="nav-link"
          >
            Analysis
          </Button>
          <Button
            variant={currentView === 'report' ? 'default' : 'ghost'}
            onClick={() => onViewChange('report')}
            className="nav-link"
          >
            Summary
          </Button>
          <Button
            variant="outline"
            className="nav-link"
          >
            Account
          </Button>
        </div>
      </div>
    </nav>
  );
};