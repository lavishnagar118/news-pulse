# News Pulse — Backend REST API

The **News Pulse Backend** is a high-performance Node.js + Express REST API written in TypeScript. It interfaces directly with **MongoDB** via the official Node driver to serve topic-clustered news timelines, handle source filtering and cluster drill-down, and trigger/monitor asynchronous scraper ingestion runs.

---

## Architectural Highlights

- **Direct Route Mounting**: In strict alignment with assessment requirements, all routes are mounted directly at root (`/clusters`, `/clusters/:id`, `/timeline`, `/ingest/trigger`, `/ingest/status/:jobId`, `/health`) with no `/api` prefix.
- **Layered Clean Architecture**: Strict separation of concerns between HTTP Controllers, Business Logic Services, and Database Accessors.
- **High-Performance Projections**: Full article HTML bodies are excluded from cluster summaries and timeline queries to minimize memory overhead and keep network payloads minimal.
- **Non-Blocking Ingestion**: Triggering ingestion returns HTTP `202 Accepted` immediately with a unique tracking `jobId`. Execution runs asynchronously via a pluggable runner abstraction.
- **Concurrency Guard**: Prevents overlapping ingestion runs by rejecting concurrent triggers with `HTTP 409 Conflict` if an ingestion run is already active.
- **Consistent Error Structure**: Every error response adheres to `{ "error": { "code": "...", "message": "..." } }`.

---

## Directory Structure

```text
backend/
├── src/
│   ├── config/              # Centralized environment variable configuration
│   ├── controllers/         # Request handling and validation (cluster, timeline, ingest)
│   ├── db/                  # MongoDB client connection, collections, and ensureIndexes
│   ├── middleware/          # Standard error handler and request logger
│   ├── routes/              # Express route routers
│   ├── services/            # Business domain services (ClusterService, ArticleService, IngestionJobService)
│   │   └── ingestion/       # Runner abstraction: SubprocessIngestionRunner, HttpIngestionRunner
│   ├── types/               # TypeScript domain interfaces and API DTO contracts
│   ├── utils/               # Custom error classes (AppError, NotFoundError, BadRequestError, ConcurrentJobError)
│   └── server.ts            # Application factory and bootstrap script
├── tests/
│   └── api.test.ts          # Automated integration test suite covering all 10 API requirements
├── .env.example             # Configuration template
├── package.json             # NPM package scripts and dependencies
├── tsconfig.json            # TypeScript configuration
└── README.md                # Backend service documentation
```

---

## API Endpoints Reference

### 1. `GET /clusters`
Retrieve all topic clusters sorted by `startTime` descending.

- **Query Parameters**:
  - `limit` *(optional)*: Maximum number of clusters to return.
  - `offset` *(optional)*: Number of clusters to skip.
- **Response**: `200 OK`
```json
[
  {
    "id": "6ab0f3305dd276cec7658ce4",
    "label": "Suspects Extradited Killing",
    "articleCount": 2,
    "startTime": "2026-09-20T20:31:15.000Z",
    "endTime": "2026-09-21T08:41:50.000Z"
  }
]
```

---

### 2. `GET /clusters/:id`
Retrieve detailed view of a single topic cluster and its member articles (sorted chronologically: earliest → later → latest).

- **Path Parameters**:
  - `id`: 24-character hexadecimal MongoDB ObjectId.
- **Response**: `200 OK`
```json
{
  "id": "6ab0f3305dd276cec7658ce4",
  "label": "Suspects Extradited Killing",
  "articleCount": 2,
  "startTime": "2026-09-20T20:31:15.000Z",
  "endTime": "2026-09-21T08:41:50.000Z",
  "articles": [
    {
      "id": "6ab0f1571d916f4e51fd322a",
      "title": "Eighteen suspects extradited to US over Haitian president’s 2021 killing",
      "summary": "Federal court in Florida to try men accused of orchestrating the transnational plot to kill Jovenel Moise from US soil.",
      "source": "Al Jazeera",
      "url": "https://www.aljazeera.com/news/2026/9/20/eighteen-suspects-extradited-to-us-over-haitian-presidents-2021-killing?traffic_source=rss",
      "publishedAt": "2026-09-20T20:31:15.000Z"
    },
    {
      "id": "6ab0f1491d916f4e51fd320e",
      "title": "18 suspects accused in the 2021 killing of Haiti's president being extradited to U.S.",
      "summary": "Eighteen suspects who were arrested in the July 2021 killing of Haitian President Jovenel Moïse were being extradited to the U.S. on Sunday.",
      "source": "NPR News",
      "url": "https://www.npr.org/2026/09/21/nx-s1-5976026/suspects-killing-haiti-president-extradited",
      "publishedAt": "2026-09-21T08:41:50.000Z"
    }
  ]
}
```
- **Error Responses**:
  - `400 Bad Request`: When `id` is not a valid 24-character hex string.
    ```json
    { "error": { "code": "BAD_REQUEST", "message": "Invalid cluster ID format" } }
    ```
  - `404 Not Found`: When cluster does not exist.
    ```json
    { "error": { "code": "NOT_FOUND", "message": "Cluster not found" } }
    ```

---

