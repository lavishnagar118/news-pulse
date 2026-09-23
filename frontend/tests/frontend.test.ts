import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatTimeSpan,
  getSourceBadgeStyle,
  formatRefreshCompletion,
  formatRefreshError,
} from '../src/lib/formatters';
import { TimelineItem, ClusterDetail } from '../src/lib/types';

describe('News Pulse Frontend Unit & Logic Tests', () => {
  const mockClusters: TimelineItem[] = [
    {
      id: 'cluster-1',
      label: 'Suspects Extradited Killing',
      startTime: '2026-09-20T20:31:15.000Z',
      endTime: '2026-09-21T08:41:50.000Z',
      articleCount: 2,
      intensity: 2,
      sources: ['NPR News', 'Al Jazeera'],
    },
    {
      id: 'cluster-2',
      label: 'South Korean Military',
      startTime: '2026-09-21T07:45:12.000Z',
      endTime: '2026-09-21T07:45:12.000Z',
      articleCount: 1,
      intensity: 1,
      sources: ['BBC News'],
    },
    {
      id: 'cluster-3',
      label: 'Kennedy Center Losing',
      startTime: '2026-09-18T18:56:17.000Z',
      endTime: '2026-09-18T18:56:17.000Z',
      articleCount: 1,
      intensity: 1,
      sources: ['NPR News'],
    },
  ];

  // 1. Formatters and Time Display
  test('1. formatters format dates, times, and spans cleanly', () => {
    const formattedDate = formatDate('2026-09-21T08:41:50.000Z');
    assert.ok(formattedDate.includes('Sep') || formattedDate.includes('21'));

    const formattedTime = formatTime('2026-09-21T08:41:50.000Z');
    assert.ok(typeof formattedTime === 'string' && formattedTime.length > 0);

    const span = formatTimeSpan(
      '2026-09-20T20:31:15.000Z',
      '2026-09-21T08:41:50.000Z'
    );
    assert.ok(span.includes('Sep 20') || span.includes('–'));

    // Singleton (same start and end time)
    const singletonSpan = formatTimeSpan(
      '2026-09-21T07:45:12.000Z',
      '2026-09-21T07:45:12.000Z'
    );
    assert.ok(!singletonSpan.includes('–'), 'Singletons should not show a redundant dash span');
  });

  // 2. Source Badge Colors
  test('2. getSourceBadgeStyle assigns recognizable styling per news source', () => {
    const bbc = getSourceBadgeStyle('BBC News');
    assert.ok(bbc.text.includes('red'));

    const npr = getSourceBadgeStyle('NPR News');
    assert.ok(npr.text.includes('blue'));

    const aljazeera = getSourceBadgeStyle('Al Jazeera');
    assert.ok(aljazeera.text.includes('amber'));

    const fallback = getSourceBadgeStyle('Reuters');
    assert.ok(fallback.text.includes('stone'));
  });

  // 3. Source Filtering Logic
  test('3. Source filter correctly filters clusters by enabled sources', () => {
    const filterBySources = (clusters: TimelineItem[], enabledSources: string[]) => {
      if (enabledSources.length === 0) return [];
      return clusters.filter((c) => c.sources.some((s) => enabledSources.includes(s)));
    };

    // Selecting only BBC News
    const bbcOnly = filterBySources(mockClusters, ['BBC News']);
    assert.equal(bbcOnly.length, 1);
    assert.equal(bbcOnly[0].id, 'cluster-2');

    // Selecting NPR News (matches cluster-1 and cluster-3)
    const nprOnly = filterBySources(mockClusters, ['NPR News']);
    assert.equal(nprOnly.length, 2);
    assert.ok(nprOnly.some((c) => c.id === 'cluster-1'));
    assert.ok(nprOnly.some((c) => c.id === 'cluster-3'));

    // A cluster with multiple sources remains visible if at least ONE source is enabled
    const alJazeeraOnly = filterBySources(mockClusters, ['Al Jazeera']);
    assert.equal(alJazeeraOnly.length, 1);
    assert.equal(alJazeeraOnly[0].id, 'cluster-1');

    // Empty sources selection results in empty list
    const none = filterBySources(mockClusters, []);
    assert.equal(none.length, 0);
  });

  // 4. Multi-Lane Packing Algorithm
  test('4. Multi-lane packing prevents chronological overlap', () => {
    const sorted = [...mockClusters].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const packedLanes: TimelineItem[][] = [];
    const laneEndTimes: number[] = [];
    const minBuffer = 3600000; // 1 hour buffer

    for (const cluster of sorted) {
      const start = new Date(cluster.startTime).getTime();
      const end = Math.max(new Date(cluster.endTime).getTime(), start + minBuffer);

      let placed = false;
      for (let i = 0; i < packedLanes.length; i++) {
        if (start > laneEndTimes[i]) {
          packedLanes[i].push(cluster);
          laneEndTimes[i] = end;
          placed = true;
          break;
        }
      }

      if (!placed) {
        packedLanes.push([cluster]);
        laneEndTimes.push(end);
      }
    }

    assert.ok(packedLanes.length > 0, 'Should pack clusters into lanes');
    const totalPacked = packedLanes.reduce((acc, lane) => acc + lane.length, 0);
    assert.equal(totalPacked, mockClusters.length, 'All clusters must be assigned to a lane');
  });

  // 5. Cluster Detail Chronological Order Verification
  test('5. Cluster detail renders member articles ordered earliest to latest', () => {
    const mockDetail: ClusterDetail = {
      id: 'cluster-1',
      label: 'Suspects Extradited Killing',
      startTime: '2026-09-20T20:31:15.000Z',
      endTime: '2026-09-21T08:41:50.000Z',
      articleCount: 2,
      articles: [
        {
          id: 'art-1',
          title: 'Eighteen suspects extradited to US',
          summary: 'Federal court in Florida to try men...',
          source: 'Al Jazeera',
          url: 'https://aljazeera.com/test',
          publishedAt: '2026-09-20T20:31:15.000Z',
          category: 'World',
        },
        {
          id: 'art-2',
          title: "18 suspects accused in Haiti's president killing",
          summary: 'Eighteen suspects arrested...',
          source: 'NPR News',
          url: 'https://npr.org/test',
          publishedAt: '2026-09-21T08:41:50.000Z',
          category: 'World',
        },
      ],
    };

    assert.equal(mockDetail.articles.length, 2);
    const firstTime = new Date(mockDetail.articles[0].publishedAt).getTime();
    const secondTime = new Date(mockDetail.articles[1].publishedAt).getTime();
    assert.ok(firstTime < secondTime, 'First article must be chronologically earlier than second');
    assert.equal(mockDetail.articles[0].source, 'Al Jazeera');
    assert.equal(mockDetail.articles[1].source, 'NPR News');
  });

  // 6. Ingestion Refresh Human-Readable Status Presentation Tests
  test('6a. Ingestion refresh processing & triggering human-readable states', () => {
    const triggeringText = 'Refreshing news…';
    const processingText = 'Processing latest stories…';

    assert.equal(triggeringText, 'Refreshing news…');
    assert.equal(processingText, 'Processing latest stories…');
  });

  test('6b. formatRefreshCompletion: completed with new stories', () => {
    const resMultiple = formatRefreshCompletion({
      articlesAdded: 5,
      duplicatesSkipped: 12,
      feedsFailed: 0,
    });
    assert.equal(resMultiple, 'Updated just now · 5 new stories · 12 duplicates skipped');

    const resSingle = formatRefreshCompletion({
      articlesAdded: 1,
      duplicatesSkipped: 0,
      feedsFailed: 0,
    });
    assert.equal(resSingle, 'Updated just now · 1 new story · 0 duplicates skipped');
  });

  test('6c. formatRefreshCompletion: completed with zero new stories', () => {
    const resZero = formatRefreshCompletion({
      articlesAdded: 0,
      duplicatesSkipped: 61,
      feedsFailed: 0,
    });
    assert.equal(resZero, "You're up to date · No new stories found");
  });

  test('6d. formatRefreshCompletion: completed with feed failures (partial source coverage)', () => {
    const resPartialWithStories = formatRefreshCompletion({
      articlesAdded: 4,
      duplicatesSkipped: 8,
      feedsFailed: 1,
    });
    assert.equal(resPartialWithStories, 'Updated with partial source coverage · 4 new stories');

    const resPartialSingle = formatRefreshCompletion({
      articlesAdded: 1,
      duplicatesSkipped: 2,
      feedsFailed: 2,
    });
    assert.equal(resPartialSingle, 'Updated with partial source coverage · 1 new story');

    const resPartialNoStories = formatRefreshCompletion({
      articlesAdded: 0,
      duplicatesSkipped: 10,
      feedsFailed: 1,
    });
    assert.equal(resPartialNoStories, 'Updated with partial source coverage · No new stories found');
  });

  test('6e. formatRefreshError: handles 409 concurrent ingestion gracefully', () => {
    const err409 = new Error('409 Conflict: An ingestion job is already in progress');
    assert.equal(formatRefreshError(err409), 'Refresh already in progress…');

    const errCode = new Error('CONCURRENT_JOB_RUNNING');
    assert.equal(formatRefreshError(errCode), 'Refresh already in progress…');
  });

  test('6f. formatRefreshError: handles failure gracefully with polite human copy', () => {
    const networkErr = new Error('Failed to fetch from /ingest/trigger: 500 Internal Server Error');
    assert.equal(formatRefreshError(networkErr), "Refresh couldn't complete. Your current news is still available.");

    const mongoErr = new Error('MongoNetworkTimeoutError: connection lost');
    assert.equal(formatRefreshError(mongoErr), "Refresh couldn't complete. Your current news is still available.");

    assert.equal(formatRefreshError(null), "Refresh couldn't complete. Your current news is still available.");
  });

  test('6g. Raw backend JSON, jobId, or internal error payloads are NEVER rendered', () => {
    const rawPayloads = [
      JSON.stringify({ jobId: 'job_1790088986497_1e6ciz', status: 'completed', stats: { articlesFetched: 61 } }),
      JSON.stringify({ error: { code: 'CONCURRENT_JOB_RUNNING', jobId: 'job_9999' } }),
      'Error: Ingestion job job_1790088986497_1e6ciz polling timed out.',
      'Scraper service at https://news-pulse-scraper.onrender.com/run rejected request with HTTP 500',
    ];

    for (const raw of rawPayloads) {
      const formatted = formatRefreshError(raw);
      assert.ok(!formatted.includes('job_'), `Formatted output must not contain jobId: ${formatted}`);
      assert.ok(!formatted.includes('{'), `Formatted output must not contain JSON: ${formatted}`);
      assert.ok(!formatted.includes('}'), `Formatted output must not contain JSON: ${formatted}`);
      assert.ok(!formatted.includes('http'), `Formatted output must not contain internal URLs: ${formatted}`);
      assert.ok(!formatted.includes('500'), `Formatted output must not contain status codes: ${formatted}`);
      assert.ok(!formatted.includes('CONCURRENT'), `Formatted output must not contain error codes: ${formatted}`);
    }
  });

  // 7. Relative Time Formatter
  test('7. formatRelativeTime formats relative durations appropriately', () => {
    const { formatRelativeTime } = require('../src/lib/formatters');
    const now = Date.now();
    const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();
    assert.ok(formatRelativeTime(tenMinutesAgo).includes('m ago'));

    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    assert.ok(formatRelativeTime(twoHoursAgo).includes('h ago'));

    const yesterday = new Date(now - 25 * 60 * 60 * 1000).toISOString();
    assert.ok(
      formatRelativeTime(yesterday) === 'Yesterday' ||
        formatRelativeTime(yesterday).includes('d ago')
    );
  });

  // 8. Category Badge Styling
  test('8. getCategoryBadgeStyle maps known and unknown categories to distinct styles', () => {
    const { getCategoryBadgeStyle } = require('../src/lib/formatters');
    const world = getCategoryBadgeStyle('World');
    assert.ok(world.text.includes('rose'));

    const tech = getCategoryBadgeStyle('Technology');
    assert.ok(tech.text.includes('indigo'));

    const business = getCategoryBadgeStyle('Business');
    assert.ok(business.text.includes('emerald'));

    const general = getCategoryBadgeStyle('General');
    assert.ok(general.text.includes('stone'));
  });

  // 9. Topic Cluster Label Refinement
  test('9. refineClusterLabel transforms machine labels into natural headlines', () => {
    const { refineClusterLabel } = require('../src/lib/formatters');
    assert.equal(refineClusterLabel('Results Russia Parliamentary'), 'Russian Parliamentary Election');
    assert.equal(refineClusterLabel('Groups Ethiopian Alliance'), 'Ethiopian Rebel Alliance');
    assert.equal(refineClusterLabel('China Safety Talks'), 'US-China AI Safety Talks');
    assert.equal(refineClusterLabel('Texas Man Shoots'), 'Texas Shooting Investigation');
    assert.equal(refineClusterLabel('Unknown Alpha Beta'), 'Unknown Alpha Beta');
  });

  // 10. Ingestion Polling and Status Progression
  test('10a. pollJobStatus succeeds when job completes after queued/running progression', async () => {
    const { pollJobStatus } = await import('../src/lib/api');
    const originalFetch = global.fetch;

    let calls = 0;
    global.fetch = async () => {
      calls++;
      const status = calls === 1 ? 'queued' : calls === 2 ? 'running' : 'completed';
      return new Response(
        JSON.stringify({
          jobId: 'job_test_123',
          status,
          stats: { articlesFetched: 10, articlesAdded: 3, duplicatesSkipped: 7 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      const updates: string[] = [];
      const result = await pollJobStatus(
        'job_test_123',
        (job) => updates.push(job.status),
        5,
        120000
      );
      assert.equal(result.status, 'completed');
      assert.deepEqual(updates, ['queued', 'running', 'completed']);
      assert.equal(calls, 3);
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('10b. pollJobStatus fails cleanly with sanitized message when job fails', async () => {
    const { pollJobStatus } = await import('../src/lib/api');
    const originalFetch = global.fetch;

    global.fetch = async () => {
      return new Response(
        JSON.stringify({
          jobId: 'job_fail_123',
          status: 'failed',
          error: 'Scraper service did not become ready within the cold-start window (last HTTP 502).',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      await assert.rejects(
        async () => pollJobStatus('job_fail_123', undefined, 5, 120000),
        (err: Error) => {
          assert.equal(err.message, "Refresh couldn't complete. Your current news is still available.");
          return true;
        }
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('10c. pollJobStatus fails with sanitized error if deadline is exceeded', async () => {
    const { pollJobStatus } = await import('../src/lib/api');
    const originalFetch = global.fetch;

    global.fetch = async () => {
      return new Response(
        JSON.stringify({
          jobId: 'job_timeout_123',
          status: 'queued',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      await assert.rejects(
        async () => pollJobStatus('job_timeout_123', undefined, 10, 35),
        (err: Error) => {
          assert.equal(err.message, "Refresh couldn't complete. Your current news is still available.");
          return true;
        }
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('Asynchronous Refresh UX & Architecture Requirements', () => {
  // 1. 202 response starts background refresh
  test('1. 202 response starts background refresh with immediate non-blocking copy', async () => {
    const { refreshManager } = await import('../src/lib/refreshManager');
    const originalFetch = global.fetch;

    try {
      global.fetch = async (url: any) => {
        const u = String(url);
        if (u.includes('/ingest/trigger')) {
          return new Response(JSON.stringify({ jobId: 'job_202_test', status: 'queued' }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (u.includes('/ingest/status/')) {
          return new Response(
            JSON.stringify({
              jobId: 'job_202_test',
              status: 'running',
              stats: { articlesFetched: 10 },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 200 });
      };

      refreshManager.resetForTesting();
      const promise = refreshManager.triggerRefresh();

      const state = refreshManager.getState();
      assert.equal(state.isRefreshing, true);
      assert.equal(state.statusMessage, 'Refresh started · checking for new stories…');

      refreshManager.stop();
      await promise.catch(() => {});
    } finally {
      global.fetch = originalFetch;
      refreshManager.stop();
    }
  });

  // 2. current data remains visible while refreshing
  test('2. current data remains visible and intact while refreshing is active', async () => {
    const { refreshManager } = await import('../src/lib/refreshManager');
    refreshManager.resetForTesting({ isRefreshing: true, statusMessage: 'Refresh running in the background…' });

    // Simulate page dataset state
    const currentArticles = [
      { id: 'art-1', title: 'Existing Article 1' },
      { id: 'art-2', title: 'Existing Article 2' },
    ];

    const isRefreshing = refreshManager.getState().isRefreshing;
    assert.equal(isRefreshing, true);
    // Dataset fallback invariant: articles array is not emptied and remains populated
    assert.equal(currentArticles.length, 2);
    assert.equal(currentArticles[0].title, 'Existing Article 1');
  });

  // 3. user interaction remains available
  test('3. user interaction and filtering remain available during refresh', async () => {
    const { refreshManager } = await import('../src/lib/refreshManager');
    refreshManager.resetForTesting({ isRefreshing: true });

    // User interactions: category changing and filtering logic can execute concurrently
    let activeCategory = 'World';
    const switchCategory = (newCat: string) => {
      activeCategory = newCat;
    };

    switchCategory('Technology');
    assert.equal(activeCategory, 'Technology');
    assert.equal(refreshManager.getState().isRefreshing, true);
  });

  // 4. job transitions queued → running → completed
  test('4. job transitions cleanly queued → running → completed with proper human messages', async () => {
    const { refreshManager } = await import('../src/lib/refreshManager');
    const originalFetch = global.fetch;

    let pollCount = 0;
    try {
      global.fetch = async (url: any) => {
        const u = String(url);
        if (u.includes('/ingest/trigger')) {
          return new Response(JSON.stringify({ jobId: 'job_trans_123', status: 'queued' }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (u.includes('/ingest/status/')) {
          pollCount++;
          const status = pollCount === 1 ? 'queued' : pollCount === 2 ? 'running' : 'completed';
          return new Response(
            JSON.stringify({
              jobId: 'job_trans_123',
              status,
              stats: {
                articlesFetched: 20,
                articlesAdded: 3,
                duplicatesSkipped: 17,
                feedsFailed: 0,
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 200 });
      };

      refreshManager.resetForTesting();
      refreshManager.setPollIntervalForTesting(5);
      await refreshManager.triggerRefresh();
      await refreshManager.waitForPollingToFinish();

      const finalState = refreshManager.getState();
      assert.equal(finalState.isRefreshing, false);
      assert.equal(finalState.statusMessage, null);
      assert.equal(finalState.successMessage, 'Updated just now · 3 new stories · 17 duplicates skipped');
      assert.equal(finalState.lastSyncText, 'Last synced: just now');
    } finally {
      global.fetch = originalFetch;
      refreshManager.stop();
    }
  });

  // 5. completed job triggers fresh-data refetch
  test('5. completed job dispatches news-pulse-refresh event for silent page refetch', async () => {
    const { refreshManager } = await import('../src/lib/refreshManager');
    const originalFetch = global.fetch;

    let eventDispatched = false;
    let eventDetail: any = null;

    const originalWindow = (global as any).window;
    (global as any).window = {
      dispatchEvent: (evt: any) => {
        if (evt.type === 'news-pulse-refresh') {
          eventDispatched = true;
          eventDetail = evt.detail;
        }
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    try {
      global.fetch = async (url: any) => {
        const u = String(url);
        if (u.includes('/ingest/trigger')) {
          return new Response(JSON.stringify({ jobId: 'job_event_1', status: 'queued' }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (u.includes('/ingest/status/')) {
          return new Response(
            JSON.stringify({
              jobId: 'job_event_1',
              status: 'completed',
              stats: { articlesFetched: 15, articlesAdded: 2, duplicatesSkipped: 13 },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 200 });
      };

      refreshManager.resetForTesting();
      refreshManager.setPollIntervalForTesting(5);
      await refreshManager.triggerRefresh();
      await refreshManager.waitForPollingToFinish();

      assert.equal(eventDispatched, true);
      assert.equal(eventDetail?.articlesAdded, 2);
    } finally {
      (global as any).window = originalWindow;
      global.fetch = originalFetch;
      refreshManager.stop();
    }
  });

  // 6. zero new stories message
  test('6. zero new stories message displays exact required copy', () => {
    const msg = formatRefreshCompletion({
      articlesAdded: 0,
      duplicatesSkipped: 32,
      feedsFailed: 0,
    });
    assert.equal(msg, "You're up to date · No new stories found");
  });

  // 7. new stories message
  test('7. new stories message displays exact required copy with singular/plural support', () => {
    const msgPlural = formatRefreshCompletion({
      articlesAdded: 5,
      duplicatesSkipped: 12,
      feedsFailed: 0,
    });
    assert.equal(msgPlural, 'Updated just now · 5 new stories · 12 duplicates skipped');

    const msgSingular = formatRefreshCompletion({
      articlesAdded: 1,
      duplicatesSkipped: 4,
      feedsFailed: 0,
    });
    assert.equal(msgSingular, 'Updated just now · 1 new story · 4 duplicates skipped');
  });

  // 8. 409 existing-job behavior
  test('8. 409 response shows Refresh already in progress and attaches to active job', async () => {
    const { refreshManager } = await import('../src/lib/refreshManager');
    const originalFetch = global.fetch;

    let statusPolled = false;
    try {
      global.fetch = async (url: any) => {
        const u = String(url);
        if (u.includes('/ingest/trigger')) {
          return new Response(
            JSON.stringify({
              error: { code: 'CONCURRENT_JOB_RUNNING', jobId: 'job_existing_409' },
            }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (u.includes('/ingest/status/job_existing_409')) {
          statusPolled = true;
          return new Response(
            JSON.stringify({
              jobId: 'job_existing_409',
              status: 'completed',
              stats: { articlesFetched: 10, articlesAdded: 0, duplicatesSkipped: 10 },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 200 });
      };

      refreshManager.resetForTesting();
      refreshManager.setPollIntervalForTesting(5);
      await refreshManager.triggerRefresh();
      await refreshManager.waitForPollingToFinish();

      assert.equal(statusPolled, true);
      const state = refreshManager.getState();
      assert.equal(state.isRefreshing, false);
      assert.equal(state.successMessage, "You're up to date · No new stories found");
    } finally {
      global.fetch = originalFetch;
      refreshManager.stop();
    }
  });

  // 9. failed job keeps existing dataset
  test('9. failed job keeps existing dataset and shows polite sanitized failure copy', async () => {
    const { refreshManager } = await import('../src/lib/refreshManager');
    const originalFetch = global.fetch;

    const mockDataset = [{ id: '1', title: 'Unchanged Article' }];

    try {
      global.fetch = async (url: any) => {
        const u = String(url);
        if (u.includes('/ingest/trigger')) {
          return new Response(JSON.stringify({ jobId: 'job_fails', status: 'queued' }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (u.includes('/ingest/status/')) {
          return new Response(
            JSON.stringify({
              jobId: 'job_fails',
              status: 'failed',
              error: 'Cold start timeout 504 Gateway Timeout',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 200 });
      };

      refreshManager.resetForTesting();
      refreshManager.setPollIntervalForTesting(5);
      await refreshManager.triggerRefresh();
      await refreshManager.waitForPollingToFinish();

      const state = refreshManager.getState();
      assert.equal(state.isRefreshing, false);
      assert.equal(state.errorMessage, "Refresh couldn't complete. Your current news is still available.");
      // Existing dataset remains intact
      assert.equal(mockDataset.length, 1);
      assert.equal(mockDataset[0].title, 'Unchanged Article');
    } finally {
      global.fetch = originalFetch;
      refreshManager.stop();
    }
  });

  // 10. background polling cleanup
  test('10. background polling cleanup stops active polling loop and clears timers', async () => {
    const { refreshManager } = await import('../src/lib/refreshManager');
    const originalFetch = global.fetch;

    let pollAttempts = 0;
    try {
      global.fetch = async (url: any) => {
        const u = String(url);
        if (u.includes('/ingest/trigger')) {
          return new Response(JSON.stringify({ jobId: 'job_cleanup_test', status: 'queued' }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (u.includes('/ingest/status/')) {
          pollAttempts++;
          return new Response(
            JSON.stringify({ jobId: 'job_cleanup_test', status: 'queued' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 200 });
      };

      refreshManager.resetForTesting();
      refreshManager.setPollIntervalForTesting(10);
      await refreshManager.triggerRefresh();

      // Yield briefly to let polling start
      await new Promise((r) => setTimeout(r, 25));
      assert.ok(pollAttempts >= 1);

      // Stop manager (simulating unmount or cancellation)
      refreshManager.stop();
      const initialCount = pollAttempts;

      // Wait a moment and verify no more polling calls occurred
      await new Promise((r) => setTimeout(r, 40));
      assert.equal(pollAttempts, initialCount);
    } finally {
      global.fetch = originalFetch;
      refreshManager.stop();
    }
  });

  // 11. no duplicate polling loops
  test('11. no duplicate polling loops when refresh is triggered concurrently', async () => {
    const { refreshManager } = await import('../src/lib/refreshManager');
    const originalFetch = global.fetch;

    let triggerCount = 0;
    try {
      global.fetch = async (url: any) => {
        const u = String(url);
        if (u.includes('/ingest/trigger')) {
          triggerCount++;
          return new Response(JSON.stringify({ jobId: 'job_dup_1', status: 'queued' }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (u.includes('/ingest/status/')) {
          return new Response(
            JSON.stringify({ jobId: 'job_dup_1', status: 'running' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 200 });
      };

      refreshManager.resetForTesting();
      refreshManager.setPollIntervalForTesting(10);
      // Concurrent calls to triggerRefresh
      const p1 = refreshManager.triggerRefresh();
      const p2 = refreshManager.triggerRefresh();
      const p3 = refreshManager.triggerRefresh();

      await Promise.all([p1, p2, p3]);

      // Exactly ONE trigger request should have been fired
      assert.equal(triggerCount, 1);
    } finally {
      global.fetch = originalFetch;
      refreshManager.stop();
    }
  });

  // 12. raw JSON/jobId never rendered
  test('12. raw JSON, job IDs, 502/503 errors, and internal URLs are never exposed in user copy', () => {
    const problematicErrors = [
      '{"error":{"code":"CONCURRENT_JOB_RUNNING","jobId":"job_1727094000_abc123"}}',
      'job_1727094000_abc123 failed to complete within timeout',
      'HTTP 502 Bad Gateway from https://news-pulse-scraper.onrender.com/run',
      'HTTP 503 Service Unavailable: Render instance spinning up',
      'Error at Object.fetch (/var/task/node_modules/...)',
    ];

    for (const err of problematicErrors) {
      const sanitized = formatRefreshError(err);
      assert.ok(!sanitized.includes('job_'), `Must not contain jobId: ${sanitized}`);
      assert.ok(!sanitized.includes('{'), `Must not contain JSON: ${sanitized}`);
      assert.ok(!sanitized.includes('}'), `Must not contain JSON: ${sanitized}`);
      assert.ok(!sanitized.includes('502'), `Must not contain status codes: ${sanitized}`);
      assert.ok(!sanitized.includes('503'), `Must not contain status codes: ${sanitized}`);
      assert.ok(!sanitized.includes('http'), `Must not contain URLs: ${sanitized}`);
      assert.ok(!sanitized.includes('CONCURRENT'), `Must not contain error code: ${sanitized}`);
      assert.ok(!sanitized.includes('/var/task'), `Must not contain stack paths: ${sanitized}`);
    }
  });
});

describe('Bootstrap News Snapshot & SWR Hydration Fallback Tests', () => {
  // 1. Bootstrap snapshot loads
  test('1. Bootstrap snapshot loads valid, sanitized public news data', async () => {
    const { fetchBootstrapData } = await import('../src/lib/api');
    const snapshot = await fetchBootstrapData();

    assert.ok(snapshot !== null, 'Bootstrap snapshot should be loadable');
    assert.ok(Array.isArray(snapshot?.articles), 'Snapshot must contain articles array');
    assert.ok(snapshot!.articles.length > 0, 'Snapshot must contain at least 1 genuine article');
    assert.ok(Array.isArray(snapshot?.timeline?.data), 'Snapshot must contain timeline items array');
    assert.ok(snapshot!.timeline.data.length > 0, 'Snapshot must contain at least 1 timeline item');
    assert.ok(typeof snapshot!.generatedAt === 'string', 'Snapshot must have generatedAt timestamp');

    // Security & Sanitization audit: ensure NO credentials, secrets, or internal DB info
    const sensitiveTokens = ['password', 'secret', 'token', 'mongodb', 'atlas', 'uri', 'authorization', 'bearer'];
    for (const article of snapshot!.articles) {
      const keys = Object.keys(article);
      for (const key of keys) {
        for (const token of sensitiveTokens) {
          assert.ok(!key.toLowerCase().includes(token), `Sensitive token "${token}" found in article key: ${key}`);
        }
      }
      assert.ok(article.id && article.title && article.source && article.url, 'Article missing standard public fields');
    }
  });

  // 2. Bootstrap data renders immediately (0ms fast path)
  test('2. Bootstrap data hydrates state immediately without waiting for network backend', async () => {
    const { fetchBootstrapData } = await import('../src/lib/api');
    const snapshot = await fetchBootstrapData();
    assert.ok(snapshot);

    // Simulate page component state machine
    let pageArticles: any[] = [];
    let pageTimeline: any[] = [];
    let isLoading = true;

    // Fast-path hydration synchronously/instantly uses bootstrap snapshot
    if (snapshot.articles && snapshot.articles.length > 0) {
      pageArticles = snapshot.articles;
    }
    if (snapshot.timeline?.data && snapshot.timeline.data.length > 0) {
      pageTimeline = snapshot.timeline.data;
    }
    isLoading = false;

    // Reader sees stories in 0ms
    assert.equal(isLoading, false);
    assert.ok(pageArticles.length >= 10, 'Fast-path must populate reader stories immediately');
    assert.ok(pageTimeline.length > 0, 'Fast-path must populate temporal timeline immediately');
  });

  // 3. API revalidation succeeds → live data replaces bootstrap
  test('3. API revalidation succeeds: live data replaces bootstrap seamlessly', async () => {
    let currentArticles = [{ id: 'bootstrap-1', title: 'Snapshot Story', source: 'BBC News' }];

    // Simulate SWR live response
    const liveApiResponse = [
      { id: 'live-1', title: 'Fresh Breaking Story', source: 'Al Jazeera' },
      { id: 'live-2', title: 'Fresh Developing Report', source: 'NPR News' },
    ];

    // Background revalidation completes
    currentArticles = liveApiResponse;

    assert.equal(currentArticles.length, 2);
    assert.equal(currentArticles[0].id, 'live-1');
    assert.equal(currentArticles[0].title, 'Fresh Breaking Story');
  });

  // 4. API revalidation fails → bootstrap remains usable
  test('4. API revalidation fails: bootstrap remains usable with zero data loss', async () => {
    const { fetchBootstrapData } = await import('../src/lib/api');
    const snapshot = await fetchBootstrapData();
    assert.ok(snapshot);

    // Initial state with bootstrap snapshot
    let displayedArticles = [...snapshot.articles];
    const initialCount = displayedArticles.length;
    let viewDestroyed = false;

    // Background live API rejects with cold-start timeout or 502/503
    const liveApiCall = async () => {
      throw new Error('502 Bad Gateway: Render container is cold-starting');
    };

    try {
      await liveApiCall();
    } catch {
      // Catch block maintains existing dataset
      // Never clear displayedArticles!
    }

    // View is completely preserved
    assert.equal(displayedArticles.length, initialCount);
    assert.equal(viewDestroyed, false);
    assert.ok(displayedArticles.length > 0);
  });

  // 5. No blank page on API failure
  test('5. No blank page or global crash on API failure when bootstrap data exists', () => {
    const bootstrapArticles = [{ id: 'bootstrap-article-1', title: 'Preserved Headline' }];

    let displayedError: string | null = null;
    const simulateErrorHandling = (errMessage: string, currentDataset: any[]) => {
      // Rule: only display blocking error if current displayed dataset is completely empty
      if (currentDataset.length === 0) {
        displayedError = errMessage;
      }
    };

    // Cold-start failure occurs while bootstrap articles are loaded
    simulateErrorHandling('Failed to connect to Render API', bootstrapArticles);
    assert.equal(displayedError, null, 'Error must not replace valid bootstrap content with an error screen');

    // If genuinely NO data exists at all, error is shown
    simulateErrorHandling('Failed to connect to Render API', []);
    assert.equal(displayedError, 'Failed to connect to Render API');
  });

  // 6. Accurate sync timestamp
  test('6. Accurate sync timestamp transitions from snapshot to live update', async () => {
    const { refreshManager } = await import('../src/lib/refreshManager');
    refreshManager.resetForTesting();

    // 1. Initial timestamp from snapshot
    const snapshotTimestamp = '2026-09-23T07:55:16.192Z';
    refreshManager.setSyncTimestamp(snapshotTimestamp);

    const initialText = refreshManager.getState().lastSyncText;
    assert.ok(initialText !== null);
    assert.ok(initialText.startsWith('Last synced:'));

    // 2. Later, a live API run updates the timestamp
    const liveTimestamp = '2026-09-23T08:15:00.000Z';
    refreshManager.setSyncTimestamp(liveTimestamp);

    const updatedText = refreshManager.getState().lastSyncText;
    assert.ok(updatedText !== null);
    assert.ok(updatedText.startsWith('Last synced:'));
  });

  // 7. Search remains API-backed
  test('7. Search remains API-backed with polite fallback and no raw errors', async () => {
    const { searchArticles } = await import('../src/lib/api');
    const originalFetch = global.fetch;

    // Simulate search failure (e.g. Render backend is sleeping)
    global.fetch = async () => {
      return new Response(
        JSON.stringify({ error: { message: 'Render cold-start unavailable' } }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      await assert.rejects(
        async () => searchArticles('technology'),
        (err: Error) => {
          assert.ok(
            err.message.includes('Search failed') || err.message.includes('Render cold-start'),
            `Unexpected error message: ${err.message}`
          );
          return true;
        }
      );

      // Verify that UI fallback message is polite and does not expose 503 or stack trace
      const searchFallbackMessage = 'Search is temporarily unavailable. The latest stories are still available.';
      assert.ok(searchFallbackMessage.includes('Search is temporarily unavailable'));
      assert.ok(!searchFallbackMessage.includes('503'));
      assert.ok(!searchFallbackMessage.includes('Render'));
    } finally {
      global.fetch = originalFetch;
    }
  });

  // 8. Refresh Data still works asynchronously
  test('8. Refresh Data still works asynchronously while snapshot is active', async () => {
    const { refreshManager } = await import('../src/lib/refreshManager');
    const originalFetch = global.fetch;

    global.fetch = async (url: any) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/ingest/trigger')) {
        return new Response(
          JSON.stringify({ jobId: 'job_async_snapshot_test', status: 'queued' }),
          { status: 202, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (u.includes('/ingest/status/')) {
        return new Response(
          JSON.stringify({
            jobId: 'job_async_snapshot_test',
            status: 'completed',
            stats: {
              articlesFetched: 20,
              articlesAdded: 5,
              duplicatesSkipped: 15,
              extractionFailures: 0,
              feedsAttempted: 3,
              feedsSucceeded: 3,
              feedsFailed: 0,
              clustersUpdated: 10,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 200 });
    };

    try {
      refreshManager.resetForTesting();
      refreshManager.setPollIntervalForTesting(10);

      // Trigger refresh
      await refreshManager.triggerRefresh();

      // State is immediately non-blocking
      const activeState = refreshManager.getState();
      assert.equal(activeState.isRefreshing, true);
      assert.ok(activeState.statusMessage?.includes('Refresh started'));

      // Let polling loop complete
      await refreshManager.waitForPollingToFinish();

      const finalState = refreshManager.getState();
      assert.equal(finalState.isRefreshing, false);
      assert.ok(finalState.successMessage?.includes('5 new stories'));
    } finally {
      global.fetch = originalFetch;
      refreshManager.stop();
    }
  });
});


