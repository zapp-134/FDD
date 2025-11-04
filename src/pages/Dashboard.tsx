import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { EmptyState } from '@/components/EmptyState';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            View analytics and insights from your financial analysis
          </p>
        </div>

        <EmptyState
          title="No Data Available"
          description="Upload financial documents to see analytics and insights in your dashboard."
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

export default Dashboard;
