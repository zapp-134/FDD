import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { IngestJob } from '@/pages/Upload';

interface UploadFormProps {
  onJobUpdate: (job: IngestJob) => void;
}

export const UploadForm = ({ onJobUpdate }: UploadFormProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const { toast } = useToast();
  const { apiBaseUrl } = useApp();

  const acceptedTypes = ['.pdf', '.csv', '.md', '.txt', '.png', '.jpg', '.jpeg', '.xlsx', '.xls'];
  const maxFileSize = 50 * 1024 * 1024; // 50MB

  const validateFile = (file: File): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(extension)) {
      toast({
        title: 'Invalid file type',
        description: `File ${file.name} is not supported. Accepted types: ${acceptedTypes.join(', ')}`,
        variant: 'destructive',
      });
      return false;
    }

    if (file.size > maxFileSize) {
      toast({
        title: 'File too large',
        description: `File ${file.name} exceeds 50MB limit`,
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(validateFile);
    
    setFiles(prev => [...prev, ...validFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(validateFile);
    
    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select at least one file to upload',
        variant: 'destructive',
      });
      return;
    }

    // Use XMLHttpRequest so we can show upload progress events in the UI for testing
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      console.log('Starting upload to', `${apiBaseUrl}/ingest`);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${apiBaseUrl}/ingest`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        setIsUploading(false);
        setUploadProgress(null);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            const jobId = data.jobId || data.id;

            const newJob: IngestJob = {
              id: jobId,
              files: files.map(f => f.name),
              status: data.status || 'queued',
              created: new Date(),
            };

            onJobUpdate(newJob);
            setFiles([]);

            toast({
              title: 'Upload successful',
              description: `Started processing ${files.length} file(s)`,
            });
          } catch (err) {
            console.error('Failed to parse upload response', err, xhr.responseText);
            toast({ title: 'Upload failed', description: 'Invalid server response', variant: 'destructive' });
          }
        } else {
          console.error('Upload failed, status', xhr.status, xhr.responseText);
          toast({ title: 'Upload failed', description: 'Server returned an error', variant: 'destructive' });
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        setUploadProgress(null);
        console.error('Upload network error');
        toast({ title: 'Upload failed', description: 'Network error during upload', variant: 'destructive' });
      };

      xhr.send(formData);
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      setUploadProgress(null);
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your files. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card 
        className={`border-2 border-dashed transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
      >
        <CardContent className="p-8 text-center">
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Drop files here or click to browse</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Supports: PDF, CSV, MD, TXT, PNG, JPG, XLSX files (max 50MB each)
          </p>
          <input
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <Button asChild variant="outline">
            <label htmlFor="file-upload" className="cursor-pointer">
              Select Files
            </label>
          </Button>
        </CardContent>
      </Card>

      {/* Selected Files */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <h4 className="font-medium">Selected Files ({files.length})</h4>
            <div className="space-y-2">
              {files.map((file, index) => (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Button */}
      {files.length > 0 && (
        <div className="space-y-2">
          <Button 
            onClick={handleUpload} 
            disabled={isUploading} 
            className="w-full"
            size="lg"
          >
            {isUploading ? 'Uploading...' : `Upload ${files.length} file(s)`}
          </Button>

          {isUploading && (
            <div className="mt-2">
              <Progress value={uploadProgress ?? 0} className="w-full" />
              <div className="text-xs text-muted-foreground mt-1">{uploadProgress ?? 0}%</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
