import React from 'react';

interface ErrorMessageProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'An error occurred',
  message = 'Failed to load content. Please verify that the backend service is running.',
  onRetry,
}) => {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900 my-4">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none"
        >
          Try Again
        </button>
      )}
    </div>
  );
};
