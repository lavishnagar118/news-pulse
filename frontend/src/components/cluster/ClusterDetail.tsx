import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Clock, Layers, Activity } from 'lucide-react';
import { ClusterDetail as ClusterDetailType } from '@/lib/types';
import { formatDateTime, formatTimeSpan, getSourceBadgeStyle, getCategoryBadgeStyle, refineClusterLabel } from '@/lib/formatters';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';

interface ClusterDetailProps {
  cluster: ClusterDetailType;
}

export const ClusterDetail: React.FC<ClusterDetailProps> = ({ cluster }) => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Back Link and Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Front Page
          </Link>
          <Link
            href="/timeline"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-900 hover:text-stone-700 transition"
          >
            <Activity className="w-3.5 h-3.5 text-amber-500" />
            <span>Explore in Timeline &rarr;</span>
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xs text-[11px] font-bold uppercase tracking-wider bg-stone-900 text-white">
            <Layers className="w-3 h-3 text-amber-400" />
            Topic Cluster
          </span>
          <span className="text-xs text-stone-500 font-mono font-semibold">
            {cluster.articles.length} {cluster.articles.length === 1 ? 'story' : 'stories'}
          </span>
        </div>
        <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-black text-stone-900 tracking-tight leading-tight">
          {refineClusterLabel(cluster.label)}
        </h1>
        <p className="mt-2 text-xs text-stone-500 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-stone-400" />
          Coverage timeline: {formatTimeSpan(cluster.startTime, cluster.endTime)}
        </p>
      </div>

      {/* Member Articles (Chronological: earliest -> later -> latest) */}
      <div className="bg-white rounded-xs border border-stone-200 shadow-2xs p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700">
            Chronological Coverage ({cluster.articles.length}{' '}
            {cluster.articles.length === 1 ? 'story' : 'stories'})
          </h2>
          <span className="text-xs text-stone-400 font-mono">Earliest &rarr; Latest</span>
        </div>

        <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200">
          {cluster.articles.map((article, index) => {
            const badge = getSourceBadgeStyle(article.source);
            const catStyle = getCategoryBadgeStyle(article.category);

            return (
              <div key={article.id || index} className="relative group">
                {/* Node counter */}
                <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-stone-900 flex items-center justify-center text-[9px] font-bold text-stone-900 shadow-2xs">
                  {index + 1}
                </div>

                <article className="p-5 bg-white border border-stone-200 rounded-xs shadow-2xs group-hover:border-stone-400 transition-all space-y-4">
                  {article.imageUrl && (
                    <div className="overflow-hidden rounded-xs border border-stone-100 max-h-56">
                      <ImageWithFallback
                        src={article.imageUrl}
                        alt={article.title}
                        category={article.category}
                        aspectRatio="video"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-xs text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {article.source}
                      </span>
                      {article.category && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-xs ${catStyle.bg} ${catStyle.text}`}>
                          {article.category}
                        </span>
                      )}
                    </div>
                    <time
                      dateTime={article.publishedAt}
                      className="text-xs text-stone-400 whitespace-nowrap"
                    >
                      {formatDateTime(article.publishedAt)}
                    </time>
                  </div>

                  <Link href={`/article/${article.id}`} className="block group-hover:text-stone-700 transition">
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 leading-snug">
                      {article.title}
                    </h3>
                  </Link>

                  {article.summary && (
                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                      {article.summary}
                    </p>
                  )}

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold">
                    <Link
                      href={`/article/${article.id}`}
                      className="text-stone-900 hover:text-stone-600 transition"
                    >
                      Read full story &rarr;
                    </Link>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition"
                    >
                      Original source
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
