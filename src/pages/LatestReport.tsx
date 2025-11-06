import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { EmptyState } from '@/components/EmptyState';

const LatestReport = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const base = (window as any).__FDD_API_BASE || (import.meta.env.VITE_API_BASE || 'http://localhost:3001/api');
        const resp = await fetch(`${base.replace(/\/+$/, '')}/jobs`);
        if (!resp.ok) throw new Error(`jobs endpoint returned ${resp.status}`);
        const json = await resp.json();
        const jobs: any[] = Array.isArray(json.jobs) ? json.jobs : (json.jobs || []);
        // pick most recently updated completed job
        const completed = jobs.filter((j) => j.status === 'completed');
        if (completed.length === 0) {
          setError('No completed reports yet');
          setLoading(false);
          return;
        }
        completed.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        const latest = completed[0];
        // forward any query params (e.g. ?tab=analysis)
        const qs = location.search || '';
        navigate(`/reports/${latest.jobId}${qs}`, { replace: true });
      } catch (err: any) {
        setError(err && err.message ? err.message : String(err));
        setLoading(false);
      }
    })();
  }, [navigate, location.search]);

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">Loading latest report...</main>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <EmptyState title={error ? 'No Reports Ready' : 'No Analysis Available'} description={error || 'Upload and process documents to view detailed analysis'} action={{ label: 'Upload Documents', href: '/upload' }} />
      </main>
      <Footer />
    </div>
  );
};

export default LatestReport;
