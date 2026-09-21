import React, { useState } from 'react';
import { TimelineItem } from '@/lib/types';
import { formatTimeSpan, refineClusterLabel } from '@/lib/formatters';

interface TimelineBlockProps {
  cluster: TimelineItem;
  minTime: number;
  maxTime: number;
  onSelect: (id: string) => void;
  isSelected?: boolean;
}

export const TimelineBlock: React.FC<TimelineBlockProps> = ({
  cluster,
  minTime,
  maxTime,
  onSelect,
  isSelected = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const totalSpan = maxTime - minTime;
  const startMs = new Date(cluster.startTime).getTime();
  const endMs = new Date(cluster.endTime).getTime();

  // Position calculations
  const leftPercent = Math.max(0, Math.min(97, ((startMs - minTime) / totalSpan) * 100));
  const rawWidthPercent = ((Math.max(endMs, startMs) - startMs) / totalSpan) * 100;

  const isMulti = cluster.articleCount > 1;
  const refinedLabel = refineClusterLabel(cluster.label);

  // For multi-article clusters: give enough width for label and span
  const widthPercent = isMulti ? Math.max(rawWidthPercent, 6.5) : Math.max(rawWidthPercent, 1.8);

  // Intensity-based styling
  const getIntensityStyles = () => {
    if (cluster.articleCount >= 4) {
      return {
        container: 'bg-indigo-900 text-white border-indigo-950 hover:bg-indigo-800 shadow-xs font-bold',
        badge: 'bg-white text-indigo-950 font-black',
      };
    }
    if (cluster.articleCount >= 2) {
      return {
        container: 'bg-amber-100 text-stone-900 border-amber-400 hover:bg-amber-200 shadow-2xs font-semibold',
        badge: 'bg-stone-900 text-amber-400 font-bold',
      };
    }
    // Singletons: subtle, refined minimal node
    return {
      container: 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100 hover:border-stone-500 shadow-2xs',
      badge: 'bg-stone-100 text-stone-600',
    };
  };

  const styles = getIntensityStyles();

  return (
    <div
      className={`absolute top-1 bottom-1 flex items-center transition-all duration-150 ${isMulti ? 'z-20' : 'z-10'}`}
      style={{
        left: `${leftPercent}%`,
        width: isMulti ? `${widthPercent}%` : 'auto',
        minWidth: isMulti ? '140px' : '26px',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isMulti ? (
        // Prominent Block for Multi-Article Developing Narratives
        <button
          type="button"
          onClick={() => onSelect(cluster.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(cluster.id);
            }
          }}
          aria-label={`Developing topic: ${refinedLabel} (${cluster.articleCount} articles)`}
          className={`w-full h-full px-2.5 py-1 rounded-xs border text-left flex items-center gap-2 cursor-pointer truncate transition select-none ${
            styles.container
          } ${isSelected ? 'ring-2 ring-stone-900 ring-offset-1 border-stone-900 shadow-md' : ''}`}
        >
          <span
            className={`shrink-0 inline-flex items-center justify-center text-[10px] w-4 h-4 rounded-full ${styles.badge}`}
          >
            {cluster.articleCount}
          </span>
          <span className="truncate text-xs tracking-tight">
            {refinedLabel}
          </span>
        </button>
      ) : (
        // Subtle Marker / Dot for Singleton Articles
        <button
          type="button"
          onClick={() => onSelect(cluster.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(cluster.id);
            }
          }}
          aria-label={`Article: ${refinedLabel}`}
          className={`w-6 h-6 rounded-full border flex items-center justify-center transition cursor-pointer select-none ${
            styles.container
          } ${isSelected ? 'ring-2 ring-stone-900 scale-125 border-stone-900' : 'hover:scale-110'}`}
          title={refinedLabel}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-stone-400 group-hover:bg-stone-700" />
        </button>
      )}

      {/* Accessible Hover Tooltip Card */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-stone-900 text-white text-xs rounded-xs shadow-xl z-50 pointer-events-none transition-opacity duration-150 border border-stone-700">
          <div className="flex items-center justify-between text-[10px] text-stone-400 pb-1.5 border-b border-stone-800">
            <span className={isMulti ? 'font-bold text-amber-400' : 'text-stone-300'}>
              {isMulti ? `${cluster.articleCount} interconnected stories` : 'Single story report'}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider">
              {isMulti ? 'Developing Narrative' : 'Dispatch'}
            </span>
          </div>

          <p className="mt-1.5 font-serif font-bold text-white text-sm line-clamp-2 leading-snug">
            {refinedLabel}
          </p>

          <p className="mt-1 text-[11px] text-stone-400">
            {formatTimeSpan(cluster.startTime, cluster.endTime)}
          </p>

          {cluster.sources && cluster.sources.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {cluster.sources.map((s) => (
                <span
                  key={s}
                  className="px-1.5 py-0.5 rounded-xs bg-stone-800 text-[10px] text-stone-300 border border-stone-700 font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 text-[10px] text-amber-400 font-semibold text-center border-t border-stone-800 pt-1.5">
            Click to view coverage &rarr;
          </div>
        </div>
      )}
    </div>
  );
};
