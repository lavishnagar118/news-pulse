import React from 'react';
import { Filter, Check } from 'lucide-react';
import { getSourceBadgeStyle } from '@/lib/formatters';

interface SourceFilterProps {
  sources: string[];
  selectedSources: string[];
  onToggleSource: (source: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  totalClustersCount: number;
  filteredClustersCount: number;
}

export const SourceFilter: React.FC<SourceFilterProps> = ({
  sources,
  selectedSources,
  onToggleSource,
  onSelectAll,
  onClearAll,
  totalClustersCount,
  filteredClustersCount,
}) => {
  const allSelected = sources.length > 0 && selectedSources.length === sources.length;
  const noneSelected = selectedSources.length === 0;

  return (
    <div className="bg-white rounded-xs border border-stone-200 p-3 sm:p-4 space-y-2.5">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-stone-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
            Publisher Filter
          </span>
          <span className="text-xs text-stone-400">
            ({filteredClustersCount} of {totalClustersCount} clusters visible)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={allSelected}
            className="text-xs font-semibold text-stone-700 hover:text-stone-900 disabled:text-stone-300 transition cursor-pointer"
          >
            Select All
          </button>
          <span className="text-stone-300 text-xs">|</span>
          <button
            type="button"
            onClick={onClearAll}
            disabled={noneSelected}
            className="text-xs font-semibold text-stone-500 hover:text-stone-900 disabled:text-stone-300 transition cursor-pointer"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Source Toggle Pills */}
      {sources.length === 0 ? (
        <p className="text-xs text-stone-400 py-1">Loading available news sources...</p>
      ) : (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {sources.map((source) => {
            const isSelected = selectedSources.includes(source);
            const badge = getSourceBadgeStyle(source);

            return (
              <button
                key={source}
                type="button"
                onClick={() => onToggleSource(source)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition border cursor-pointer ${
                  isSelected
                    ? `${badge.bg} ${badge.text} ${badge.border} shadow-2xs`
                    : 'bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100'
                }`}
                aria-pressed={isSelected}
              >
                <div
                  className={`w-3 h-3 rounded-full flex items-center justify-center border transition ${
                    isSelected
                      ? 'bg-stone-900 border-stone-900 text-white'
                      : 'border-stone-300 bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                </div>
                <span>{source}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
