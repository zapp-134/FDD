/* LABELED_BY_TOOL
 * File: src/components/IngestHistoryTable.tsx
 * Inferred role: Frontend source (React + Vite)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

import { useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Eye, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { IngestJob } from '@/pages/Upload';
import { useApp } from '@/context/AppContext';

interface IngestHistoryTableProps {
  jobs: IngestJob[];
  onJobUpdate: (job: IngestJob) => void;
}

export const IngestHistoryTable = ({ jobs, onJobUpdate }: IngestHistoryTableProps) => {
  const { apiBaseUrl } = useApp();

  // Poll for job status updates
  useEffect(() => {
    const pollJobs = () => {
      jobs.forEach(async (job) => {
        // support job objects that may use `id` or `jobId` from backend
        const jobId = (job as any).id || (job as any).jobId;
        // backend may return 'pending' initially (not 'queued') — poll for pending/queued/processing
        if (job.status === 'queued' || job.status === 'processing' || job.status === 'pending') {
          try {
            const response = await fetch(`${apiBaseUrl}/jobs/${jobId}`);
            if (response.ok) {
              const data = await response.json();
              
              const updatedJob: IngestJob = {
                // keep frontend shape but ensure `id` is populated from backend `jobId` when present
                ...job,
                id: (job as any).id || data.jobId || (job as any).jobId,
                status: data.status,
                progress: data.progress,
                reportUrl: data.meta?.result_url,
              };

              if (updatedJob.status !== job.status || updatedJob.progress !== job.progress) {
                onJobUpdate(updatedJob);
              }
            }
          } catch (error) {
            console.error('Error polling job status:', error);
          }
        }
      });
    };

    const interval = setInterval(pollJobs, 2000);
    return () => clearInterval(interval);
  }, [jobs, apiBaseUrl, onJobUpdate]);

  const getStatusBadge = (status: IngestJob['status']) => {
    if (!status) {
      // treat missing/undefined status as pending while backend initializes
      return <Badge variant="secondary">Pending</Badge>;
    }
    switch (status) {
      case 'queued':
        return <Badge variant="secondary">Queued</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-warning text-warning-foreground">Processing</Badge>;
      case 'completed':
        return <Badge className="bg-success text-success-foreground">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const retryJob = async (job: IngestJob) => {
    // In a real implementation, this would retry the job
    console.log('Retrying job:', job.id);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job ID</TableHead>
            <TableHead>Files</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const jobId = (job as any).id || (job as any).jobId || 'unknown';
            return (
              <TableRow key={jobId}>
                <TableCell className="font-mono text-sm">{String(jobId).slice(0, 8)}...</TableCell>
              <TableCell>
                <div className="space-y-1">
                  {job.files.map((filename, index) => (
                    <div key={index} className="text-sm">
                      {filename}
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(job.status)}</TableCell>
              <TableCell>
                {job.status === 'processing' && job.progress !== undefined ? (
                  <div className="space-y-1">
                    <Progress value={job.progress} className="w-20" />
                    <span className="text-xs text-muted-foreground">{job.progress}%</span>
                  </div>
                ) : (
                  '-'
                )}
              </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                {new Date((job as any).created).toLocaleString()}
              </TableCell>
                <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {job.status === 'completed' && (
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/reports/${jobId}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View Report
                      </Link>
                    </Button>
                  )}
                  {job.status === 'failed' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => retryJob(job)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                  )}
                </div>
              </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};