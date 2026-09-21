import React from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <LoadingSpinner label="Loading News Pulse..." />
    </div>
  );
}
