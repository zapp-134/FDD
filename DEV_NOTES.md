# LABELED_BY_TOOL
# File: DEV_NOTES.md
# Inferred role: Project file — please open to see specific role
# Note: auto-generated label. Please edit the file for a more accurate description.

# Developer Notes - FDD Agent

## Files for Backend Implementation

When implementing the real backend to replace the mock server, focus on these key files:

### 1. API Contract Reference
- `mock-server/server.js` - Complete API implementation example
- `README.md` - API contract documentation

### 2. Frontend Integration Points
- `src/context/AppContext.tsx` - API base URL configuration
- `src/components/UploadForm.tsx` - File upload with multipart/form-data
- `src/components/IngestHistoryTable.tsx` - Job status polling logic
- `src/components/ReportViewer.tsx` - Report data fetching and display
- `src/components/ChatWidget.tsx` - AI chat integration

### 3. Data Models & Types
- `src/pages/Upload.tsx` - IngestJob interface
- `src/data/exampleReports/report_sample.json` - Expected report structure

## Backend Requirements

### 1. File Processing Pipeline
The backend should implement:
- File upload handling (multipart/form-data)
- File type validation (PDF, CSV, MD, TXT, PNG, JPG, XLSX)
- Size limits (50MB per file)
- Asynchronous processing with job queues
- Progress tracking and status updates

### 2. AI/ML Integration
For document analysis:
- OCR for scanned documents
- Table extraction from PDFs/spreadsheets
- Financial data parsing and normalization
- Risk assessment algorithms
- Natural language generation for summaries

### 3. Database Schema
Recommended tables:
```sql
-- Jobs table
jobs (
  id UUID PRIMARY KEY,
  status VARCHAR(20),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  progress INTEGER,
  metadata JSONB
)

-- Reports table  
reports (
  run_id VARCHAR(50) PRIMARY KEY,
  job_id UUID REFERENCES jobs(id),
  summary TEXT,
  analysis JSONB,
  created_at TIMESTAMP
)

-- Documents table
documents (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES jobs(id),
  filename VARCHAR(255),
  file_path VARCHAR(500),
  file_size INTEGER,
  mime_type VARCHAR(100)
)
```

### 4. API Endpoints to Implement

#### POST /api/ingest
- Handle multipart file uploads
- Validate file types and sizes
- Create job record
- Queue for async processing
- Return job ID immediately

#### GET /api/jobs/:id
- Return current job status
- Include progress percentage
- Provide result URL when complete
- Handle job not found cases

#### GET /api/reports/:runId  
- Fetch complete analysis report
- Include all sections: summary, KPIs, red flags, etc.
- Return 404 if report not ready
- Support pagination for large reports

#### POST /api/chat
- Accept natural language questions
- Query report data contextually  
- Return answers with source citations
- Implement relevance scoring

### 5. Processing Architecture

Recommended flow:
1. **Upload Handler**: Receive files, validate, store temporarily
2. **Job Queue**: Redis/SQS for async processing
3. **Document Parser**: Extract text/data from files
4. **AI Analyzer**: Process financial data, identify patterns
5. **Report Generator**: Create structured analysis output
6. **Chat Engine**: RAG system for Q&A on report data

### 6. Security Considerations
- File upload validation (magic bytes, not just extensions)
- Virus scanning for uploaded files
- Rate limiting on API endpoints
- Input sanitization for chat queries
- Secure file storage with access controls

### 7. Performance Optimization
- Implement caching for expensive computations
- Use CDN for static assets
- Database indexing on frequently queried fields
- Connection pooling for database
- Horizontal scaling for processing workers

### 8. Error Handling
- Graceful degradation for processing failures
- Retry mechanisms for transient errors
- Clear error messages for users
- Logging and monitoring for debugging

## Environment Setup

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# AI/ML Services  
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=...

# File Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=...

# Application
JWT_SECRET=...
API_PORT=3001
NODE_ENV=production
```

### Docker Configuration
Consider containerizing with:
- Node.js app container
- PostgreSQL database
- Redis for caching/queues
- File processing workers
- Nginx reverse proxy

## Testing Strategy

### Integration Tests
- File upload and processing pipeline
- Database operations and migrations
- AI/ML model integration
- API endpoint responses

### Load Testing
- Concurrent file uploads
- Large file processing
- Database query performance
- Chat response times

### Security Testing
- File upload vulnerabilities
- SQL injection protection
- Authentication/authorization
- Data privacy compliance

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] File storage permissions set
- [ ] AI service API keys valid
- [ ] SSL certificates installed
- [ ] Monitoring and logging configured
- [ ] Backup strategy implemented
- [ ] CI/CD pipeline setup

## Production Monitoring

Key metrics to track:
- File processing success rate
- Average processing time per job
- AI chat response quality
- Database query performance
- Error rates by endpoint
- User engagement analytics

## Compliance Considerations

For financial data processing:
- SOC 2 Type II compliance
- Data encryption at rest and in transit
- Audit logging for all operations
- Data retention and deletion policies
- Regional data residency requirements