# News Pulse — Frontend Web Application

The **News Pulse Frontend** is a modern Next.js 14 web application built with React, TypeScript, and Tailwind CSS. It connects to the real Node.js REST API to provide an interactive, continuous chronological news timeline, topic cluster explorer, slide-over detail drawer, real-time source filtering, and asynchronous ingestion refresh controls.

---

## Architecture Highlights

1. **True Visual Timeline**:
   - Continuous horizontal time axis spanning the earliest to latest article timestamps across active clusters.
   - Intelligent **multi-lane packing algorithm** (`packClustersIntoLanes`) that places non-overlapping clusters into parallel horizontal rows to prevent visual collisions.
   - Proportional positioning based on timestamps with guaranteed minimum block width for singletons and short-duration events.
   - Visual intensity scaling:
     - 1 article: Clean subtle neutral styling
     - 2–3 articles: Medium blue styling with badge
     - 4+ articles: High-prominence indigo accent with elevated density badge
   - Accessible hover cards with full story titles, exact time windows, and source tags.

2. **Slide-Over Detail Drawer & Route Support**:
   - Clicking any cluster on the timeline or in the explorer slides open a smooth right-side panel without losing timeline context.
   - Displays cluster label, article count, and member articles sorted strictly **chronologically: earliest → later → latest**.
   - Each article displays a source pill, timestamp, headline, summary, and direct link to the original news story (`target="_blank" rel="noopener noreferrer"`).
   - Also supports direct navigation via `/cluster/[id]`.

3. **Instant Source Filtering**:
   - Dynamically loads available sources (`BBC News`, `NPR News`, `Al Jazeera`) from the `/timeline` API.
   - Cluster remains visible if it contains at least one article from an enabled source.
   - "Select All" and "Clear All" shortcuts for fast switching.

4. **Non-Blocking Refresh Flow**:
   - User clicks **"Refresh Data"**.
   - Frontend sends `POST /ingest/trigger` and receives `{ jobId, status: "queued" }`.
   - Polling loop checks `GET /ingest/status/:jobId` every 2s, updating UI status messages ("Checking feeds...", "Extracting articles...", "Clustering topics...").
   - Upon completion, automatically refetches timeline data and shows a success notification.
   - Concurrency guard: if another ingestion is active, reports active progress rather than failing.

---

## Directory Structure

```text
frontend/
├── src/
│   ├── app/                 # Next.js 14 App Router
│   │   ├── cluster/[id]/    # Direct route for Cluster Detail view
│   │   ├── error.tsx        # Global error boundary
│   │   ├── globals.css      # Tailwind directives and root styles
│   │   ├── layout.tsx       # Root layout, navigation shell, and footer
│   │   ├── loading.tsx      # Suspense streaming fallback
│   │   ├── not-found.tsx    # 404 page
│   │   └── page.tsx         # Main interactive dashboard
│   ├── components/
│   │   ├── cluster/         # ClusterExplorer, ClusterCard, ClusterDetail, ClusterDrawer
│   │   ├── controls/        # IngestionControl (Refresh flow, status polling)
│   │   ├── filters/         # SourceFilter (Interactive source pills, select/clear)
│   │   ├── timeline/        # TimelineView, TimelineBlock, TimelineAxis
│   │   └── ui/              # Navbar, LoadingSpinner, ErrorMessage
│   └── lib/
│       ├── api.ts           # Typed REST API client
│       ├── formatters.ts    # Date, time, and badge styling utilities
│       └── types.ts         # TypeScript API contracts and domain models
├── tests/
│   └── frontend.test.ts     # Unit tests for timeline packing, filters, and formatters
├── .env.example             # Environment variable template
├── package.json             # NPM package scripts and dependencies
├── tailwind.config.ts       # Tailwind CSS configuration
└── tsconfig.json            # TypeScript configuration
```

---

## Environment Variables

| Variable | Description | Default (Local) |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Base URL of the backend REST API (no trailing slash) | `http://localhost:5000` |

---

## Local Setup & Execution

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Tests
```bash
npm test
```

### 5. Lint & Build
```bash
npm run lint
npm run build
npm start
```
