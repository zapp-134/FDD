import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { EmptyState } from '@/components/EmptyState';

const Summary = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Executive Summary</h1>
          <p className="text-muted-foreground">
            Comprehensive financial analysis overview
          </p>
        </div>

        <EmptyState
          title="No Analysis Available"
          description="Upload financial documents to generate an executive summary with key findings and recommendations."
          action={{
            label: "Upload Documents",
            href: "/upload"
          }}
        />
      </main>

      <Footer />
    </div>
  );
};

export default Summary;
