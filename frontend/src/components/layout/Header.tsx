'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, RefreshCw, Menu, X, Activity } from 'lucide-react';
import { triggerIngestion, pollJobStatus, fetchLatestJobStatus } from '@/lib/api';

const CATEGORIES = [
  { name: 'Home', href: '/' },
  { name: 'Latest', href: '/latest' },
  { name: 'World', href: '/category/World' },
  { name: 'Politics', href: '/category/Politics' },
  { name: 'Business', href: '/category/Business' },
  { name: 'Technology', href: '/category/Technology' },
  { name: 'Science', href: '/category/Science' },
  { name: 'Health', href: '/category/Health' },
  { name: 'Sports', href: '/category/Sports' },
  { name: 'Entertainment', href: '/category/Entertainment' },
  { name: 'Pulse Timeline', href: '/timeline', highlight: true },
];

interface HeaderProps {
  onRefreshSuccess?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onRefreshSuccess }) => {
  const pathname = usePathname();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [lastUpdatedText, setLastUpdatedText] = useState<string | null>(null);

  useEffect(() => {
    const updateTimestamp = async () => {
      const job = await fetchLatestJobStatus();
      if (job?.completedAt) {
        const d = new Date(job.completedAt);
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
        setLastUpdatedText(`Last synced: ${timeStr}`);
      }
    };
    updateTimestamp();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshMessage('Connecting to feeds...');

    try {
      const { jobId } = await triggerIngestion();
      setRefreshMessage('Processing feeds & stories...');

      const completedJob = await pollJobStatus(jobId, (job) => {
        if (job.status === 'running') {
          if (job.stats && job.stats.articlesFetched > 0) {
            setRefreshMessage('Clustering topics...');
          } else {
            setRefreshMessage('Ingesting feeds...');
          }
        }
      });

      const added = completedJob.stats?.articlesAdded ?? 0;
      const dupes = completedJob.stats?.duplicatesSkipped ?? 0;

      if (added > 0) {
        setRefreshMessage(`Updated just now · ${added} new ${added === 1 ? 'story' : 'stories'} · ${dupes} skipped`);
      } else {
        setRefreshMessage("You're up to date · No new stories found");
      }

      setLastUpdatedText('Last synced: just now');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('news-pulse-refresh'));
      }
      router.refresh();
      if (onRefreshSuccess) {
        onRefreshSuccess();
      }
      setTimeout(() => {
        setRefreshMessage(null);
        setIsRefreshing(false);
      }, 5000);
    } catch (err: any) {
      setRefreshMessage(err.message || 'Refresh failed');
      setTimeout(() => {
        setRefreshMessage(null);
        setIsRefreshing(false);
      }, 4000);
    }
  };

  // Formatted current date
  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="border-b border-stone-200 bg-white sticky top-0 z-40">
      {/* Top Utility Masthead Bar */}
      <div className="border-b border-stone-100 bg-stone-50/70 text-stone-600 text-xs py-1.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-medium tracking-wide text-stone-700">{todayStr}</span>
            <span className="hidden md:inline-block text-stone-300">|</span>
            <span className="hidden md:inline-block font-semibold uppercase tracking-wider text-[11px] text-stone-500">
              Global Edition
            </span>
            {lastUpdatedText && (
              <>
                <span className="hidden lg:inline-block text-stone-300">|</span>
                <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] text-stone-500 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {lastUpdatedText}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Live Ingestion Refresh Button */}
            <div className="flex items-center gap-2">
              {refreshMessage && (
                <span className="text-[11px] font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 animate-pulse">
                  {refreshMessage}
                </span>
              )}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-semibold bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition disabled:opacity-60 cursor-pointer shadow-2xs"
                title="Trigger real-time RSS ingestion and topic clustering"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-stone-500'}`} />
                <span>{isRefreshing ? 'Updating...' : 'Refresh Data'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Masthead / Logo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex items-center justify-between">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-stone-700 hover:bg-stone-100 rounded-sm"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Center Logo */}
        <div className="flex-1 md:flex-initial text-center md:text-left">
          <Link href="/" className="inline-block group">
            <span className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-stone-900 group-hover:text-stone-700 transition">
              NEWS PULSE
            </span>
            <p className="text-[11px] sm:text-xs tracking-widest uppercase font-sans text-stone-500 font-semibold mt-0.5">
              Stories, connected in time
            </p>
          </Link>
        </div>

        {/* Desktop Search Input */}
        <div className="hidden md:flex items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-56 lg:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search news & topics..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-100/80 border border-stone-200 rounded-sm focus:outline-none focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </form>
        </div>

        {/* Mobile Search Toggle */}
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-2 text-stone-700 hover:bg-stone-100 rounded-sm"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Search Input Overlay */}
      {isSearchOpen && (
        <div className="md:hidden px-4 pb-3 border-b border-stone-200 bg-white">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search headlines, topics, or sources..."
              autoFocus
              className="w-full pl-9 pr-3 py-2 text-sm bg-stone-100 border border-stone-300 rounded-sm focus:outline-none focus:bg-white focus:border-stone-500"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </form>
        </div>
      )}

      {/* Editorial Category Navigation Bar */}
      <nav className="border-t border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none no-scrollbar">
            {CATEGORIES.map((cat) => {
              const isActive =
                cat.href === '/'
                  ? pathname === '/'
                  : pathname === cat.href || (cat.href.startsWith('/category/') && pathname.startsWith(cat.href));

              return (
                <Link
                  key={cat.name}
                  href={cat.href}
                  className={`text-xs font-semibold px-2.5 py-1.5 whitespace-nowrap rounded-xs transition-colors shrink-0 ${
                    cat.highlight
                      ? 'bg-stone-900 text-white hover:bg-stone-800 flex items-center gap-1.5'
                      : isActive
                      ? 'text-stone-900 border-b-2 border-stone-900 font-bold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  {cat.highlight && <Activity className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{cat.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 py-4 space-y-1 shadow-lg">
          <div className="font-semibold text-xs text-stone-400 uppercase tracking-wider mb-2">
            Categories & Sections
          </div>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.name}
              href={cat.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3 py-2 text-sm font-medium rounded-sm ${
                cat.highlight
                  ? 'bg-stone-900 text-white flex items-center gap-2'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              {cat.highlight && <Activity className="w-4 h-4 text-amber-400" />}
              <span>{cat.name}</span>
            </Link>
          ))}
        </div>
      )}
    </header>
  );
};
