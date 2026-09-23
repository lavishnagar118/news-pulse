import { IngestionJob, IngestionJobStats } from './types';
import { triggerIngestion, fetchJobStatus, fetchLatestJobStatus } from './api';
import { formatRefreshCompletion, formatRefreshError } from './formatters';

export interface RefreshState {
  isRefreshing: boolean;
  statusMessage: string | null;
  successMessage: string | null;
  errorMessage: string | null;
  lastSyncText: string | null;
}

const DEFAULT_STATE: RefreshState = {
  isRefreshing: false,
  statusMessage: null,
  successMessage: null,
  errorMessage: null,
  lastSyncText: null,
};

const STORAGE_KEY = 'news_pulse_active_job_id';

export class RefreshManager {
  private state: RefreshState = { ...DEFAULT_STATE };
  private listeners: Set<() => void> = new Set();
  private isInitialized = false;
  private isPolling = false;
  private pollIntervalMs = 2500;
  private currentAbortController: AbortController | null = null;
  private statusTimer: NodeJS.Timeout | null = null;
  private dismissTimer: NodeJS.Timeout | null = null;
  private pollSleepTimer: NodeJS.Timeout | null = null;
  private pollingPromise: Promise<void> | null = null;

  public getState = (): RefreshState => {
    return this.state;
  };

