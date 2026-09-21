'use client';

import React from 'react';
import Link from 'next/link';
import { Article } from '@/lib/types';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { formatRelativeTime, getCategoryBadgeStyle, getSourceBadgeStyle } from '@/lib/formatters';

interface ArticleCardProps {
  article: Article;
  variant?: 'standard' | 'horizontal' | 'compact';
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  variant = 'standard',
}) => {
  const catStyle = getCategoryBadgeStyle(article.category);
  const srcStyle = getSourceBadgeStyle(article.source);

  if (variant === 'compact') {
    return (
      <article className="group py-3 border-b border-stone-100 last:border-none">
        <Link href={`/article/${article.id}`} className="flex items-start gap-3">
          <div className="w-16 h-16 shrink-0 overflow-hidden rounded-xs border border-stone-200">
            <ImageWithFallback
              src={article.imageUrl}
              alt={article.title}
              category={article.category}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${catStyle.text}`}>
                {article.category}
              </span>
              <span className="text-stone-300">&middot;</span>
              <span className="text-[11px] text-stone-400">
                {formatRelativeTime(article.publishedAt)}
              </span>
            </div>
            <h4 className="font-serif text-xs sm:text-sm font-bold text-stone-900 group-hover:text-stone-700 transition line-clamp-2 leading-snug">
              {article.title}
            </h4>
          </div>
        </Link>
      </article>
    );
  }

  if (variant === 'horizontal') {
    return (
      <article className="group p-4 bg-white border border-stone-200 rounded-xs shadow-2xs hover:shadow-xs transition duration-200">
        <Link href={`/article/${article.id}`} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          <div className="sm:col-span-4 overflow-hidden rounded-xs border border-stone-200">
            <ImageWithFallback
              src={article.imageUrl}
              alt={article.title}
              category={article.category}
              aspectRatio="video"
              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            />
          </div>
          <div className="sm:col-span-8 space-y-2">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-xs ${catStyle.bg} ${catStyle.text}`}>
                {article.category}
              </span>
              <span className="text-stone-300">&middot;</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-xs border ${srcStyle.bg} ${srcStyle.text} ${srcStyle.border}`}>
                {article.source}
              </span>
              <span className="text-stone-400 text-xs">
                {formatRelativeTime(article.publishedAt)}
              </span>
            </div>
            <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 group-hover:text-stone-700 transition leading-snug">
              {article.title}
            </h3>
            {article.summary && (
              <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                {article.summary}
              </p>
            )}
          </div>
        </Link>
      </article>
    );
  }

  // Standard vertical card
  return (
    <article className="group flex flex-col bg-white border border-stone-200 rounded-xs overflow-hidden shadow-2xs hover:shadow-xs transition duration-200">
      <Link href={`/article/${article.id}`} className="block overflow-hidden border-b border-stone-200">
        <ImageWithFallback
          src={article.imageUrl}
          alt={article.title}
          category={article.category}
          aspectRatio="video"
          className="group-hover:scale-103 transition duration-400 ease-out"
        />
      </Link>

      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-xs ${catStyle.bg} ${catStyle.text}`}>
              {article.category}
            </span>
            <span className="text-stone-300">&middot;</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-xs border ${srcStyle.bg} ${srcStyle.text} ${srcStyle.border}`}>
              {article.source}
            </span>
            <span className="text-stone-400 text-[11px] ml-auto">
              {formatRelativeTime(article.publishedAt)}
            </span>
          </div>

          <Link href={`/article/${article.id}`} className="block group-hover:text-stone-700 transition">
            <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 leading-snug line-clamp-2">
              {article.title}
            </h3>
          </Link>

          {article.summary && (
            <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
              {article.summary}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-stone-900">
          <Link href={`/article/${article.id}`} className="hover:underline">
            Read story &rarr;
          </Link>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-stone-400 hover:text-stone-600 font-normal transition"
            title={`View original on ${article.source}`}
          >
            Source ↗
          </a>
        </div>
      </div>
    </article>
  );
};
