'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Article } from '@/lib/types';
import { ArticleCard } from './ArticleCard';

interface LatestNewsGridProps {
  articles: Article[];
  title?: string;
  subtitle?: string;
  total?: number;
  viewAllHref?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export const LatestNewsGrid: React.FC<LatestNewsGridProps> = ({
  articles,
  title = 'Latest Wire & Reports',
  subtitle = 'Verified reporting from global newsrooms',
  viewAllHref,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}) => {
  if (!articles || articles.length === 0) {
    return (
      <div className="py-12 text-center text-stone-500">
        <p className="text-sm">No stories found matching your filter.</p>
      </div>
    );
  }

  return (
    <section className="mb-12" aria-label={title}>
      {/* Section Header */}
      <div className="border-b-2 border-stone-900 pb-2 mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono font-semibold text-stone-500">
            Showing {articles.length} stories
          </span>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-stone-800 hover:text-stone-950 hover:underline transition"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} variant="standard" />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && onLoadMore && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 hover:border-stone-400 rounded-xs transition cursor-pointer shadow-2xs disabled:opacity-50"
          >
            {isLoadingMore ? 'Loading more stories...' : 'Load More Stories'}
          </button>
        </div>
      )}
    </section>
  );
};
