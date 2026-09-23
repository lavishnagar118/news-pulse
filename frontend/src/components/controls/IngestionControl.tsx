import React from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react';
import { useRefresh } from '@/hooks/useRefresh';

interface IngestionControlProps {
  onRefreshCompleted: () => Promise<void>;
  isGlobalLoading?: boolean;
}

export const IngestionControl: React.FC<IngestionControlProps> = ({
  onRefreshCompleted,
  isGlobalLoading = false,
}) => {
  const {
    isRefreshing,
    statusMessage,
    errorMessage,
    successMessage,
    lastSyncText,
    triggerRefresh,
    dismissError,
  } = useRefresh({ onRefreshCompleted });

  return (
    <div className="flex flex-wrap items-center gap-3" aria-live="polite" aria-atomic="true">
      {/* Live Refresh Button */}
      <button
        type="button"
        onClick={triggerRefresh}
        disabled={isRefreshing || isGlobalLoading}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xs text-xs font-semibold bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 hover:text-stone-900 active:bg-stone-100 disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-stone-400"
        aria-label={isRefreshing ? 'Refreshing news stories' : 'Refresh news data'}
      >
        <RefreshCw
          className={`w-3.5 h-3.5 ${
            isRefreshing ? 'animate-spin motion-reduce:animate-none text-stone-600' : 'text-stone-500'
          }`}
        />
        <span>{isRefreshing ? 'Refreshing…' : 'Refresh Data'}</span>
      </button>

      {/* Progress / Status Indicators */}
      {isRefreshing && statusMessage && (
        <div className="inline-flex items-center gap-2 text-xs font-medium text-stone-700 bg-stone-50 px-3 py-1.5 rounded-xs border border-stone-200 animate-pulse motion-reduce:animate-none">
          <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none text-stone-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {successMessage && !isRefreshing && (
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-800 bg-stone-50 px-3 py-1.5 rounded-xs border border-stone-200">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && !isRefreshing && (
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-800 bg-stone-50 px-3 py-1.5 rounded-xs border border-stone-200">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={dismissError}
            className="ml-1 text-[11px] underline hover:no-underline text-stone-600 focus:outline-none focus:ring-1 focus:ring-stone-400 rounded-xs"
            aria-label="Dismiss message"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Latest Sync Timestamp */}
      {lastSyncText && !isRefreshing && !successMessage && !errorMessage && (
        <span className="inline-flex items-center gap-1 text-[11px] text-stone-500 font-medium">
          <Clock className="w-3 h-3 text-stone-400" />
          {lastSyncText}
        </span>
      )}
    </div>
  );
};
