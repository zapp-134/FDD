# LABELED_BY_TOOL
# File: README.md
# Inferred role: Repository README / documentation
# Note: auto-generated label. Please edit the file for a more accurate description.

# Financial Due Diligence Agent

A polished, modern frontend for AI-powered financial due diligence analysis. Upload financial documents, get comprehensive analysis, and interact with an AI assistant for insights.

## Features

- **Multi-file Upload**: Drag & drop support for PDFs, spreadsheets, and financial documents
- **Real-time Analytics**: Interactive dashboards with KPIs, trends, and risk assessments
- **Structured Reports**: Comprehensive analysis with evidence linking and source documents
- **AI Chat Assistant**: Ask questions about financial data and get instant insights
 

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: shadcn/ui primitives
- **Charts**: Recharts for data visualization
- **Animations**: Framer Motion for smooth transitions
 

## Quick Start (Local, without Docker)

This repository runs the frontend and backend locally using npm scripts. Follow these steps to start both parts in development mode.

1. Install dependencies for the frontend and backend:

```bash
cd frontend
npm ci
cd ../backend
npm ci
```

2. Start the backend (development):

```bash
cd backend
npm run dev
```

3. Start the frontend (development):

```bash
cd frontend
npm run dev
```

4. Open the app:

- Frontend: http://localhost:5173 (Vite dev server)
- Backend API: http://localhost:3001/api

Configuration
- Create a `backend/.env` file (see `backend/.env.example`) and set required values like `GEMINI_API_KEY` or `GOOGLE_APPLICATION_CREDENTIALS` if you prefer ADC. The backend uses `dotenv` to load environment variables when run locally.

## Available Scripts

- `npm run dev:frontend` - Start only frontend
- `npm run dev:backend` - Start only backend
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui primitives
│   ├── Header.tsx      # Navigation header
│   ├── Footer.tsx      # Page footer
│   ├── KpiCard.tsx     # KPI display cards
│   ├── ChartCard.tsx   # Chart components
│   ├── ChatWidget.tsx  # AI chat interface
│   └── ...
├── pages/              # Route components
│   ├── Landing.tsx     # Home page
│   ├── Dashboard.tsx   # Analytics dashboard
│   ├── Upload.tsx      # File upload interface
│   ├── ReportViewer.tsx # Report display
│   └── Analysis.tsx    # Detailed analysis
├── context/            # React context
│   └── AppContext.tsx  # Global app state
├── data/               # Project data and example reports (if present)
│   └── exampleReports/ # Example report fixtures (optional)
├── hooks/              # Custom React hooks
└── lib/                # Utility functions

