'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, RefreshCw, Menu, X, Activity } from 'lucide-react';
import { triggerIngestion, pollJobStatus, fetchLatestJobStatus } from '@/lib/api';
import { useScrollState } from '@/hooks/useScrollState';
import { formatRefreshCompletion, formatRefreshError } from '@/lib/formatters';

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
  const { isScrolled } = useScrollState({ thresholdDown: 48, thresholdUp: 16 });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [pathname]);

  // Focus mobile search when toggled
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Fetch initial latest sync timestamp
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
    setRefreshMessage('Refreshing news…');

    try {
      const { jobId } = await triggerIngestion();
      setRefreshMessage('Processing latest stories…');

      const completedJob = await pollJobStatus(jobId, (job) => {
        if (job.status === 'running') {
          setRefreshMessage('Processing latest stories…');
        }
      });

      const completionText = formatRefreshCompletion(completedJob.stats);
      setRefreshMessage(completionText);
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
      setRefreshMessage(formatRefreshError(err));
      setTimeout(() => {
        setRefreshMessage(null);
        setIsRefreshing(false);
      }, 4000);
    }
  };

  // Formatted date string for editorial masthead
  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <header
      role="banner"
      aria-label="Site Header"
      className={`sticky top-0 z-40 bg-white/98 backdrop-blur-xs w-full transition-[box-shadow,border-color] duration-200 ${
        isScrolled
          ? 'border-b border-stone-200/90 shadow-xs'
          : 'border-b border-stone-200'
      }`}
    >
      {/* 1. Top Broadsheet Utility Bar (collapses smoothly on scroll) */}
      <div
        className={`border-b border-stone-100 bg-stone-50/80 text-stone-600 text-xs px-4 sm:px-6 lg:px-8 transition-[max-height,opacity,padding] duration-200 ease-out overflow-hidden ${
          isScrolled ? 'max-h-0 opacity-0 py-0 border-none pointer-events-none' : 'max-h-12 opacity-100 py-1.5'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs">
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

          <div className="flex items-center gap-2 sm:gap-3" aria-live="polite" aria-atomic="true">
            {refreshMessage && (
              <span className="text-[11px] font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 truncate max-w-[240px] sm:max-w-none">
                {refreshMessage}
              </span>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label={isRefreshing ? 'Refreshing news stories' : 'Refresh news data'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-xs font-semibold bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors disabled:opacity-60 cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-stone-400"
              title="Trigger real-time RSS ingestion and topic clustering"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-stone-600' : 'text-stone-500'}`} />
              <span>{isRefreshing ? 'Refreshing…' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Editorial Header Row (Height: ~76px unscrolled, ~58–64px scrolled) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex items-center justify-between transition-[padding,height] duration-200 ease-out ${
            isScrolled ? 'py-2 sm:py-2.5 min-h-[56px] sm:min-h-[60px]' : 'py-3 sm:py-4 lg:py-5 min-h-[68px] sm:min-h-[76px]'
          }`}
        >
          {/* Mobile Menu Toggle Button (Comfortable 44x44px touch target) */}
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-700 hover:bg-stone-100 active:bg-stone-200 rounded-xs transition-colors focus:outline-none focus:ring-2 focus:ring-stone-400"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Editorial Brand Masthead */}
          <div className="flex items-center gap-3 sm:gap-6 flex-1 lg:flex-initial text-center lg:text-left justify-center lg:justify-start">
            <Link
              href="/"
              className="inline-block group focus:outline-none focus:ring-2 focus:ring-stone-400 rounded-xs"
              aria-label="News Pulse Homepage"
            >
              <span
                className={`font-serif font-black tracking-tight text-stone-900 group-hover:text-stone-700 transition-[font-size] duration-200 block ${
                  isScrolled
                    ? 'text-xl sm:text-2xl'
                    : 'text-2xl sm:text-3xl lg:text-4xl xl:text-5xl'
                }`}
              >
                NEWS PULSE
              </span>
              {!isScrolled && (
                <p className="text-[10px] sm:text-xs tracking-widest uppercase font-sans text-stone-500 font-semibold mt-0.5 hidden sm:block">
                  Stories, connected in time
                </p>
              )}
            </Link>
          </div>

          {/* Compact Category Navigation (Rendered inline in compact sticky header on desktop/tablet) */}
          {isScrolled && (
            <nav
              aria-label="Compact Navigation"
              className="hidden lg:flex items-center space-x-1 xl:space-x-1.5 overflow-x-auto no-scrollbar mx-4 py-1"
            >
              {CATEGORIES.map((cat) => {
                const isActive =
                  cat.href === '/'
                    ? pathname === '/'
                    : pathname === cat.href || (cat.href.startsWith('/category/') && pathname.startsWith(cat.href));

                return (
                  <Link
                    key={cat.name}
                    href={cat.href}
                    className={`text-xs font-semibold px-2 xl:px-2.5 py-1 whitespace-nowrap rounded-xs transition-colors shrink-0 focus:outline-none focus:ring-1 focus:ring-stone-400 ${
                      cat.highlight
                        ? 'bg-stone-900 text-white hover:bg-stone-800 flex items-center gap-1 shadow-2xs'
                        : isActive
                        ? 'text-stone-900 bg-stone-100 font-bold border-b-2 border-stone-900'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    {cat.highlight && <Activity className="w-3 h-3 text-amber-400" />}
                    <span>{cat.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Desktop Right Controls: Search & Scrolled Refresh Button */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {/* Scrolled State Refresh Trigger */}
            {isScrolled && (
              <div className="flex items-center gap-2" aria-live="polite" aria-atomic="true">
                {refreshMessage && (
                  <span className="text-[11px] font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 truncate max-w-[200px]">
                    {refreshMessage}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  aria-label={isRefreshing ? 'Refreshing news stories' : 'Refresh news data'}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xs text-xs font-semibold bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors disabled:opacity-60 cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-stone-400"
                  title="Trigger real-time RSS ingestion and topic clustering"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-stone-600' : 'text-stone-500'}`} />
                  <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
                </button>
              </div>
            )}

            {/* Desktop Search Input Form */}
            <form onSubmit={handleSearchSubmit} className="relative w-44 xl:w-56" role="search">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics..."
                aria-label="Search articles and topics"
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-100/90 border border-stone-200 rounded-xs focus:outline-none focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-colors"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </form>
          </div>

          {/* Mobile & Tablet Right Controls (Comfortable 44x44px touch targets) */}
          <div className="flex items-center gap-1 lg:hidden">
            {/* Scrolled Mobile Refresh Button */}
            {isScrolled && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                aria-label="Refresh news data"
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-700 hover:bg-stone-100 active:bg-stone-200 rounded-xs transition-colors relative focus:outline-none focus:ring-2 focus:ring-stone-400"
                title="Refresh news stories"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-stone-600'}`} />
                {lastUpdatedText && !isRefreshing && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-2 right-2"></span>
                )}
              </button>
            )}

            {/* Search Toggle Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label={isSearchOpen ? 'Close search input' : 'Open search input'}
              aria-expanded={isSearchOpen}
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-700 hover:bg-stone-100 active:bg-stone-200 rounded-xs transition-colors focus:outline-none focus:ring-2 focus:ring-stone-400"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Mobile Search Dropdown Bar (accessible and smooth) */}
      {isSearchOpen && (
        <div className="lg:hidden px-4 pb-3 pt-1 border-t border-stone-200 bg-stone-50/95 transition-all">
          <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xl mx-auto" role="search">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search headlines, topics, or sources..."
              aria-label="Search news topics"
              className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-stone-300 rounded-xs focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-700 absolute right-1.5 top-1/2 -translate-y-1/2"
                aria-label="Clear search input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>
      )}

      {/* 4. Full Broadsheet Category Navigation Bar (Visible when unscrolled) */}
      <nav
        aria-label="Section Navigation"
        className={`border-t border-stone-200 bg-white transition-[max-height,opacity] duration-200 ease-out overflow-hidden ${
          isScrolled ? 'max-h-0 opacity-0 border-none pointer-events-none' : 'max-h-14 opacity-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const isActive =
                cat.href === '/'
                  ? pathname === '/'
                  : pathname === cat.href || (cat.href.startsWith('/category/') && pathname.startsWith(cat.href));

              return (
                <Link
                  key={cat.name}
                  href={cat.href}
                  className={`text-xs font-semibold px-2.5 py-1.5 whitespace-nowrap rounded-xs transition-colors shrink-0 focus:outline-none focus:ring-1 focus:ring-stone-400 ${
                    cat.highlight
                      ? 'bg-stone-900 text-white hover:bg-stone-800 flex items-center gap-1.5 shadow-2xs'
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

      {/* 5. Mobile & Tablet Navigation Drawer */}
      {isMobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          className="lg:hidden border-t border-stone-200 bg-white px-4 py-4 space-y-1 shadow-lg max-h-[calc(100vh-64px)] overflow-y-auto"
        >
          {/* Metadata pill in mobile menu */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-stone-100 text-xs text-stone-500">
            <span>{todayStr}</span>
            {lastUpdatedText && (
              <span className="flex items-center gap-1 font-medium text-stone-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {lastUpdatedText}
              </span>
            )}
          </div>

          <div className="font-semibold text-xs text-stone-400 uppercase tracking-wider mb-2">
            Categories & Sections
          </div>

          {CATEGORIES.map((cat) => {
            const isActive =
              cat.href === '/'
                ? pathname === '/'
                : pathname === cat.href || (cat.href.startsWith('/category/') && pathname.startsWith(cat.href));

            return (
              <Link
                key={cat.name}
                href={cat.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`min-h-[44px] flex items-center px-3.5 py-2.5 text-sm font-medium rounded-xs transition-colors ${
                  cat.highlight
                    ? 'bg-stone-900 text-white flex items-center gap-2 font-bold'
                    : isActive
                    ? 'bg-stone-100 text-stone-950 font-bold border-l-2 border-stone-900'
                    : 'text-stone-700 hover:bg-stone-50 active:bg-stone-100'
                }`}
              >
                {cat.highlight && <Activity className="w-4 h-4 text-amber-400" />}
                <span>{cat.name}</span>
              </Link>
            );
          })}

          {/* Drawer Refresh Button */}
          <div className="pt-4 mt-2 border-t border-stone-100" aria-live="polite" aria-atomic="true">
            {refreshMessage && (
              <div className="mb-2 text-xs font-medium text-stone-700 bg-stone-50 px-3 py-1.5 rounded-xs border border-stone-200 text-center">
                {refreshMessage}
              </div>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label={isRefreshing ? 'Refreshing news stories' : 'Refresh news data'}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 rounded-xs transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-stone-600' : 'text-stone-600'}`} />
              <span>{isRefreshing ? 'Refreshing news…' : 'Refresh News Data'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
