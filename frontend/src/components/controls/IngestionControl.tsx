import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react';
import { triggerIngestion, pollJobStatus, fetchLatestJobStatus } from '@/lib/api';
import { IngestionJob } from '@/lib/types';

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
    setStatusMessage('Connecting to feeds...');

    try {
      // 1. POST /ingest/trigger
      const triggerRes = await triggerIngestion();
      const jobId = triggerRes.jobId;

      setStatusMessage('Ingesting & clustering stories...');

      // 2. Poll status
      const completedJob = await pollJobStatus(
        jobId,
        (job: IngestionJob) => {
          if (job.status === 'running') {
            if (job.stats && job.stats.articlesFetched > 0) {
              setStatusMessage('Extracting article content & clustering topics...');
            } else {
              setStatusMessage('Connecting to RSS feeds & ingesting articles...');
            }
          }
        },
        2000,
        90000
      );

      // 3. Completed: reload timeline and show real statistics
      setStatusMessage('Refreshing timeline data...');
      await onRefreshCompleted();

      const added = completedJob.stats?.articlesAdded ?? 0;
      const dupes = completedJob.stats?.duplicatesSkipped ?? 0;

      if (added > 0) {
        setSuccessMessage(`Updated just now · ${added} new ${added === 1 ? 'story' : 'stories'} · ${dupes} duplicates skipped`);
      } else {
        setSuccessMessage("You're up to date · No new stories found");
      }
      setLastSyncText('Last synced: just now');
      setStatusMessage(null);

      // Auto-clear success notification after 6s
      setTimeout(() => {
        setSuccessMessage(null);
      }, 6000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to complete ingestion pipeline.');
      setStatusMessage(null);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Live Refresh Button */}
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isRefreshing || isGlobalLoading}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed shadow-xs transition-all duration-150"
        aria-label="Refresh news feeds and re-cluster timeline"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span>{isRefreshing ? 'Updating News...' : 'Refresh Data'}</span>
      </button>

      {/* Progress / Status Indicators */}
      {isRefreshing && statusMessage && (
        <div className="inline-flex items-center gap-2 text-xs font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {successMessage && !isRefreshing && (
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && !isRefreshing && (
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="ml-1 text-[11px] underline hover:no-underline text-red-800"
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
