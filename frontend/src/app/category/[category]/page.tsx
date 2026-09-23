'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Sparkles, Layers } from 'lucide-react';
import { Article, TimelineItem } from '@/lib/types';
import { fetchArticles, fetchTimeline } from '@/lib/api';
import { ArticleCard } from '@/components/news/ArticleCard';
import { ClusterDrawer } from '@/components/cluster/ClusterDrawer';
import { refineClusterLabel } from '@/lib/formatters';

export default function CategoryPage() {
  const params = useParams();
  const categoryRaw = params?.category as string;
  const category = decodeURIComponent(categoryRaw || 'World');

  const [articles, setArticles] = useState<Article[]>([]);
  const [clusters, setClusters] = useState<TimelineItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>('All');
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);

  const loadCategoryData = useCallback((isInitial = false) => {
    if (isInitial) {
      setIsLoading(true);
    }
    Promise.all([
      fetchArticles({
        category: category,
        source: selectedSource !== 'All' ? selectedSource : undefined,
        limit: 30,
      }),
      fetchTimeline(),
    ])
      .then(([articlesRes, timelineRes]) => {
        if (articlesRes.data) {
          setArticles(articlesRes.data);
        }
        if (articlesRes.total !== undefined) {
          setTotal(articlesRes.total);
        }
        if (timelineRes.data) {
          setClusters(timelineRes.data);
        }
        if (isInitial) setIsLoading(false);
      })
      .catch(() => {
        if (isInitial) {
          setArticles([]);
          setTotal(0);
          setIsLoading(false);
        }
      });
  }, [category, selectedSource]);

  useEffect(() => {
    loadCategoryData(true);
  }, [loadCategoryData]);

  useEffect(() => {
    const handleRefresh = () => {
      loadCategoryData(false);
    };
    window.addEventListener('news-pulse-refresh', handleRefresh);
    return () => {
      window.removeEventListener('news-pulse-refresh', handleRefresh);
    };
  }, [loadCategoryData]);

  // Lead story + secondary stories partition
  const featuredStory = articles.length > 0 ? articles[0] : null;
  const secondaryStories = articles.slice(1);

  // Curate 4-6 trending topics
  const trendingTopics = clusters.slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-stone-500 pb-2 border-b border-stone-200">
        <Link href="/" className="hover:text-stone-900 flex items-center gap-1 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" />
          Front Page
        </Link>
        <span className="text-stone-300">&middot;</span>
        <span className="font-bold uppercase tracking-wider text-stone-900">{category}</span>
      </div>

      {/* Category Masthead */}
      <div className="border-b-2 border-stone-900 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
            Editorial Section
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-stone-900">
            {category}
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            {total} {total === 1 ? 'verified report' : 'verified reports'} across global publishers
          </p>
        </div>

        {/* Source Filter pills */}
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

      {/* Related Topics Bar */}
      {trendingTopics.length > 0 && (
        <div className="py-2.5 px-4 bg-stone-100/80 rounded-xs border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-1 font-bold uppercase tracking-wider text-stone-700 shrink-0">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Active Topics:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none no-scrollbar w-full py-0.5">
            {trendingTopics.map((cl) => (
              <button
                key={cl.id}
                type="button"
                onClick={() => setSelectedClusterId(cl.id)}
                className="px-2.5 py-0.5 rounded-full bg-white border border-stone-300 text-stone-700 hover:border-stone-900 hover:text-stone-950 transition whitespace-nowrap cursor-pointer flex items-center gap-1"
              >
                <span>{refineClusterLabel(cl.label)}</span>
                <span className="text-[10px] font-mono text-stone-400">({cl.articleCount})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content Rendering */}
      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-64 bg-stone-200 rounded-xs" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-48 bg-stone-200 rounded-xs" />
            ))}
          </div>
        </div>
      ) : articles.length === 0 ? (
        <div className="py-16 text-center text-stone-500 bg-white border border-stone-200 rounded-xs p-8 space-y-3">
          <p className="font-serif text-xl font-bold text-stone-800">
            No stories currently indexed in {category}
          </p>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Our ingestion pipeline continuously categorizes live reporting from BBC, NPR, and Al Jazeera. Check back shortly as new wires arrive.
          </p>
          <div className="pt-4 flex items-center justify-center gap-2 flex-wrap">
            {['World', 'Politics', 'Business', 'Technology', 'Science'].map((c) => (
              <Link
                key={c}
                href={`/category/${c}`}
                className="px-3 py-1 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xs transition"
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Featured Lead Story */}
          {featuredStory && (
            <div className="bg-white p-4 sm:p-6 border border-stone-200 rounded-xs shadow-2xs">
              <ArticleCard article={featuredStory} variant="horizontal" />
            </div>
          )}

          {/* Secondary Stories Grid */}
          {secondaryStories.length > 0 && (
            <div>
              <div className="border-b border-stone-200 pb-2 mb-4 text-xs font-mono uppercase tracking-wider text-stone-500 font-bold">
                More Coverage in {category}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {secondaryStories.map((article) => (
                  <ArticleCard key={article.id} article={article} variant="standard" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slide-over cluster drawer */}
      <ClusterDrawer
        clusterId={selectedClusterId}
        onClose={() => setSelectedClusterId(null)}
      />
    </div>
  );
}