// The repository previously included a demo mock server and sample datasets.
// Demo server and sample files have been removed to avoid shipping mock/demo data.
```

## API Contract

The frontend expects these endpoints from the backend:

### POST /api/ingest
Upload financial documents for analysis
- **Body**: multipart/form-data with files
- **Response**: `{ "id": "<job_id>", "status": "queued" }`

### GET /api/jobs/:id  
Check processing status
- **Response**: `{ "id": "...", "status": "processing", "progress": 75, "meta": { "result_url": "/reports/<run_id>" } }`

### GET /api/reports/:runId
Retrieve analysis report
- **Response**: Structured JSON with summary, KPIs, red flags, and evidence

### POST /api/chat
Ask questions about report data
- **Body**: `{ "report_id": "<run_id>", "question": "..." }`
- **Response**: `{ "answer": "...", "sources": [...], "score": 0.92 }`

## Configuration

### Environment Variables

Create a `.env` file to customize the API endpoint:

```bash
VITE_API_BASE=http://localhost:3001/api
```

### Example Data Toggle

The app previously included an "Example Data" toggle for demo data. Demo/example datasets have been removed from this repository. Use the upload flow to provide your own documents or wire a fixture dataset.

## Switching to Real Backend

To connect to a real backend API:

1. Set `VITE_API_BASE` environment variable to your API URL
2. Ensure your backend implements the API contract above
3. Update CORS settings to allow frontend domain

## Features Demo

### Upload Flow
1. Navigate to Upload page
2. Drag & drop files or click to browse
3. Files are validated (type, size limits)
4. Upload creates job with polling for status updates
5. Completed jobs show "View Report" button

### Dashboard Analytics
- Executive summary with key insights
- 6 KPI cards with trend indicators
- 4 interactive charts (revenue, margins, customers, AR aging)
- Red flags panel with severity badges and evidence links

### Report Viewer
- Collapsible sections for easy navigation
- Evidence snippets with source document links
- Export functionality (JSON working, PDF placeholder)
- Structured layout for professional presentation

### AI Chat Assistant
- Floating chat widget (bottom-right)
- Contextual responses based on report data
- Source citations with document references
- Minimizable interface

## Development Notes

### Adding New Chart Types
Charts consume real backend data or local fixtures. To add new visualizations:

1. Feed chart components with the shape the backend provides (see `GET /api/reports/:runId`)
2. Extend chart rendering logic in `ChartCard.tsx`
3. Use design system colors (`hsl(var(--chart-1))`)

### Customizing Design System
The design system is defined in:
- `src/index.css` - CSS custom properties
- `tailwind.config.ts` - Tailwind theme extension

Always use semantic tokens rather than hardcoded colors.

### Notes on demo/server code
The repository no longer ships a demo/mock server. If you need a lightweight mock for CI or local testing, implement it separately or run small test helpers that call the real backend APIs. Avoid relying on embedded demo datasets for validation.

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

This project is for demonstration purposes. See individual package licenses for dependencies.

---

Built with ❤️ using React, TypeScript, and Tailwind CSS

## LLM runtime flags

The backend includes several environment flags that control LLM/provider behavior and safety. Set these in your `backend/.env` or root `.env` (the `docker-compose.yml` uses the root `.env` by default).

- `LLM_FAIL_OPEN` (default: `true`):
   - When `true` the backend will fall back to the local `ml_service` generator on transient LLM/provider errors (rate limits, overloaded models).
   - When `false` the backend will fail the job when the provider returns a transient error (useful for strict provider-only runs).

- `PREVENT_START_ON_BAD_MODEL` (default: `false`):
   - When `true` the backend preflight (`verifyModelHealth`) will cause the container to exit non-zero if the configured `GEMINI_MODEL` does not exist or does not advertise `generateContent` support.
   - When `false` preflight only logs a warning and the server still starts (backward compatible).

- `GEMINI_MODEL` (example: `models/gemini-2.5-pro`):
   - The full model resource name used against the Google Generative Language v1 API (must include the `models/` prefix or the code will add it automatically).
   - Set to your preferred model version via `.env`.

- `GEMINI_API_KEY` / `GOOGLE_APPLICATION_CREDENTIALS`:
   - Authentication options for Gemini (Generative Language API).
   - `GEMINI_API_KEY` — use API-key-based auth (convenient for local dev).
   - `GOOGLE_APPLICATION_CREDENTIALS` — set to the mounted service account file path to use ADC/OAuth for production credentials.

- `SIMULATE_GEMINI_TRANSIENTS` (default: `false`):
   - When set to `true` and `NODE_ENV !== 'production'`, the backend will randomly inject a single simulated transient HTTP 503 on the first Gemini call in the process. This is an opt-in development/testing helper to validate retry and fallback behavior in live containers.
   - Typical values:
      - `SIMULATE_GEMINI_TRANSIENTS=true` — enable simulation locally.
      - `SIMULATE_GEMINI_TRANSIENTS=false` — disable simulation (default for CI/production).

Behavior notes:
   - The retry-then-fallback policy retries on HTTP `429` and `503` up to 2 times (3 attempts total) with a 2-second delay between attempts. After retries, if `LLM_FAIL_OPEN=true` the backend will fall back to the local `ml_service` generator; otherwise it fails the job.
   - Authentication/model errors (`400`, `401`, `403`, `404`) are treated as hard errors and fail immediately to avoid accidental fallbacks on misconfiguration.

Example `.env` snippet for testing simulation locally:

```properties
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=models/gemini-2.5-pro
LLM_FAIL_OPEN=true
SIMULATE_GEMINI_TRANSIENTS=true
PREVENT_START_ON_BAD_MODEL=false
```

If you enable `SIMULATE_GEMINI_TRANSIENTS` during local development, you should see a log line `Simulated transient 503` followed by retry logs and (if configured) fallback behavior.