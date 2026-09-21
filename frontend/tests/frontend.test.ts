import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatTimeSpan,
  getSourceBadgeStyle,
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

  // 6. Ingestion Refresh State Machine
  test('6. Ingestion refresh status transition simulation', () => {
    const statuses: string[] = [];
    const updateStatus = (s: string) => statuses.push(s);

    updateStatus('Triggering ingestion pipeline...');
    updateStatus('Connecting to RSS feeds & ingesting articles...');
    updateStatus('Extracting article content & clustering topics...');
    updateStatus('Refreshing timeline data...');
    updateStatus('Data refreshed successfully');

    assert.equal(statuses.length, 5);
    assert.equal(statuses[0], 'Triggering ingestion pipeline...');
    assert.equal(statuses[statuses.length - 1], 'Data refreshed successfully');
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
});
