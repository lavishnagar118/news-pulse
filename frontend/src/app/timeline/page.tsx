'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Sparkles, X, Activity } from 'lucide-react';
import { TimelineItem } from '@/lib/types';
import { fetchTimeline } from '@/lib/api';
import { TimelineView } from '@/components/timeline/TimelineView';
import { SourceFilter } from '@/components/filters/SourceFilter';
import { ClusterDrawer } from '@/components/cluster/ClusterDrawer';
import { refineClusterLabel } from '@/lib/formatters';

export default function TimelinePage() {
  const [clusters, setClusters] = useState<TimelineItem[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [searchTopic, setSearchTopic] = useState<string>('');
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTimeline = () => {
    setIsLoading(true);
    fetchTimeline()
      .then((res) => {
        setClusters(res.data || []);
        const s = res.sources || ['BBC News', 'NPR News', 'Al Jazeera'];
        setSources(s);
        setSelectedSources((prev) => (prev.length === 0 ? s : prev));
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadTimeline();
  }, []);

  const handleToggleSource = (source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  // Filtered clusters based on source selection and optional search keyword
  const filteredClusters = useMemo(() => {
    return clusters.filter((c) => {
      // Source match: at least one enabled source
      const matchesSource =
        selectedSources.length === sources.length ||
        (c.sources && c.sources.some((s) => selectedSources.includes(s)));

      if (!matchesSource) return false;

      // Keyword topic search match
      if (searchTopic.trim()) {
        const query = searchTopic.toLowerCase().trim();
        const refined = refineClusterLabel(c.label).toLowerCase();
        const raw = (c.label || '').toLowerCase();
        return refined.includes(query) || raw.includes(query);
      }

      return true;
    });
  }, [clusters, selectedSources, sources, searchTopic]);

  const multiArticleCount = useMemo(
    () => filteredClusters.filter((c) => c.articleCount >= 2).length,
    [filteredClusters]
  );

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-stone-500 pb-2 border-b border-stone-200">
        <Link href="/" className="hover:text-stone-900 flex items-center gap-1 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" />
          Front Page
        </Link>
        <span className="text-stone-300">&middot;</span>
        <span className="font-bold uppercase tracking-wider text-stone-900">Temporal Intelligence</span>
      </div>

      {/* Page Header */}
      <div className="border-b-2 border-stone-900 pb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <Activity className="w-4 h-4 text-amber-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
            Chronological Narrative Architecture
          </span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-stone-900">
          Pulse Timeline
        </h1>
        <p className="font-serif text-base sm:text-lg text-stone-600 italic mt-1">
          Stories, connected in time.
        </p>
        <p className="text-xs sm:text-sm text-stone-600 mt-2 max-w-2xl leading-relaxed">
          Examine how global news narratives evolved across publishers. Related articles are deterministically grouped
          via TF-IDF cosine similarity, mapping developing stories as continuous temporal blocks.
        </p>
      </div>

      {/* Control Matrix: Sources & Search Filter */}
      <div className="space-y-4">
        {/* Source Filter */}
        <SourceFilter
          sources={sources}
          selectedSources={selectedSources}
          onToggleSource={handleToggleSource}
          onSelectAll={() => setSelectedSources(sources)}
          onClearAll={() => setSelectedSources([])}
          totalClustersCount={clusters.length}
          filteredClustersCount={filteredClusters.length}
        />

        {/* Topic Search & Stats Bar */}
        <div className="bg-stone-50 p-4 rounded-xs border border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Keyword Search */}
          <div className="relative max-w-md w-full">
            <input
              type="text"
              value={searchTopic}
              onChange={(e) => setSearchTopic(e.target.value)}
              placeholder="Search narrative topics (e.g. Election, China, Police)..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-stone-300 rounded-xs focus:outline-none focus:border-stone-600 focus:ring-1 focus:ring-stone-600"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchTopic && (
              <button
                type="button"
                onClick={() => setSearchTopic('')}
                className="p-1 text-stone-400 hover:text-stone-700 absolute right-2.5 top-1/2 -translate-y-1/2"
                aria-label="Clear topic filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 text-xs font-mono text-stone-600 self-end sm:self-center">
            <span>
              <strong className="text-stone-900">{filteredClusters.length}</strong> active clusters
            </span>
            <span className="text-stone-300">&middot;</span>
            <span>
              <strong className="text-stone-900">{multiArticleCount}</strong> developing narratives
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Visual Timeline Canvas */}
      <TimelineView
        clusters={filteredClusters}
        selectedClusterId={selectedClusterId}
        onSelectCluster={(id) => setSelectedClusterId(id)}
        isLoading={isLoading}
      />

      {/* Slide-Over Cluster Detail Drawer */}
      <ClusterDrawer
        clusterId={selectedClusterId}
        onClose={() => setSelectedClusterId(null)}
      />
    </div>
  );
}