  public getServerState = (): RefreshState => {
    return DEFAULT_STATE;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('[RefreshManager] Listener error:', err);
      }
    });
  }

  private updateState(partial: Partial<RefreshState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  public dismissError = () => {
    if (this.state.errorMessage) {
      this.updateState({ errorMessage: null });
    }
  };

  public dismissSuccess = () => {
    if (this.state.successMessage) {
      this.updateState({ successMessage: null });
    }
  };

  public setPollIntervalForTesting(ms: number): void {
    this.pollIntervalMs = ms;
  }

  public waitForPollingToFinish(): Promise<void> {
    return this.pollingPromise || Promise.resolve();
  }

  private clearTimers() {
    if (this.statusTimer) {
      clearTimeout(this.statusTimer);
      this.statusTimer = null;
    }
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    if (this.pollSleepTimer) {
      clearTimeout(this.pollSleepTimer);
      this.pollSleepTimer = null;
    }
  }

  private scheduleDismissSuccess(delayMs: number = 6000) {
    if (this.dismissTimer) clearTimeout(this.dismissTimer);
    this.dismissTimer = setTimeout(() => {
      if (this.state.successMessage) {
        this.updateState({ successMessage: null });
      }
    }, delayMs);
  }

  private scheduleDismissError(delayMs: number = 7000) {
    if (this.dismissTimer) clearTimeout(this.dismissTimer);
    this.dismissTimer = setTimeout(() => {
      if (this.state.errorMessage) {
        this.updateState({ errorMessage: null });
      }
    }, delayMs);
  }

  /**
   * Initialize state on mount:
   * 1. Check for active job in sessionStorage or latest job from server.
   * 2. If a job is currently queued/running, seamlessly reconnect and resume background polling.
   * 3. Set initial Last synced timestamp.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (typeof window === 'undefined') return;

    try {
      // 1. Check sessionStorage for active job
      let activeJobId: string | null = null;
      try {
        activeJobId = sessionStorage.getItem(STORAGE_KEY);
      } catch {
        // Ignore storage exceptions
      }

      if (activeJobId) {
        try {
          const job = await fetchJobStatus(activeJobId);
          if (job.status === 'queued' || job.status === 'running') {
            this.updateState({
              isRefreshing: true,
              statusMessage: 'Refresh running in the background…',
            });
            this.startPolling(activeJobId);
            return;
          } else {
            sessionStorage.removeItem(STORAGE_KEY);
          }
        } catch {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }

      // 2. Query latest recorded job status
      const latestJob = await fetchLatestJobStatus();
      if (latestJob) {
        if (latestJob.status === 'queued' || latestJob.status === 'running') {
          this.updateState({
            isRefreshing: true,
            statusMessage: 'Refresh running in the background…',
          });
          this.startPolling(latestJob.jobId);
        } else if (latestJob.completedAt) {
          const d = new Date(latestJob.completedAt);
          const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
          this.updateState({
            lastSyncText: `Last synced: ${timeStr}`,
          });
        }
      }
    } catch {
      // Background init should never break render
    }
  }

  /**
   * Triggers background news refresh without blocking the reader.
   * Resolves immediately after trigger acknowledgement (202 or 409).
   */
  public async triggerRefresh(): Promise<void> {
    // Prevent duplicate triggers
    if (this.state.isRefreshing || this.isPolling) {
      return;
    }

    this.clearTimers();

    // Immediately reflect non-blocking refresh acceptance
    this.updateState({
      isRefreshing: true,
      statusMessage: 'Refresh started · checking for new stories…',
      successMessage: null,
      errorMessage: null,
    });

    try {
      const triggerRes = await triggerIngestion();
      const jobId = triggerRes.jobId;

      if (triggerRes.isConcurrent) {
        this.updateState({
          statusMessage: 'Refresh already in progress…',
        });
      }

      if (typeof window !== 'undefined' && jobId) {
        try {
          sessionStorage.setItem(STORAGE_KEY, jobId);
        } catch {
          // Ignore storage errors
        }
      }

      // If refresh takes longer than 5 seconds, switch copy to background message
      this.statusTimer = setTimeout(() => {
        if (this.state.isRefreshing && !this.state.errorMessage && !this.state.successMessage) {
          this.updateState({
            statusMessage: 'Refresh running in the background…',
          });
        }
      }, 5000);

      // Start background polling asynchronously without blocking the user
      if (jobId) {
        this.startPolling(jobId);
      }
    } catch (err: any) {
      this.clearTimers();
      const errorText = formatRefreshError(err);

      if (errorText.includes('already in progress')) {
        this.updateState({
          statusMessage: 'Refresh already in progress…',
        });

        // Try to attach to active job
        const latest = await fetchLatestJobStatus().catch(() => null);
        if (latest && (latest.status === 'queued' || latest.status === 'running')) {
          this.startPolling(latest.jobId);
          return;
        }

        setTimeout(() => {
          if (this.state.statusMessage === 'Refresh already in progress…') {
            this.updateState({
              isRefreshing: false,
              statusMessage: null,
            });
          }
        }, 5000);
        return;
      }

      this.updateState({
        isRefreshing: false,
        statusMessage: null,
        errorMessage: "Refresh couldn't complete. Your current news is still available.",
      });
      this.scheduleDismissError();
    }
  }

  /**
   * Bounded background status polling covering Render cold starts.
   */
  private startPolling(jobId: string): Promise<void> {
    if (this.isPolling) {
      return this.pollingPromise || Promise.resolve();
    }
    this.isPolling = true;

    const startTime = Date.now();
    const maxWaitMs = 120000; // 120s covers the 105s backend deadline
    const intervalMs = this.pollIntervalMs;

    const abortController = new AbortController();
    this.currentAbortController = abortController;

    this.pollingPromise = (async () => {
      try {
        while (Date.now() - startTime < maxWaitMs) {
          if (abortController.signal.aborted) {
            return;
          }

          try {
            const job = await fetchJobStatus(jobId);
            if (abortController.signal.aborted) return;

            if (job.status === 'running') {
              if (this.state.statusMessage !== 'Refresh running in the background…') {
                this.updateState({
                  statusMessage: 'Refresh running in the background…',
                });
              }
            }

            if (job.status === 'completed') {
              this.clearTimers();
              if (typeof window !== 'undefined') {
                try {
                  sessionStorage.removeItem(STORAGE_KEY);
                } catch {}
              }

              const completionText = formatRefreshCompletion(job.stats);
              this.updateState({
                isRefreshing: false,
                statusMessage: null,
                successMessage: completionText,
                lastSyncText: 'Last synced: just now',
              });

              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('news-pulse-refresh', { detail: job.stats })
                );
              }

              this.scheduleDismissSuccess();
              return;
            }

            if (job.status === 'failed') {
              this.clearTimers();
              if (typeof window !== 'undefined') {
                try {
                  sessionStorage.removeItem(STORAGE_KEY);
                } catch {}
              }

              this.updateState({
                isRefreshing: false,
                statusMessage: null,
                errorMessage: "Refresh couldn't complete. Your current news is still available.",
              });
              this.scheduleDismissError();
              return;
            }
          } catch (pollErr: any) {
            if (abortController.signal.aborted) return;
            // Transient polling error: keep polling until deadline
          }

          // Delay between polling requests
          await new Promise((resolve) => {
            this.pollSleepTimer = setTimeout(resolve, intervalMs);
          });
        }

        // Bounded wait exceeded
        if (!abortController.signal.aborted) {
          this.clearTimers();
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.removeItem(STORAGE_KEY);
            } catch {}
          }

          this.updateState({
            isRefreshing: false,
            statusMessage: null,
            errorMessage: "Refresh couldn't complete. Your current news is still available.",
          });
          this.scheduleDismissError();
        }
      } finally {
        this.isPolling = false;
        this.currentAbortController = null;
        this.pollingPromise = null;
      }
    })();

    return this.pollingPromise;
  }

  /**
   * Cancel polling and clean up all background timers.
   */
  public stop(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.clearTimers();
    this.isPolling = false;
    this.pollingPromise = null;
  }

  /**
   * Reset internal state for test isolation.
   */
  public resetForTesting(initialState?: Partial<RefreshState>): void {
    this.stop();
    this.isInitialized = false;
    this.state = { ...DEFAULT_STATE, ...initialState };
    this.listeners.clear();
  }
}

export const refreshManager = new RefreshManager();
