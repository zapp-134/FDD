import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, BarChart3, FileText, MessageSquare } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
            Financial Due Diligence Agent
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            AI-powered financial analysis for comprehensive due diligence. Upload documents, get insights, and make informed decisions faster.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8">
              <Link to="/upload">Upload Files</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8">
              <Link to="/dashboard">View Dashboard</Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <Upload className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">Document Upload</h3>
              <p className="text-sm text-muted-foreground">
                Multi-file drag & drop support for PDFs, spreadsheets, and financial documents
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-chart-2" />
              <h3 className="text-lg font-semibold mb-2">Real-time Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Interactive dashboards with KPIs, trends, and financial metrics
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <FileText className="h-12 w-12 mx-auto mb-4 text-chart-3" />
              <h3 className="text-lg font-semibold mb-2">Structured Reports</h3>
              <p className="text-sm text-muted-foreground">
                Comprehensive analysis with evidence linking and risk assessment
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-chart-4" />
              <h3 className="text-lg font-semibold mb-2">AI Chat Assistant</h3>
              <p className="text-sm text-muted-foreground">
                Ask questions about your data and get instant insights with sources
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <Card className="text-center py-12 bg-gradient-to-r from-primary/5 to-chart-2/5">
          <CardContent>
            <h2 className="text-2xl font-bold mb-4">Ready to see it in action?</h2>
            <p className="text-muted-foreground mb-6">
              Explore the dashboard or upload your own documents to get started
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link to="/dashboard">Explore Dashboard</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/upload">Start Analysis</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Landing;
