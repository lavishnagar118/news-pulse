'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchTimeline, fetchArticles } from '@/lib/api';
import { TimelineItem, Article } from '@/lib/types';
import { BreakingStrip } from '@/components/news/BreakingStrip';
import { HeroSection } from '@/components/news/HeroSection';
import { LatestNewsGrid } from '@/components/news/LatestNewsGrid';
import { TrendingTopics } from '@/components/news/TrendingTopics';
import { CategorySections } from '@/components/news/CategorySections';
import { TimelinePreview } from '@/components/timeline/TimelinePreview';
import { ClusterDrawer } from '@/components/cluster/ClusterDrawer';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function HomePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial editorial feed & timeline data from real Node.js REST API
  const loadData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setError(null);
        setIsLoading(true);
      }
      // Fetch generous batch of articles so all category sections & latest grid are populated with real content
      const [timelineRes, articlesRes] = await Promise.all([
        fetchTimeline(),
        fetchArticles({ limit: 50, offset: 0 }),
      ]);

      if (timelineRes?.data) {
        setTimelineItems(timelineRes.data);
      }
      if (articlesRes?.data) {
        setArticles(articlesRes.data);
      }
      if (isInitial) {
        setError(null);
      }
    } catch (err: any) {
      if (isInitial) {
        setError(err?.message || 'Failed to load news content. Please verify that the backend API is running.');
      }
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Listen for global ingestion refresh event triggered from Header or external triggers
  useEffect(() => {
    const handleRefreshEvent = () => {
      loadData(false);
    };

    window.addEventListener('news-pulse-refresh', handleRefreshEvent);
    return () => {
      window.removeEventListener('news-pulse-refresh', handleRefreshEvent);
    };
  }, [loadData]);

  // Lead stories for Hero section (top 4 articles)
  const heroArticles = useMemo(() => articles.slice(0, 4), [articles]);

  // Latest news grid (articles 4 to 10 - 6 stories)
  const latestArticles = useMemo(() => articles.slice(4, 10), [articles]);

  // Remaining articles distributed to Category Sections
  const remainingArticles = useMemo(() => articles.slice(4), [articles]);

  return (
    <div className="pb-16">
      {/* 1. Breaking / Latest Wire Strip */}
      <BreakingStrip articles={articles.slice(0, 6)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-12">
        {/* Global Error Notification */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xs p-4 flex items-start justify-between gap-3 text-red-800 text-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to connect to News Pulse backend</p>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                loadData();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-900 px-3 py-1.5 rounded-xs transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-12 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-8 border-b border-stone-200">
              <div className="lg:col-span-7 space-y-4">
                <div className="aspect-video bg-stone-200 rounded-xs" />
                <div className="h-6 bg-stone-200 rounded w-3/4" />
                <div className="h-4 bg-stone-200 rounded w-1/2" />
              </div>
              <div className="lg:col-span-5 space-y-4">
                <div className="h-24 bg-stone-200 rounded-xs" />
                <div className="h-24 bg-stone-200 rounded-xs" />
                <div className="h-24 bg-stone-200 rounded-xs" />
              </div>
            </div>
          </div>
        )}

        {!isLoading && (
          <>
            {/* 2. Featured Stories Hero (1 Primary + 3 Secondary) */}
            <HeroSection articles={heroArticles} />

            {/* 3. Latest News Section (image-first cards with "View all" link to /latest) */}
            <LatestNewsGrid
              articles={latestArticles}
              title="Latest News"
              subtitle="Recent dispatches and verified reports from global publishers"
              viewAllHref="/latest"
            />

            {/* 4. Trending Topics Strip (real cluster labels with actual article counts) */}
            <TrendingTopics
              clusters={timelineItems}
              selectedClusterId={selectedClusterId}
              onSelectCluster={(id) => setSelectedClusterId(id)}
            />

            {/* 5. Category-based Story Sections (World, Politics, Business, Technology, etc.) */}
            <CategorySections articles={remainingArticles} />

            {/* 6. Pulse Timeline Preview (curated multi-article stories + "Explore full timeline →") */}
            <TimelinePreview
              clusters={timelineItems}
              onSelectCluster={(id) => setSelectedClusterId(id)}
            />
          </>
        )}

        {/* 7. Slide-Over Cluster Detail Drawer */}
        <ClusterDrawer
          clusterId={selectedClusterId}
          onClose={() => setSelectedClusterId(null)}
        />
      </div>
    </div>
  );
}
