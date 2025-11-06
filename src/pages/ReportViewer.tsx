import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ReportViewer as ReportViewerComponent } from '@/components/ReportViewer';
import { ChatWidget } from '@/components/ChatWidget';

const ReportViewer = () => {
  const { runId } = useParams<{ runId: string }>();
  const location = window.location;

  if (!runId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Invalid Report ID</h1>
            <p className="text-muted-foreground">The report you're looking for could not be found.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <ReportViewerComponent runId={runId} />
      </main>

      <ChatWidget reportId={runId} />
      <Footer />
    </div>
  );
};

export default ReportViewer;
