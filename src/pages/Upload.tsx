
import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { UploadForm } from '@/components/UploadForm';
import { IngestHistoryTable } from '@/components/IngestHistoryTable';
import { JobLogs } from '@/components/JobLogs';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload as UploadIcon } from 'lucide-react';

export interface IngestJob {
  id: string;
  files: string[];
  status: 'queued' | 'processing' | 'completed' | 'failed';
  created: Date;
  reportUrl?: string;
  progress?: number;
}

const Upload = () => {
  const [jobs, setJobs] = useState<IngestJob[]>([]);
  const { apiBaseUrl } = useApp();
  const [debugJobId, setDebugJobId] = useState<string>('');

  const handleJobUpdate = (updatedJob: IngestJob) => {
    setJobs(prev => {
      const existingIndex = prev.findIndex(job => job.id === updatedJob.id);
      if (existingIndex >= 0) {
        const newJobs = [...prev];
        newJobs[existingIndex] = updatedJob;
        return newJobs;
      } else {
        return [updatedJob, ...prev];
      }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Upload Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadIcon className="h-5 w-5" />
                Upload Financial Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UploadForm onJobUpdate={handleJobUpdate} />
            </CardContent>
          </Card>

          {/* Processing History */}
          {jobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Processing History</CardTitle>
              </CardHeader>
              <CardContent>
                <IngestHistoryTable jobs={jobs} onJobUpdate={handleJobUpdate} />
              </CardContent>
            </Card>
          )}

          {/* Live Logs for latest job */}
          {jobs.length > 0 && (
            <JobLogs jobId={jobs[0].id} apiBaseOverride={apiBaseUrl} />
          )}

          {/* Debug: watch arbitrary job id */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Debug: Watch job by ID</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <input
                  className="input w-full"
                  placeholder="Paste job id (e.g. 2981c374-...)"
                  value={debugJobId}
                  onChange={(e) => setDebugJobId(e.target.value)}
                />
              </div>
              {debugJobId && (
                <div className="mt-4">
                  <JobLogs jobId={debugJobId} apiBaseOverride={apiBaseUrl} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Upload;