import React from 'react';
import { Layers, Clock, ArrowRight } from 'lucide-react';
import { TimelineItem } from '@/lib/types';
import { formatTimeSpan, getSourceBadgeStyle } from '@/lib/formatters';

interface ClusterCardProps {
  cluster: TimelineItem;
  onSelect: (id: string) => void;
  isSelected?: boolean;
}

export const ClusterCard: React.FC<ClusterCardProps> = ({
  cluster,
  onSelect,
  isSelected = false,
}) => {
  return (
    <div
      onClick={() => onSelect(cluster.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(cluster.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View story cluster: ${cluster.label}`}
      className={`group p-4 bg-white border rounded-xl shadow-xs hover:border-blue-300 hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col justify-between ${
        isSelected ? 'ring-2 ring-blue-600 border-blue-600' : 'border-gray-200'
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between text-xs gap-2 mb-2">
          <span className="inline-flex items-center gap-1 font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            <Layers className="w-3 h-3 text-blue-600" />
            {cluster.articleCount} {cluster.articleCount === 1 ? 'article' : 'articles'}
          </span>
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-gray-400" />
            {formatTimeSpan(cluster.startTime, cluster.endTime)}
          </span>
        </div>

        {/* Headline / Label */}
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {cluster.label}
        </h3>
      </div>

      {/* Sources & Action */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {cluster.sources &&
            cluster.sources.map((source) => {
              const badge = getSourceBadgeStyle(source);
              return (
                <span
                  key={source}
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${badge.bg} ${badge.text} ${badge.border}`}
                >
                  {source}
                </span>
              );
            })}
        </div>

        <span className="text-xs font-semibold text-blue-600 inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
          Details
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
};
