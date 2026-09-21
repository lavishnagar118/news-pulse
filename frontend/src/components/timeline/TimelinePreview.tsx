'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, Layers, Sparkles } from 'lucide-react';
import { TimelineItem } from '@/lib/types';
import { formatTimeSpan, refineClusterLabel, getSourceBadgeStyle } from '@/lib/formatters';

interface TimelinePreviewProps {
  clusters: TimelineItem[];
  onSelectCluster?: (id: string) => void;
}

export const TimelinePreview: React.FC<TimelinePreviewProps> = ({
  clusters,
  onSelectCluster,
}) => {
  if (!clusters || clusters.length === 0) return null;

  // Curate to multi-article clusters (articleCount >= 2) for high narrative signal
  const multiClusters = clusters.filter((c) => c.articleCount >= 2);
  const curated = (multiClusters.length >= 3 ? multiClusters : clusters).slice(0, 6);

  return (
    <section className="border-t-2 border-stone-900 pt-8" aria-label="Pulse Timeline Preview">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 mb-6 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Temporal Intelligence
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-black tracking-tight text-stone-900">
            PULSE TIMELINE
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-xl">
            See when major stories emerged, overlapped, and evolved across global newsrooms.
          </p>
        </div>

        <Link
          href="/timeline"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-stone-900 text-white rounded-xs hover:bg-stone-800 transition cursor-pointer shadow-xs self-start sm:self-end shrink-0"
        >
          <span>Explore full timeline</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Curated Topic Narrative Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {curated.map((cluster) => {
          const refined = refineClusterLabel(cluster.label);
          const isMulti = cluster.articleCount > 1;

          return (
            <div
              key={cluster.id}
              onClick={() => onSelectCluster && onSelectCluster(cluster.id)}
              className="group bg-white p-5 rounded-xs border border-stone-200 shadow-2xs hover:shadow-xs hover:border-stone-400 transition duration-200 flex flex-col justify-between cursor-pointer space-y-4"
            >
              <div className="space-y-2.5">
                {/* Meta Bar */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-wider text-stone-500">
                    <Layers className="w-3 h-3 text-amber-500" />
                    {isMulti ? `${cluster.articleCount} reports` : '1 report'}
                  </span>
                  <span className="text-[11px] text-stone-400 font-sans flex items-center gap-1">
                    <Clock className="w-3 h-3 text-stone-400" />
                    {formatTimeSpan(cluster.startTime, cluster.endTime)}
                  </span>
                </div>

                {/* Refined Headline */}
                <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 group-hover:text-stone-700 transition leading-snug">
                  {refined}
                </h3>
              </div>

              {/* Publisher Sources & Action */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(cluster.sources || []).slice(0, 3).map((source) => {
                    const badge = getSourceBadgeStyle(source);
                    return (
                      <span
                        key={source}
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-xs border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {source}
                      </span>
                    );
                  })}
                </div>

                <span className="text-xs font-semibold text-stone-900 group-hover:underline">
                  View thread &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Banner */}
      <div className="mt-8 p-4 bg-stone-100/90 rounded-xs border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 hidden sm:inline" />
          <p className="text-xs text-stone-700">
            Mapping <strong className="font-semibold text-stone-900">{clusters.length} total topic clusters</strong> along a continuous chronological timeline.
          </p>
        </div>
        <Link
          href="/timeline"
          className="text-xs font-bold text-stone-900 hover:text-stone-700 hover:underline flex items-center gap-1 shrink-0"
        >
          <span>Open Full Interactive Timeline</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
};
