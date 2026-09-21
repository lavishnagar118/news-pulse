import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="text-center py-16">
      <h2 className="text-3xl font-bold text-gray-900">404 - Page Not Found</h2>
      <p className="mt-2 text-sm text-gray-600">The requested article, cluster, or view does not exist.</p>
      <Link
        href="/"
        className="mt-4 inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
      >
        Return to Home Timeline
      </Link>
    </div>
  );
}
