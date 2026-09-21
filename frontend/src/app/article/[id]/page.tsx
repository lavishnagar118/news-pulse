'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ExternalLink, Clock, ArrowLeft, Layers, Bookmark } from 'lucide-react';
import { ArticleDetail } from '@/lib/types';
import { fetchArticleById } from '@/lib/api';
import { formatDateTime, getCategoryBadgeStyle, getSourceBadgeStyle, refineClusterLabel } from '@/lib/formatters';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { ArticleCard } from '@/components/news/ArticleCard';

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    fetchArticleById(id)
      .then((data) => {
        setArticle(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Article not found');
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-6 animate-pulse">
        <div className="h-4 bg-stone-200 rounded w-24" />
        <div className="h-10 bg-stone-200 rounded w-full" />
        <div className="h-10 bg-stone-200 rounded w-3/4" />
        <div className="h-5 bg-stone-100 rounded w-48" />
        <div className="aspect-video bg-stone-200 rounded" />
        <div className="space-y-3 pt-4">
          <div className="h-4 bg-stone-100 rounded w-full" />
          <div className="h-4 bg-stone-100 rounded w-full" />
          <div className="h-4 bg-stone-100 rounded w-5/6" />
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <h1 className="font-serif text-2xl font-bold text-stone-900">Story Not Found</h1>
        <p className="text-sm text-stone-600">
          The requested article could not be located. It may have been archived or removed.
        </p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-stone-900 text-white rounded-xs hover:bg-stone-800 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Wire
        </button>
      </div>
    );
  }

  const catStyle = getCategoryBadgeStyle(article.category);
  const srcStyle = getSourceBadgeStyle(article.source);

  // Split article body into paragraphs
  const paragraphs = (article.content || article.summary || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Estimate read time (avg 200 wpm)
  const totalWords = (article.content || '').split(/\s+/).length;
  const readMinutes = Math.max(1, Math.ceil(totalWords / 200));

  return (
    <article className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-3 border-b border-stone-200 text-xs text-stone-500">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-semibold text-stone-700 hover:text-stone-950 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to News Wire</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href={`/category/${article.category}`} className="hover:text-stone-900 font-medium">
            {article.category}
          </Link>
          <span className="text-stone-300">&middot;</span>
          <span>{readMinutes} min read</span>
        </div>
      </div>

      {/* Article Header */}
      <header className="space-y-4 mb-8">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/category/${article.category}`}
            className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs ${catStyle.bg} ${catStyle.text}`}
          >
            {article.category}
          </Link>
          <span className="text-stone-300">&middot;</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-xs border ${srcStyle.bg} ${srcStyle.text} ${srcStyle.border}`}>
            {article.source}
          </span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-stone-900 tracking-tight leading-[1.15]">
          {article.title}
        </h1>

        {article.summary && (
          <p className="font-serif text-lg sm:text-xl text-stone-600 leading-relaxed border-l-2 border-stone-300 pl-4 py-1 italic">
            {article.summary}
          </p>
        )}

        <div className="pt-2 flex items-center justify-between text-xs text-stone-500 border-t border-stone-100">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <time dateTime={article.publishedAt}>
              Published {formatDateTime(article.publishedAt)}
            </time>
          </div>

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-stone-700 hover:text-stone-950 transition underline"
          >
            Original source ({article.source})
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Hero Image */}
      <div className="mb-10 overflow-hidden rounded-xs border border-stone-200 shadow-xs">
        <ImageWithFallback
          src={article.imageUrl}
          alt={article.title}
          category={article.category}
          aspectRatio="video"
          className="w-full h-full object-cover"
        />
        <div className="p-2 bg-stone-50 text-[11px] text-stone-500 font-sans border-t border-stone-100 flex items-center justify-between">
          <span>Reporting via {article.source}</span>
          <span className="text-stone-400">Canonical link verified</span>
        </div>
      </div>

      {/* Topic Cluster Context Banner */}
      {article.clusterId && (
        <aside className="mb-10 p-4 bg-stone-100/90 rounded-xs border border-stone-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-stone-700 shrink-0" />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Connected Topic Cluster
              </div>
              <div className="text-sm font-bold text-stone-900">
                {refineClusterLabel(article.clusterLabel)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/cluster/${article.clusterId}`}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-stone-300 text-stone-800 rounded-xs hover:bg-stone-50 transition whitespace-nowrap"
            >
              Cluster Thread
            </Link>
            <Link
              href="/timeline"
              className="px-3 py-1.5 text-xs font-semibold bg-stone-900 text-white rounded-xs hover:bg-stone-800 transition whitespace-nowrap"
            >
              Explore in Timeline &rarr;
            </Link>
          </div>
        </aside>
      )}

      {/* Article Body Content */}
      <div className="space-y-6 text-stone-800 text-base sm:text-lg leading-relaxed font-serif pb-12 border-b border-stone-200">
        {paragraphs.map((p, index) => (
          <p key={index} className="text-stone-800 leading-relaxed font-sans text-base sm:text-[17px]">
            {p}
          </p>
        ))}
      </div>

      {/* Publisher Attribution Box */}
      <section className="my-8 p-5 bg-stone-50 rounded-xs border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Publisher Attribution
          </div>
          <p className="text-xs text-stone-700">
            This article was originally published by <span className="font-semibold">{article.source}</span>.
          </p>
        </div>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white border border-stone-300 text-stone-900 rounded-xs hover:bg-stone-100 transition shadow-2xs"
        >
          Read on {article.source}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </section>

      {/* Related Stories */}
      {article.relatedArticles && article.relatedArticles.length > 0 && (
        <section className="mt-12 pt-8 border-t-2 border-stone-900">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 mb-6">
            {article.clusterLabel ? `More on "${refineClusterLabel(article.clusterLabel)}"` : 'Related Wire Reports'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {article.relatedArticles.slice(0, 4).map((rel) => (
              <ArticleCard key={rel.id} article={rel} variant="standard" />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
