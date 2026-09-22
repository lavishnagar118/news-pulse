import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react';
import { triggerIngestion, pollJobStatus, fetchLatestJobStatus } from '@/lib/api';
import { IngestionJob } from '@/lib/types';
import { formatRefreshCompletion, formatRefreshError } from '@/lib/formatters';

interface IngestionControlProps {
  onRefreshCompleted: () => Promise<void>;
  isGlobalLoading?: boolean;
}

export const IngestionControl: React.FC<IngestionControlProps> = ({
  onRefreshCompleted,
  isGlobalLoading = false,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastSyncText, setLastSyncText] = useState<string | null>(null);

  useEffect(() => {
    const loadLastSync = async () => {
      const job = await fetchLatestJobStatus();
      if (job?.completedAt) {
        const d = new Date(job.completedAt);
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
        setLastSyncText(`Last synced at ${timeStr}`);
      }
    };
    loadLastSync();
  }, []);

  const handleRefresh = async () => {
    if (isRefreshing || isGlobalLoading) return;

    setIsRefreshing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setStatusMessage('Refreshing news…');

    try {
      // 1. Trigger ingestion
      const triggerRes = await triggerIngestion();
      const jobId = triggerRes.jobId;

      setStatusMessage('Processing latest stories…');

      // 2. Poll status
      const completedJob = await pollJobStatus(
        jobId,
        (job: IngestionJob) => {
          if (job.status === 'running') {
            setStatusMessage('Processing latest stories…');
          }
        },
        2000,
        90000
      );

      // 3. Completed: reload timeline and show human-readable statistics
      setStatusMessage('Processing latest stories…');
      await onRefreshCompleted();

      const completionText = formatRefreshCompletion(completedJob.stats);
      setSuccessMessage(completionText);
      setLastSyncText('Last synced: just now');
      setStatusMessage(null);

      // Auto-clear success notification after 6s
      setTimeout(() => {
        setSuccessMessage(null);
      }, 6000);
    } catch (err: any) {
      setErrorMessage(formatRefreshError(err));
      setStatusMessage(null);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3" aria-live="polite" aria-atomic="true">
      {/* Live Refresh Button */}
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isRefreshing || isGlobalLoading}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xs text-xs font-semibold bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 hover:text-stone-900 active:bg-stone-100 disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-stone-400"
        aria-label={isRefreshing ? 'Refreshing news stories' : 'Refresh news data'}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-stone-600' : 'text-stone-500'}`} />
        <span>{isRefreshing ? 'Refreshing…' : 'Refresh Data'}</span>
      </button>

      {/* Progress / Status Indicators */}
      {isRefreshing && statusMessage && (
        <div className="inline-flex items-center gap-2 text-xs font-medium text-stone-700 bg-stone-50 px-3 py-1.5 rounded-xs border border-stone-200 animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-600" />
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
            onClick={() => setErrorMessage(null)}
            className="ml-1 text-[11px] underline hover:no-underline text-stone-600"
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
