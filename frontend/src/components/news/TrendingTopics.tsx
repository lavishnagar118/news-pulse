'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { ClusterSummary } from '@/lib/types';
import { refineClusterLabel } from '@/lib/formatters';

interface TrendingTopicsProps {
  clusters: ClusterSummary[];
  onSelectCluster?: (clusterId: string) => void;
  selectedClusterId?: string | null;
}

export const TrendingTopics: React.FC<TrendingTopicsProps> = ({
  clusters,
  onSelectCluster,
  selectedClusterId,
}) => {
  if (!clusters || clusters.length === 0) return null;

  // Filter and show top clusters with multiple articles, or highest article count
  const multiClusters = clusters.filter((c) => c.articleCount >= 2);
  const displayClusters = multiClusters.length >= 4 ? multiClusters.slice(0, 10) : clusters.slice(0, 10);

  return (
    <section className="mb-8 py-3 px-4 bg-stone-100/80 rounded-sm border border-stone-200 flex flex-col md:flex-row items-start md:items-center gap-3">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-800 shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
        <span>Trending Topics</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none no-scrollbar w-full py-1">
        {displayClusters.map((cluster) => {
          const isSelected = selectedClusterId === cluster.id;

          return (
            <button
              key={cluster.id}
              type="button"
              onClick={() => onSelectCluster && onSelectCluster(cluster.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-full border transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50 hover:text-stone-900 hover:border-stone-400'
              }`}
            >
              <span>{refineClusterLabel(cluster.label)}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                isSelected ? 'bg-stone-700 text-stone-200' : 'bg-stone-100 text-stone-600'
              }`}>
                {cluster.articleCount}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
