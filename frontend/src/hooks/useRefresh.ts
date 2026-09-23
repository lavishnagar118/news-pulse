'use client';

import { useSyncExternalStore, useEffect, useCallback } from 'react';
import { refreshManager } from '@/lib/refreshManager';

export interface UseRefreshOptions {
  onRefreshSuccess?: () => void;
  onRefreshCompleted?: () => Promise<void> | void;
}

export function useRefresh(options?: UseRefreshOptions) {
  const state = useSyncExternalStore(
    refreshManager.subscribe,
    refreshManager.getState,
    refreshManager.getServerState
  );

  useEffect(() => {
    refreshManager.init();
  }, []);

  const onRefreshSuccess = options?.onRefreshSuccess;
  const onRefreshCompleted = options?.onRefreshCompleted;

  useEffect(() => {
    if (!onRefreshSuccess && !onRefreshCompleted) return;

    const handleRefreshEvent = async () => {
      try {
        if (onRefreshSuccess) {
          onRefreshSuccess();
        }
        if (onRefreshCompleted) {
          await onRefreshCompleted();
        }
      } catch (err) {
        console.error('[useRefresh] Error executing refresh callback:', err);
      }
    };

    window.addEventListener('news-pulse-refresh', handleRefreshEvent);
    return () => {
      window.removeEventListener('news-pulse-refresh', handleRefreshEvent);
    };
  }, [onRefreshSuccess, onRefreshCompleted]);

  const triggerRefresh = useCallback(() => {
    return refreshManager.triggerRefresh();
  }, []);

  const dismissError = useCallback(() => {
    refreshManager.dismissError();
  }, []);

  const dismissSuccess = useCallback(() => {
    refreshManager.dismissSuccess();
  }, []);

  return {
    ...state,
    triggerRefresh,
    dismissError,
    dismissSuccess,
  };
}
