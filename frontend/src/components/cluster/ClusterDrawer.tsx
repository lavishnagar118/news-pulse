import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, ExternalLink, Clock, Layers } from 'lucide-react';
import { ClusterDetail } from '@/lib/types';
import { fetchClusterById } from '@/lib/api';
import { formatDateTime, formatTimeSpan, getSourceBadgeStyle, refineClusterLabel } from '@/lib/formatters';

interface ClusterDrawerProps {
  clusterId: string | null;
  onClose: () => void;
}

export const ClusterDrawer: React.FC<ClusterDrawerProps> = ({ clusterId, onClose }) => {
  const [cluster, setCluster] = useState<ClusterDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (clusterId) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [clusterId, onClose]);

  // Load cluster detail when clusterId changes
  useEffect(() => {
    if (!clusterId) {
      setCluster(null);
      setError(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    fetchClusterById(clusterId)
      .then((data) => {
        if (!isCancelled) {
          setCluster(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err.message || 'Failed to load topic cluster details.');
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [clusterId]);

  if (!clusterId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Cluster details"
        className="fixed inset-y-0 right-0 max-w-full flex pl-10"
      >
        <div className="w-screen max-w-lg bg-white shadow-2xl border-l border-stone-200 flex flex-col">
          {/* Drawer Header */}
          <div className="px-6 py-5 bg-stone-50 border-b border-stone-200 flex items-start justify-between">
            <div className="pr-4 space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xs text-[11px] font-bold uppercase tracking-wider bg-stone-900 text-white">
                <Layers className="w-3 h-3 text-amber-400" />
                Topic Cluster
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight leading-snug">
                {isLoading ? (
                  <span className="inline-block w-48 h-6 bg-stone-200 rounded animate-pulse" />
                ) : (
                  refineClusterLabel(cluster?.label)
                )}
              </h2>
              {cluster && (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs text-stone-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    {formatTimeSpan(cluster.startTime, cluster.endTime)}
                  </p>
                  <Link
                    href={`/cluster/${cluster.id}`}
                    className="text-[11px] font-semibold text-stone-700 hover:text-stone-950 underline"
                  >
                    Open dedicated page &rarr;
                  </Link>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xs text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition cursor-pointer"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading && (
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-stone-200 rounded w-32" />
                <div className="h-28 bg-stone-100 rounded" />
                <div className="h-28 bg-stone-100 rounded" />
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xs text-xs text-red-700">
                <p className="font-semibold">Error loading story details</p>
                <p className="mt-0.5">{error}</p>
                <button
                  type="button"
                  onClick={() => {
                    if (clusterId) {
                      setIsLoading(true);
                      fetchClusterById(clusterId)
                        .then(setCluster)
                        .catch((e) => setError(e.message))
                        .finally(() => setIsLoading(false));
                    }
                  }}
                  className="mt-2 text-xs font-semibold text-red-800 underline hover:no-underline cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {!isLoading && cluster && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                    Chronological Coverage ({cluster.articles.length}{' '}
                    {cluster.articles.length === 1 ? 'article' : 'articles'})
                  </span>
                  <span className="text-[11px] text-stone-400 font-mono">Earliest &rarr; Latest</span>
                </div>

                {/* Vertical Timeline Thread */}
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200">
                  {cluster.articles.map((article, index) => {
                    const badge = getSourceBadgeStyle(article.source);
                    return (
                      <div key={article.id || index} className="relative group">
                        {/* Timeline Step Node */}
                        <div className="absolute -left-6 top-2 w-4 h-4 rounded-full bg-white border-2 border-stone-800 flex items-center justify-center text-[9px] font-bold text-stone-900 shadow-2xs">
                          {index + 1}
                        </div>

                        <article className="p-4 bg-white border border-stone-200 rounded-xs shadow-2xs group-hover:border-stone-400 group-hover:shadow-xs transition duration-150 space-y-3">
                          {/* Image Thumbnail if available */}
                          {article.imageUrl && (
                            <div className="overflow-hidden rounded-xs border border-stone-100 aspect-video max-h-40">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={article.imageUrl}
                                alt={article.title}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          {/* Source & Timestamp */}
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-xs text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              {article.source}
                            </span>
                            <time
                              dateTime={article.publishedAt}
                              className="text-[11px] text-stone-400 whitespace-nowrap"
                            >
                              {formatDateTime(article.publishedAt)}
                            </time>
                          </div>

                          {/* Headline */}
                          <h3 className="font-serif text-sm sm:text-base font-bold text-stone-900 leading-snug">
                            {article.title}
                          </h3>

                          {/* Summary */}
                          {article.summary && (
                            <p className="text-xs text-stone-600 leading-relaxed line-clamp-3">
                              {article.summary}
                            </p>
                          )}

                          {/* Action Links */}
                          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs font-semibold">
                            <a
                              href={`/article/${article.id}`}
                              className="text-stone-900 hover:text-stone-600 transition"
                            >
                              Read story &rarr;
                            </a>
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-700 transition"
                            >
                              Original source
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </article>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
