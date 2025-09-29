import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SAMPLE_DATA } from '@/data/sampleData';
import { getIngestionHistory } from '@/lib/dataProvider';
import { useIngestUpload } from '@/hooks/api/useIngestUpload';
import { toast } from '@/hooks/use-toast';
import type { IngestResponse } from '@/types/api';

interface UploadScreenProps {
  onIngestionComplete: () => void;
}

export const UploadScreen = ({ onIngestionComplete }: UploadScreenProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ingestionProgress, setIngestionProgress] = useState(0);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestionHistory, setIngestionHistory] = useState<IngestResponse[]>(SAMPLE_DATA.ingestionHistory);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const useRemote = (import.meta.env.VITE_USE_REMOTE_API === 'true');
  const ingestUpload = useIngestUpload();

  useEffect(() => {
    if (!useRemote) return;
    let mounted = true;
    (async () => {
      try {
        const history = await getIngestionHistory();
        if (mounted) setIngestionHistory(history);
      } catch (err: any) {
        toast({ title: 'Fetch ingestion history failed', description: String(err?.message ?? err) });
      }
    })();
    return () => { mounted = false; };
  }, [useRemote]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const simulateIngestion = async () => {
    if (!selectedFile) return;

    setIsIngesting(true);
    setIngestionProgress(0);

    // Simulate ingestion progress
    const steps = [10, 25, 45, 70, 85, 100];
    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setIngestionProgress(step);
    }

    // Add new run to history
    const newRun = {
      runId: `RUN-2024-${String(Date.now()).slice(-3)}`,
      fileName: selectedFile.name,
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'completed' as const,
      fileSize: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
      processingTime: '2m 34s'
    };

    setIngestionHistory([newRun, ...ingestionHistory]);
    setIsIngesting(false);
    setSelectedFile(null);
    setIngestionProgress(0);
    
    // Notify parent component
    onIngestionComplete();
  };

  const submitFileRemote = async () => {
    if (!selectedFile) return;
    try {
      setIsIngesting(true);
      setIngestionProgress(0);
      const form = new FormData();
      form.append('file', selectedFile);
      await ingestUpload.mutateAsync(form as any);
      // refetch history
      const history = await getIngestionHistory();
      setIngestionHistory(history);
      setIsIngesting(false);
      setSelectedFile(null);
      setIngestionProgress(0);
      onIngestionComplete();
    } catch (err: any) {
      setIsIngesting(false);
      toast({ title: 'Upload failed', description: String(err?.message ?? err) });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      queued: 'status-queued',
      processing: 'status-processing',
      completed: 'status-completed',
      error: 'status-error'
    };

    return (
      <Badge className={statusClasses[status as keyof typeof statusClasses] || 'status-queued'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border p-6">
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Upload Documents</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload financial documents for analysis
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-3">Ingestion History</h3>
            <p className="text-sm text-muted-foreground">
              View previous analysis runs
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Settings</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>• Analysis Depth: Comprehensive</div>
              <div>• Red Flag Sensitivity: High</div>
              <div>• Export Format: PDF + MD</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Document Upload & Ingestion</h1>

          {/* Upload Area */}
          <div className="mb-8">
            <div
              className={`upload-area ${dragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="space-y-4">
                <div className="text-4xl">📄</div>
                <div>
                  <p className="text-lg font-semibold">Drop files here or click to browse</p>
                  <p className="text-muted-foreground mt-2">
                    Supported formats: PDF, Excel, Word, ZIP
                  </p>
                </div>
                {selectedFile && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.xlsx,.xls,.docx,.doc,.zip"
            />

            {selectedFile && (
              <div className="mt-4 flex gap-4">
                <Button 
                  onClick={useRemote ? submitFileRemote : simulateIngestion}
                  disabled={isIngesting}
                  className="bg-primary hover:bg-primary-hover"
                >
                  {isIngesting ? 'Processing...' : 'Start Ingestion'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedFile(null)}
                  disabled={isIngesting}
                >
                  Clear
                </Button>
              </div>
            )}

            {isIngesting && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing document...</span>
                  <span>{ingestionProgress}%</span>
                </div>
                <Progress value={ingestionProgress} className="w-full" />
              </div>
            )}
          </div>

          {/* Ingestion History */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Ingestion History</h2>
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Run ID</th>
                    <th>File Name</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Size</th>
                    <th>Processing Time</th>
                  </tr>
                </thead>
                <tbody>
                  {ingestionHistory.map((run) => (
                    <tr key={run.runId} className="hover:bg-muted/50">
                      <td className="font-mono text-sm">{run.runId}</td>
                      <td>{run.fileName}</td>
                      <td>{run.uploadDate}</td>
                      <td>{getStatusBadge(run.status)}</td>
                      <td>{run.fileSize}</td>
                      <td>{run.processingTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};