import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { EmptyState } from '@/components/EmptyState';
import { BarChart3 } from 'lucide-react';

const Analysis = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Detailed Analysis - Report {id}
          </h1>
          <p className="text-muted-foreground">Interactive analysis with filtering capabilities</p>
        </div>

        <EmptyState 
          title="No Analysis Available"
          description="Upload and process documents to view detailed analysis"
        />
      </main>

      <Footer />
    </div>
  );
};

export default Analysis;
