'use client';

import React from 'react';
import Link from 'next/link';
import { Article } from '@/lib/types';
import { formatRelativeTime } from '@/lib/formatters';

interface BreakingStripProps {
  articles: Article[];
}

export const BreakingStrip: React.FC<BreakingStripProps> = ({ articles }) => {
  if (!articles || articles.length === 0) return null;

  // Show top 4 latest stories
  const items = articles.slice(0, 4);

  return (
    <div className="border-b border-stone-200 bg-stone-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 overflow-hidden">
        {/* Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-[11px] font-black uppercase tracking-wider text-red-400">
            LATEST WIRE
          </span>
          <span className="text-stone-700 hidden sm:inline">|</span>
        </div>

        {/* Stories list */}
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-none no-scrollbar py-0.5 w-full text-xs">
          {items.map((art) => (
            <Link
              key={art.id}
              href={`/article/${art.id}`}
              className="group flex items-center gap-2 shrink-0 hover:text-stone-200 transition"
            >
              <span className="font-semibold text-stone-300 group-hover:text-white transition">
                {art.title}
              </span>
              <span className="text-[10px] text-stone-400 font-sans">
                ({art.source} &middot; {formatRelativeTime(art.publishedAt)})
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
