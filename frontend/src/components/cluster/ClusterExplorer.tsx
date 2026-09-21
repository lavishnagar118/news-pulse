import React, { useState, useMemo } from 'react';
import { Search, Compass } from 'lucide-react';
import { TimelineItem } from '@/lib/types';
import { ClusterCard } from './ClusterCard';

interface ClusterExplorerProps {
  clusters: TimelineItem[];
  selectedClusterId?: string | null;
  onSelectCluster: (id: string) => void;
  isLoading?: boolean;
}

export const ClusterExplorer: React.FC<ClusterExplorerProps> = ({
  clusters,
  selectedClusterId,
  onSelectCluster,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClusters = useMemo(() => {
    if (!searchQuery.trim()) return clusters;
    const q = searchQuery.toLowerCase();
    return clusters.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.sources && c.sources.some((s) => s.toLowerCase().includes(q)))
    );
  }, [clusters, searchQuery]);

  return (
    <section id="clusters" className="space-y-4">
      {/* Explorer Header and Search Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-gray-700" />
          <h2 className="text-base font-bold text-gray-900 tracking-tight">
            Topic Stories Explorer
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {filteredClusters.length}
          </span>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter topics by keyword..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          <div className="h-36 bg-gray-200 rounded-xl" />
          <div className="h-36 bg-gray-200 rounded-xl" />
          <div className="h-36 bg-gray-200 rounded-xl" />
        </div>
      ) : filteredClusters.length === 0 ? (
        <div className="p-8 text-center bg-white border border-dashed border-gray-200 rounded-xl">
          <p className="text-sm font-medium text-gray-700">No story clusters found.</p>
          <p className="text-xs text-gray-400 mt-1">
            {searchQuery
              ? `No topics match "${searchQuery}". Clear your search query.`
              : 'Adjust your selected sources to view stories.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClusters.map((cluster) => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              onSelect={onSelectCluster}
              isSelected={selectedClusterId === cluster.id}
            />
          ))}
        </div>
      )}
    </section>
  );
};
