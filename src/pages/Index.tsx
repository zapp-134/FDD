import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { UploadScreen } from '@/components/UploadScreen';
import { Dashboard } from '@/components/Dashboard';
import { DetailedAnalysis } from '@/components/DetailedAnalysis';
import { ReportViewer } from '@/components/ReportViewer';
import { ChatWidget } from '@/components/ChatWidget';

const Index = () => {
  const [currentView, setCurrentView] = useState('upload');

  const handleKpiClick = (kpiType: string) => {
    if (kpiType === 'analysis' || kpiType === 'report') {
      setCurrentView(kpiType);
    } else {
      // For specific KPI analysis, go to detailed analysis
      setCurrentView('analysis');
    }
  };

  const handleIngestionComplete = () => {
    // Auto-navigate to dashboard after successful ingestion
    setTimeout(() => {
      setCurrentView('dashboard');
    }, 1000);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'upload':
        return <UploadScreen onIngestionComplete={handleIngestionComplete} />;
      case 'dashboard':
        return <Dashboard onKpiClick={handleKpiClick} />;
      case 'analysis':
        return <DetailedAnalysis />;
      case 'report':
        return <ReportViewer />;
      default:
        return <Dashboard onKpiClick={handleKpiClick} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
      <main className="min-h-[calc(100vh-80px)]">
        {renderCurrentView()}
      </main>
      <ChatWidget />
    </div>
  );
};

export default Index;
