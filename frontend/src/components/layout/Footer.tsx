import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-stone-300 bg-stone-900 text-stone-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Masthead & Mission */}
          <div className="md:col-span-2 space-y-3">
            <span className="font-serif text-2xl font-black tracking-tight text-white">
              NEWS PULSE
            </span>
            <p className="text-xs tracking-widest uppercase font-sans text-stone-400 font-semibold">
              Stories, connected in time
            </p>
            <p className="text-sm text-stone-400 leading-relaxed max-w-md">
              A modern digital news publication and intelligence timeline. News Pulse continuously monitors
              public global journalism, automatically grouping evolving narratives into cohesive topic clusters
              along a chronological timeline.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-stone-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time ingestion active across 3 global news feeds</span>
            </div>
          </div>

          {/* Editorial Sections */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Editorial Sections
            </h3>
            <ul className="space-y-2 text-sm text-stone-400">
              <li>
                <Link href="/category/World" className="hover:text-white transition">
                  World News
                </Link>
              </li>
              <li>
                <Link href="/category/Politics" className="hover:text-white transition">
                  Politics
                </Link>
              </li>
              <li>
                <Link href="/category/Business" className="hover:text-white transition">
                  Business & Markets
                </Link>
              </li>
              <li>
                <Link href="/category/Technology" className="hover:text-white transition">
                  Technology
                </Link>
              </li>
              <li>
                <Link href="/category/Science" className="hover:text-white transition">
                  Science & Health
                </Link>
              </li>
              <li>
                <Link href="/latest" className="hover:text-white transition">
                  Latest Wire
                </Link>
              </li>
              <li>
                <Link href="/timeline" className="hover:text-white transition">
                  Pulse Timeline
                </Link>
              </li>
            </ul>
          </div>

          {/* Sources & Methodology */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Monitored Sources
            </h3>
            <ul className="space-y-2 text-sm text-stone-400">
              <li>
                <span className="text-stone-300 font-medium">BBC News</span> (World)
              </li>
              <li>
                <span className="text-stone-300 font-medium">NPR News</span> (Top Stories)
              </li>
              <li>
                <span className="text-stone-300 font-medium">Al Jazeera</span> (Global)
              </li>
            </ul>

            <h3 className="text-xs font-bold uppercase tracking-wider text-white mt-6 mb-2">
              Topic Intelligence
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              Stories are deterministically grouped into topic clusters using lexical TF-IDF vectorization and average-linkage cosine similarity.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-stone-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>
            &copy; {new Date().getFullYear()} News Pulse. All news content belongs to respective publisher sources.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-stone-300 transition">
              Home
            </Link>
            <Link href="/timeline" className="hover:text-stone-300 transition">
              Timeline
            </Link>
            <Link href="/latest" className="hover:text-stone-300 transition">
              Latest
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
