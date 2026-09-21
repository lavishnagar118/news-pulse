'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Article } from '@/lib/types';
import { fetchArticles } from '@/lib/api';
import { ArticleCard } from '@/components/news/ArticleCard';

export default function LatestPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(24);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>('All');

  useEffect(() => {
    setIsLoading(true);
    fetchArticles({
      source: selectedSource !== 'All' ? selectedSource : undefined,
      limit,
    })
      .then((res) => {
        setArticles(res.data);
        setTotal(res.total);
        setIsLoading(false);
      })
      .catch(() => {
        setArticles([]);
        setIsLoading(false);
      });
  }, [selectedSource, limit]);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center gap-2 text-xs text-stone-500 pb-2 border-b border-stone-200">
        <Link href="/" className="hover:text-stone-900 flex items-center gap-1 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" />
          Home
        </Link>
        <span className="text-stone-300">&middot;</span>
        <span className="font-bold uppercase tracking-wider text-stone-900">Latest Wire</span>
      </div>

      <div className="border-b-2 border-stone-900 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-red-600">
            Real-Time Feed
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-stone-900">
            Latest News Wire
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Chronological stream across all monitored publishers &middot; {total} total articles indexed
          </p>
        </div>

        {/* Source Pills */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {['All', 'BBC News', 'NPR News', 'Al Jazeera'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSelectedSource(s)}
              className={`px-3 py-1 rounded-full border transition cursor-pointer font-medium ${
                selectedSource === s
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="space-y-3 bg-white p-4 border border-stone-200 rounded-xs">
              <div className="aspect-video bg-stone-200 rounded" />
              <div className="h-4 bg-stone-200 rounded w-20" />
              <div className="h-5 bg-stone-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="py-16 text-center text-stone-500">
          <p className="font-serif text-lg font-bold text-stone-800">No wire stories found</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((art) => (
              <ArticleCard key={art.id} article={art} variant="standard" />
            ))}
          </div>

          {articles.length < total && (
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => setLimit((prev) => prev + 24)}
                className="px-6 py-2 text-xs font-bold uppercase tracking-wider bg-white border border-stone-300 text-stone-800 hover:bg-stone-100 rounded-xs transition cursor-pointer shadow-2xs"
              >
                Load More Articles ({total - articles.length} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
