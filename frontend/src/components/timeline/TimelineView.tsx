'use client';

import React, { useMemo, useState } from 'react';
import { TimelineItem } from '@/lib/types';
import { TimelineAxis } from './TimelineAxis';
import { TimelineBlock } from './TimelineBlock';
import { formatDate } from '@/lib/formatters';
import { Filter } from 'lucide-react';

interface TimelineViewProps {
  clusters: TimelineItem[];
  selectedClusterId?: string | null;
  onSelectCluster: (id: string) => void;
  isLoading?: boolean;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  clusters,
  selectedClusterId,
  onSelectCluster,
  isLoading = false,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'multi'>('all');

  // Filter clusters based on active mode
  const displayedClusters = useMemo(() => {
    if (filterMode === 'multi') {
      return clusters.filter((c) => c.articleCount >= 2);
    }
    return clusters;
  }, [clusters, filterMode]);

  // Compute timeline boundaries and intelligent multi-lane packing
  const { lanes, paddedMin, paddedMax, tickCount, spanDescription } = useMemo(() => {
    if (!displayedClusters || displayedClusters.length === 0) {
      const now = Date.now();
      return {
        lanes: [] as TimelineItem[][],
        paddedMin: now - 86400000,
        paddedMax: now,
        tickCount: 5,
        spanDescription: 'No active stories',
      };
    }

    const sorted = [...displayedClusters].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const times = sorted.flatMap((c) => [
      new Date(c.startTime).getTime(),
      new Date(c.endTime).getTime(),
    ]);

    const rawMin = Math.min(...times);
    const rawMax = Math.max(...times);
    const rawSpan = Math.max(rawMax - rawMin, 3600000 * 6); // At least 6 hours span

    // Pad edges by 2.5%
    const paddingMs = Math.max(rawSpan * 0.025, 3600000);
    const min = rawMin - paddingMs;
    const max = rawMax + paddingMs;
    const totalSpan = max - min;

    // Multi-lane packing algorithm:
    // Multi-article clusters claim wider visual space, while singletons take minimal space
    const packedLanes: TimelineItem[][] = [];
    const laneEndTimes: number[] = [];

    for (const cluster of sorted) {
      const start = new Date(cluster.startTime).getTime();
      const isMulti = cluster.articleCount > 1;

      // Singletons need only 45m buffer; multi-article clusters need buffer proportional to span
      const visualBufferMs = isMulti
        ? Math.max((new Date(cluster.endTime).getTime() - start) + (totalSpan * 0.08), 3600000 * 2)
        : Math.max(totalSpan * 0.02, 3600000 / 2);

      const end = Math.max(new Date(cluster.endTime).getTime(), start) + visualBufferMs;

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

    const spanText = `${formatDate(new Date(rawMin).toISOString())} – ${formatDate(
      new Date(rawMax).toISOString()
    )}`;

    return {
      lanes: packedLanes,
      paddedMin: min,
      paddedMax: max,
      tickCount: 6,
      spanDescription: spanText,
    };
  }, [displayedClusters]);

  if (isLoading) {
    return (
      <section className="bg-white rounded-xs border border-stone-200 shadow-xs p-6 space-y-4 animate-pulse">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="h-5 bg-stone-200 rounded w-48" />
          <div className="h-4 bg-stone-200 rounded w-28" />
        </div>
        <div className="h-8 bg-stone-100 rounded w-full" />
        <div className="space-y-2 pt-2">
          <div className="h-10 bg-stone-100 rounded w-full" />
          <div className="h-10 bg-stone-100 rounded w-full" />
          <div className="h-10 bg-stone-100 rounded w-full" />
        </div>
      </section>
    );
  }

  const multiCount = clusters.filter((c) => c.articleCount >= 2).length;

  return (
    <section className="bg-white rounded-xs border border-stone-200 shadow-xs overflow-hidden scroll-mt-24">
      {/* Timeline Controls & Legend Header */}
      <div className="p-4 sm:p-5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-4 bg-stone-50/80">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-stone-900">
              Chronological Thread Canvas
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[11px] font-bold font-mono bg-stone-200 text-stone-800">
              {displayedClusters.length} {displayedClusters.length === 1 ? 'cluster' : 'clusters'}
            </span>
          </div>
          <p className="text-xs text-stone-600 mt-0.5">
            Coverage window: <span className="font-medium text-stone-900">{spanDescription}</span>
          </p>
        </div>

        {/* Story Focus Filter & Visual Legend */}
        <div className="flex items-center gap-3 flex-wrap text-xs">
          {/* View Filter Pill */}
          <div className="inline-flex rounded-xs border border-stone-300 p-0.5 bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-xs transition cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All Stories ({clusters.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('multi')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-xs transition cursor-pointer flex items-center gap-1 ${
                filterMode === 'multi'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>Developing Only ({multiCount})</span>
            </button>
          </div>

          {/* Visual Legend */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-stone-600 bg-white px-3 py-1.5 rounded-xs border border-stone-200">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-900" />
              <span className="text-[11px]">4+ stories</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-500" />
              <span className="text-[11px]">2–3 stories</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white border border-stone-400" />
              <span className="text-[11px]">Single story</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Scrollable Canvas */}
      {displayedClusters.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-sm font-medium text-stone-700">No stories match your current filter.</p>
          <p className="text-xs text-stone-500 mt-1">Try switching to &ldquo;All Stories&rdquo; or adjusting your publisher selection.</p>
        </div>
      ) : (
        <div className="overflow-x-auto p-4 sm:p-6 bg-white">
          <div className="min-w-[900px] relative">
            {/* Chronological Time Axis Header */}
            <TimelineAxis minTime={paddedMin} maxTime={paddedMax} tickCount={tickCount} />

            {/* Visual Guidelines Layer */}
            <div className="absolute inset-0 top-8 pointer-events-none grid grid-cols-6 divide-x divide-stone-100 opacity-80" />

            {/* Multi-Lane Clustered Rows */}
            <div className="pt-3 pb-2 space-y-2 relative">
              {lanes.map((laneClusters, laneIndex) => (
                <div
                  key={laneIndex}
                  className="relative h-9 w-full rounded-xs hover:bg-stone-50/70 transition-colors"
                >
                  {laneClusters.map((cluster) => (
                    <TimelineBlock
                      key={cluster.id}
                      cluster={cluster}
                      minTime={paddedMin}
                      maxTime={paddedMax}
                      isSelected={selectedClusterId === cluster.id}
                      onSelect={onSelectCluster}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
