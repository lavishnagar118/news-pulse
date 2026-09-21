import React from 'react';

interface LoadingSpinnerProps {
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ label = 'Loading news data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-3">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-sm text-gray-500 font-medium">{label}</p>
    </div>
  );
};
