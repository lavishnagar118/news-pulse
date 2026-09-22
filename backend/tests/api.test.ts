process.env.NODE_ENV = 'test';
// Ensure integration tests target local test database rather than remote Atlas
if (!process.env.TEST_MONGODB_URI && (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('mongodb.net'))) {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/news_pulse_test';
}

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/server';
import { connectDb, closeDb, getClustersCollection, getArticlesCollection, getIngestionJobsCollection } from '../src/db';
import { ingestionJobService } from '../src/services/job.service';
import { ObjectId } from 'mongodb';

describe('News Pulse REST API Integration Tests', () => {
  const app = createApp();
  const createdTestJobIds: string[] = [];
  let sampleClusterId: string = '';

  before(async () => {
    await connectDb();

    // Find or seed a cluster with member articles to test GET /clusters/:id
    let cluster = await getClustersCollection().findOne({ articleCount: { $gte: 2 } });
    if (!cluster) {
      const newClusterId = new ObjectId();
      await getClustersCollection().insertOne({
        _id: newClusterId,
        label: 'Test Global Politics Cluster',
        articleCount: 2,
        startTime: new Date('2026-09-20T10:00:00Z'),
        endTime: new Date('2026-09-20T12:00:00Z'),
        createdAt: new Date(),
      });
      await getArticlesCollection().insertMany([
        {
          title: 'Election Results Announced in National Vote',
          summary: 'Detailed summary of the election results.',
          content: 'Full article content for election results announced today.',
          source: 'BBC News',
          url: 'https://example.com/election-1',
          publishedAt: new Date('2026-09-20T10:30:00Z'),
          imageUrl: 'https://example.com/img1.jpg',
          category: 'Politics',
          createdAt: new Date(),
          clusterId: newClusterId.toString(),
        },
        {
          title: 'Voter Turnout Reaches Record High in Election',
          summary: 'Record voter numbers reported.',
          content: 'Full article content describing voter turnout in detail.',
          source: 'Reuters',
          url: 'https://example.com/election-2',
          publishedAt: new Date('2026-09-20T11:00:00Z'),
          imageUrl: 'https://example.com/img2.jpg',
          category: 'Politics',
          createdAt: new Date(),
          clusterId: newClusterId.toString(),
        },
      ]);
      cluster = await getClustersCollection().findOne({ _id: newClusterId });
    }

    if (cluster && cluster._id) {
      sampleClusterId = cluster._id.toString();
    }

    // Mock the ingestion runner to prevent executing full python scraper during integration tests
    ingestionJobService.setRunner({
      trigger: async (jobId: string) => {
        // Mock runner records invocation without spawning child process
      },
    });
  });

  after(async () => {
    // Clean up any test ingestion jobs created during test run
    if (createdTestJobIds.length > 0) {
      await getIngestionJobsCollection().deleteMany({ jobId: { $in: createdTestJobIds } });
    }
    await closeDb();
  });

  // 1. GET /clusters returns clusters ordered by startTime descending
  test('1. GET /clusters returns clusters ordered by startTime descending', async () => {
    const res = await request(app).get('/clusters');

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body), 'Response should be a JSON array of clusters');
    assert.ok(res.body.length > 0, 'Should return clusters from database');

    const first = res.body[0];
    assert.ok(first.id, 'Cluster item must have id');
    assert.ok(first.label, 'Cluster item must have label');
    assert.equal(typeof first.articleCount, 'number', 'Cluster item must have articleCount');
    assert.ok(first.startTime, 'Cluster item must have startTime');
    assert.ok(first.endTime, 'Cluster item must have endTime');
    assert.equal(first.content, undefined, 'Must not expose large article content');

    // Verify startTime descending order
    for (let i = 0; i < res.body.length - 1; i++) {
      const current = new Date(res.body[i].startTime).getTime();
      const next = new Date(res.body[i + 1].startTime).getTime();
      assert.ok(current >= next, `Clusters must be sorted by startTime desc: ${current} >= ${next}`);
    }
  });

  // 2. GET /clusters/:id returns cluster details and member articles
  test('2. GET /clusters/:id returns cluster details and member articles', async () => {
    assert.ok(sampleClusterId, 'Must have a valid sampleClusterId to test');
    const res = await request(app).get(`/clusters/${sampleClusterId}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.id, sampleClusterId);
    assert.ok(res.body.label);
    assert.ok(Array.isArray(res.body.articles), 'Cluster detail must include member articles array');
    assert.ok(res.body.articles.length > 0, 'Member articles must not be empty');

    const art = res.body.articles[0];
    assert.ok(art.id, 'Article must have id');
    assert.ok(art.title, 'Article must have title');
    assert.ok(art.source, 'Article must have source');
    assert.ok(art.url, 'Article must have url');
    assert.ok(art.publishedAt, 'Article must have publishedAt');
    assert.equal(art.content, undefined, 'Full body content must be omitted from summary article representation');

    // Verify member articles are sorted chronologically (ascending by publishedAt: earliest -> later -> latest)
    assert.ok(res.body.articles.length >= 2, 'Sample cluster should have at least 2 articles for order verification');
    for (let i = 0; i < res.body.articles.length - 1; i++) {
      const current = new Date(res.body.articles[i].publishedAt).getTime();
      const next = new Date(res.body.articles[i + 1].publishedAt).getTime();
      assert.ok(
        current <= next,
        `Articles must be sorted ascending by publishedAt: ${res.body.articles[i].publishedAt} (${current}) <= ${res.body.articles[i + 1].publishedAt} (${next})`
      );
    }
  });

  // 3. GET /clusters/:id returns 404 for nonexistent cluster
  test('3. GET /clusters/:id returns 404 for nonexistent cluster', async () => {
    const nonExistentId = new ObjectId().toString();
    const res = await request(app).get(`/clusters/${nonExistentId}`);

    assert.equal(res.status, 404);
    assert.ok(res.body.error, 'Response must contain structured error object');
    assert.equal(res.body.error.code, 'NOT_FOUND');
    assert.equal(res.body.error.message, 'Cluster not found');
  });

  // 4. GET /clusters/:id returns 400 for malformed ID
  test('4. GET /clusters/:id returns 400 for malformed ID', async () => {
    const malformedId = 'invalid-not-an-objectid';
    const res = await request(app).get(`/clusters/${malformedId}`);

    assert.equal(res.status, 400);
    assert.ok(res.body.error, 'Response must contain structured error object');
    assert.equal(res.body.error.code, 'BAD_REQUEST');
    assert.equal(res.body.error.message, 'Invalid cluster ID format');
  });

  // 5. GET /timeline returns chronological clusters and sources
  test('5. GET /timeline returns chronological clusters and sources', async () => {
    const res = await request(app).get('/timeline');

    assert.equal(res.status, 200);
    assert.ok(res.body.data, 'Timeline response must have data array');
    assert.ok(res.body.sources, 'Timeline response must have sources array');
    assert.ok(Array.isArray(res.body.data), 'data must be an array');
    assert.ok(Array.isArray(res.body.sources), 'sources must be an array');

    assert.ok(res.body.data.length > 0, 'Timeline data must contain items');
    const firstItem = res.body.data[0];
    assert.ok(firstItem.id, 'Timeline item must have id');
    assert.ok(firstItem.label, 'Timeline item must have label');
    assert.ok(firstItem.startTime, 'Timeline item must have startTime');
    assert.ok(firstItem.endTime, 'Timeline item must have endTime');
    assert.equal(typeof firstItem.articleCount, 'number', 'Timeline item must have articleCount');
    assert.equal(typeof firstItem.intensity, 'number', 'Timeline item must have intensity');
    assert.equal(firstItem.intensity, firstItem.articleCount, 'Intensity should match articleCount density');

    // Chronological ordering (startTime ascending)
    for (let i = 0; i < res.body.data.length - 1; i++) {
      const current = new Date(res.body.data[i].startTime).getTime();
      const next = new Date(res.body.data[i + 1].startTime).getTime();
      assert.ok(current <= next, `Timeline items must be sorted chronologically: ${current} <= ${next}`);
    }

    // Verify sources list
    assert.ok(res.body.sources.includes('BBC News') || res.body.sources.length > 0);
  });

  // 6. POST /ingest/trigger returns 202 and jobId
  let createdJobId = '';
  test('6. POST /ingest/trigger returns 202 and jobId', async () => {
    const res = await request(app).post('/ingest/trigger');

    assert.equal(res.status, 202);
    assert.ok(res.body.jobId, 'Response must return a jobId');
    assert.equal(res.body.status, 'queued');

    createdJobId = res.body.jobId;
    createdTestJobIds.push(createdJobId);
  });

  // 7. GET /ingest/status/:jobId returns job status
  test('7. GET /ingest/status/:jobId returns job status', async () => {
    assert.ok(createdJobId, 'Must have createdJobId from previous test');
    const res = await request(app).get(`/ingest/status/${createdJobId}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.jobId, createdJobId);
    assert.equal(res.body.status, 'queued');
    assert.ok(res.body.startedAt);
    assert.equal(res.body.completedAt, null);
    assert.equal(res.body.error, null);
    assert.ok(res.body.stats, 'Response must include stats object');
    assert.equal(typeof res.body.stats.articlesFetched, 'number');
  });

  // 8. GET /ingest/status/:jobId returns 404 for nonexistent job
  test('8. GET /ingest/status/:jobId returns 404 for nonexistent job', async () => {
    const res = await request(app).get('/ingest/status/nonexistent_job_99999');

    assert.equal(res.status, 404);
    assert.ok(res.body.error, 'Response must have error object');
    assert.equal(res.body.error.code, 'NOT_FOUND');
    assert.equal(res.body.error.message, 'Ingestion job not found');
  });

  // 9. GET /health returns 200 and healthy DB status
  test('9. GET /health returns 200 and healthy DB status', async () => {
    const res = await request(app).get('/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
    assert.equal(res.body.database, 'connected');
    assert.equal(res.body.service, 'news-pulse-backend');
    assert.ok(res.body.timestamp);
  });

  // 10. Concurrency guard returns 409 if a job is already in progress
  test('10. Concurrency guard returns 409 if a job is already in progress', async () => {
    // Because createdJobId is currently in 'queued' status from test 6, another trigger must be rejected
    const res = await request(app).post('/ingest/trigger');

    assert.equal(res.status, 409);
    assert.ok(res.body.error, 'Response must have structured error');
    assert.equal(res.body.error.code, 'CONCURRENT_JOB_RUNNING');
    assert.equal(res.body.error.jobId, createdJobId);

    // Bypassing concurrency guard with force=true must succeed
    const forceRes = await request(app).post('/ingest/trigger').send({ force: true });
    assert.equal(forceRes.status, 202);
    assert.ok(forceRes.body.jobId);
    createdTestJobIds.push(forceRes.body.jobId);
  });

  // 11. HttpIngestionRunner correctly attaches authentication headers and target URL
  test('11. HttpIngestionRunner attaches authentication headers and triggers remote endpoint', async () => {
    const { HttpIngestionRunner } = await import('../src/services/ingestion/http.runner');
    const { config } = await import('../src/config');

    const originalUrl = config.scraperServiceUrl;
    const originalSecret = config.ingestionServiceSecret;

    try {
      config.scraperServiceUrl = 'https://mock-scraper.onrender.com';
      config.ingestionServiceSecret = 'test-secret-key-123';

      let capturedUrl = '';
      let capturedHeaders: any = {};
      let capturedBody = '';

      // Mock global fetch
      const originalFetch = global.fetch;
      global.fetch = async (url: any, init: any) => {
        capturedUrl = url.toString();
        capturedHeaders = init?.headers || {};
        capturedBody = init?.body || '';
        return new Response(JSON.stringify({ jobId: 'test-job', status: 'accepted' }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        });
      };

      const runner = new HttpIngestionRunner();
      await runner.trigger('test-job-999');

      assert.equal(capturedUrl, 'https://mock-scraper.onrender.com/run');
      assert.equal(capturedHeaders['X-Ingestion-Secret'], 'test-secret-key-123');
      assert.equal(capturedHeaders['Authorization'], 'Bearer test-secret-key-123');
      assert.equal(JSON.parse(capturedBody).jobId, 'test-job-999');

      global.fetch = originalFetch;
    } finally {
      config.scraperServiceUrl = originalUrl;
      config.ingestionServiceSecret = originalSecret;
    }
  });

  // 12. HttpIngestionRunner throws if SCRAPER_SERVICE_URL is missing
  test('12. HttpIngestionRunner throws error if SCRAPER_SERVICE_URL is missing', async () => {
    const { HttpIngestionRunner } = await import('../src/services/ingestion/http.runner');
    const { config } = await import('../src/config');

    const originalUrl = config.scraperServiceUrl;
    config.scraperServiceUrl = '';

    const runner = new HttpIngestionRunner();
    await assert.rejects(
      async () => runner.trigger('job_missing_url'),
      /SCRAPER_SERVICE_URL environment variable is required/
    );

    config.scraperServiceUrl = originalUrl;
  });

  // 13. GET /articles returns paginated article summaries with category and imageUrl
  test('13. GET /articles returns paginated article summaries with category and imageUrl', async () => {
    const res = await request(app).get('/articles?limit=5');

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data), 'res.body.data must be an array');
    assert.ok(typeof res.body.total === 'number');
    assert.equal(res.body.limit, 5);

    if (res.body.data.length > 0) {
      const art = res.body.data[0];
      assert.ok(art.id);
      assert.ok(art.title);
      assert.ok(art.source);
      assert.ok(art.category);
      assert.ok(art.publishedAt);
    }
  });

  // 14. GET /articles/:id returns full article content and related stories
  test('14. GET /articles/:id returns full article content and related stories', async () => {
    // Get a valid article ID first
    const listRes = await request(app).get('/articles?limit=1');
    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.data.length > 0);

    const targetId = listRes.body.data[0].id;
    const res = await request(app).get(`/articles/${targetId}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.id, targetId);
    assert.ok(res.body.title);
    assert.ok(res.body.content);
    assert.ok(res.body.category);
    assert.ok(Array.isArray(res.body.relatedArticles));

    // Invalid ID returns 400
    const invalidRes = await request(app).get('/articles/invalid-id');
    assert.equal(invalidRes.status, 400);

    // Non-existent ID returns 404
    const notFoundRes = await request(app).get('/articles/6ab0fcff1217e89e4ad454a3');
    assert.equal(notFoundRes.status, 404);
  });

  // 15. GET /articles/search?q=... returns matching search results
  test('15. GET /articles/search?q=... returns matching search results', async () => {
    const res = await request(app).get('/articles/search?q=election');

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(typeof res.body.total === 'number');
    assert.equal(res.body.query, 'election');
  });

  // 15a. Search tests: single keyword
  test('15a. GET /articles/search?q=technology matches single keyword', async () => {
    const res = await request(app).get('/articles/search?q=technology');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.query, 'technology');
  });

  // 15b. Search tests: multi-word query
  test('15b. GET /articles/search?q=artificial+intelligence handles multi-word query', async () => {
    const res = await request(app).get('/articles/search?q=artificial%20intelligence');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.query, 'artificial intelligence');
  });

  // 15c. Search tests: empty query
  test('15c. GET /articles/search with empty query returns 0 results cleanly', async () => {
    const res = await request(app).get('/articles/search?q=');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 0);
    assert.deepEqual(res.body.data, []);
  });

  // 15d. Search tests: special characters
  test('15d. GET /articles/search handles regex special characters safely', async () => {
    const res = await request(app).get('/articles/search?q=(test)+[bracket]*?^$');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  // 15e. Search tests: no results query
  test('15e. GET /articles/search returns empty list for non-existent terms', async () => {
    const res = await request(app).get('/articles/search?q=xyznonexistentterm987654');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 0);
    assert.equal(res.body.data.length, 0);
  });

  // 16. GET /categories returns distinct category counts
  test('16. GET /categories returns distinct category counts', async () => {
    const res = await request(app).get('/categories');

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length > 0);
    assert.ok(res.body[0].name);
    assert.ok(typeof res.body[0].count === 'number');
  });

  // 17. GET /ingest/latest returns latest ingestion status
  test('17. GET /ingest/latest returns latest ingestion status', async () => {
    const res = await request(app).get('/ingest/latest');
    assert.equal(res.status, 200);
    assert.ok(res.body.jobId || res.body.message);
  });
});
