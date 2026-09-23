'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search as SearchIcon, X, ArrowLeft } from 'lucide-react';
import { Article } from '@/lib/types';
import { searchArticles } from '@/lib/api';
import { ArticleCard } from '@/components/news/ArticleCard';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    if (!initialQuery) {
      setArticles([]);
      setTotal(0);
      setIsError(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    searchArticles(initialQuery, {
      category: selectedCategory !== 'All' ? selectedCategory : undefined,
      limit: 30,
    })
      .then((res) => {
        setArticles(res.data);
        setTotal(res.total);
        setIsError(false);
        setIsLoading(false);
      })
      .catch(() => {
        setArticles([]);
        setTotal(0);
        setIsError(true);
        setIsLoading(false);
      });
  }, [initialQuery, selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleClear = () => {
    setQuery('');
    router.push('/search');
  };

  const categories = ['All', 'World', 'Politics', 'Business', 'Technology', 'Science', 'Health', 'Sports', 'Entertainment'];

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Back button */}
      <div className="pb-2 border-b border-stone-200">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Wire
        </Link>
      </div>

      {/* Search Bar Container */}
      <div className="bg-stone-50 p-6 rounded-xs border border-stone-200 space-y-4">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
          Search Global News & Topics
        </h1>

        <form onSubmit={handleSearch} className="relative max-w-2xl">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords, headlines, topics..."
            className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-stone-300 rounded-xs focus:outline-none focus:border-stone-600 focus:ring-1 focus:ring-stone-600"
          />
          <SearchIcon className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-stone-400 hover:text-stone-700 absolute right-3 top-1/2 -translate-y-1/2"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Category filters */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 text-xs">
          <span className="font-semibold text-stone-500 mr-1">Filter category:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-full border transition cursor-pointer font-medium ${
                selectedCategory === cat
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      {initialQuery && (
        <div className="border-b border-stone-200 pb-2 flex items-baseline justify-between">
          <p className="text-sm text-stone-600">
            Found <span className="font-bold text-stone-900">{total}</span> results for &ldquo;
            <span className="font-semibold text-stone-900">{initialQuery}</span>&rdquo;
          </p>
        </div>
      )}

      {/* Results Grid */}
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
      ) : isError ? (
        <div className="py-16 text-center text-stone-600 space-y-3">
          <p className="font-serif text-lg font-bold text-stone-800">
            Search is temporarily unavailable. The latest stories are still available.
          </p>
          <p className="text-xs text-stone-500">
            Our live search index is waking up. You can browse the latest news wire or return to the front page.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-stone-900 text-white rounded-xs hover:bg-stone-800 transition"
            >
              Front Page
            </Link>
            <Link
              href="/latest"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-stone-300 text-stone-700 rounded-xs hover:bg-stone-50 transition"
            >
              Latest Wire
            </Link>
          </div>
        </div>
      ) : articles.length === 0 ? (
        initialQuery ? (
          <div className="py-16 text-center text-stone-500">
            <p className="font-serif text-lg font-bold text-stone-800">No articles matched &ldquo;{initialQuery}&rdquo;</p>
            <p className="text-xs text-stone-500 mt-1">Try another keyword or remove the category filter.</p>
          </div>
        ) : (
          <div className="py-16 text-center text-stone-400">
            <p className="text-sm">Type a search query above to browse matching articles.</p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((art) => (
            <ArticleCard key={art.id} article={art} variant="standard" />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-stone-500 text-sm">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