### 3. `GET /timeline`
Retrieve chronological clusters formatted for frontend timeline charts alongside distinct available news sources.

- **Query Parameters**:
  - `source` *(optional)*: Filter by single source or comma-separated list (`?source=BBC News,NPR News`).
  - `startDate` *(optional)*: ISO timestamp for cluster start lower bound.
  - `endDate` *(optional)*: ISO timestamp for cluster start upper bound.
  - `sort` *(optional)*: `asc` (default, earliest first) or `desc` (latest first).
  - `limit` *(optional)*: Maximum items to return.
- **Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "6ab0f3305dd276cec7658d15",
      "label": "Kennedy Center Losing",
      "startTime": "2026-09-18T18:56:17.000Z",
      "endTime": "2026-09-18T18:56:17.000Z",
      "articleCount": 1,
      "intensity": 1
    }
  ],
  "sources": [
    "Al Jazeera",
    "BBC News",
    "NPR News"
  ]
}
```

---

### 4. `POST /ingest/trigger`
Asynchronously trigger the RSS ingestion and topic clustering pipeline.

- **Request Body** *(optional)*:
  - `force` *(boolean)*: If `true`, bypasses the concurrency guard.
- **Response**: `202 Accepted`
```json
{
  "jobId": "job_1789982194079_2ih7y3",
  "status": "queued"
}
```
- **Concurrency Guard Response**: `409 Conflict` (when a previous job is still running/queued)
```json
{
  "error": {
    "code": "CONCURRENT_JOB_RUNNING",
    "message": "An ingestion job is already in progress",
    "jobId": "job_1789982061440_xuye43"
  }
}
```

---

### 5. `GET /ingest/status/:jobId`
Poll status and diagnostic metrics for an ingestion job.

- **Path Parameters**:
  - `jobId`: Ingestion job identifier returned by `POST /ingest/trigger`.
- **Response**: `200 OK`
```json
{
  "jobId": "job_1789982194079_2ih7y3",
  "status": "completed",
  "startedAt": "2026-09-21T09:16:37.204Z",
  "completedAt": "2026-09-21T09:16:37.204Z",
  "error": null,
  "stats": {
    "articlesFetched": 64,
    "articlesAdded": 0,
    "duplicatesSkipped": 64,
    "extractionFailures": 0,
    "feedsAttempted": 3,
    "feedsSucceeded": 3,
    "feedsFailed": 0,
    "clustersUpdated": 55
  }
}
```
- **Error Response**: `404 Not Found`
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Ingestion job not found"
  }
}
```

---

### 6. `GET /health`
Liveness and readiness check reporting service uptime and MongoDB connection state.

- **Response**: `200 OK` (or `503 Service Unavailable` if database is down)
```json
{
  "status": "healthy",
  "service": "news-pulse-backend",
  "database": "connected",
  "timestamp": "2026-09-21T09:13:53.712Z"
}
```

---

## Local Setup & Development

### 1. Requirements
- Node.js v18+ (tested on Node v25)
- MongoDB v6+ running locally on `mongodb://127.0.0.1:27017/news_pulse`
- Python 3.10+ in PATH with scraper dependencies installed (for `SCRAPER_MODE=subprocess`)

### 2. Installation
```bash
cd backend
npm install
```

### 3. Environment Configuration
Copy the configuration template:
```bash
cp .env.example .env
```

### 4. Running the Development Server
```bash
npm run dev
```

### 5. Running the Test Suite
The test suite validates all 10 assessment requirements against real MongoDB collections:
```bash
npm test
```

### 6. Production Build
```bash
npm run build
npm start
```

---

## Render Deployment Configuration

In cloud environments (such as Render), the Node.js REST API runs as a standalone Linux web service communicating with MongoDB Atlas and dispatching ingestion triggers to the Python scraper service over HTTP.

### Service Specifications

- **Environment**: Node.js 18+ (Linux container).
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`
- **Host Binding**: Binds to `0.0.0.0` on the port specified by `$PORT` (defaults to `5000` locally).

### Production Environment Variables

| Variable | Description | Example / Target Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | Web server listening port | Assigned by Render (e.g. `10000`) |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/news_pulse` |
| `CORS_ORIGIN` | Allowed frontend origin for CORS | `https://your-frontend.vercel.app` |
| `SCRAPER_MODE` | Ingestion dispatch mode | `http` |
| `SCRAPER_SERVICE_URL` | URL of the Python scraper service | `https://news-pulse-scraper.onrender.com` |
| `INGESTION_SERVICE_SECRET` | Shared secret for scraper authentication | Generated secret (matches scraper service) |

### Ingestion Dispatch via HTTP Runner

When `SCRAPER_MODE=http` is set:
1. `POST /ingest/trigger` receives the ingestion request from the client.
2. The Node.js backend initializes an `IngestionJob` document in MongoDB with `status: 'queued'`.
3. `HttpIngestionRunner` sends an authenticated `POST /run` request to `SCRAPER_SERVICE_URL` with header `X-Ingestion-Secret: <secret>`.
4. The Python service accepts the request, returns `202 Accepted`, and executes the pipeline in the background.
5. The frontend polls `GET /ingest/status/:jobId` against the Node backend, which reads real-time status updates directly from MongoDB.

