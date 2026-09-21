'use client';

import React, { useEffect } from 'react';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled UI exception:', error);
  }, [error]);

  return (
    <div className="py-12 max-w-xl mx-auto">
      <ErrorMessage
        title="Application Error"
        message={error.message || 'An unexpected error occurred while rendering the page.'}
        onRetry={() => reset()}
      />
    </div>
  );
}
