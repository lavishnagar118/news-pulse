'use client';

import React from 'react';
import Link from 'next/link';
import { Article } from '@/lib/types';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { formatRelativeTime, getCategoryBadgeStyle, getSourceBadgeStyle } from '@/lib/formatters';

interface HeroSectionProps {
  articles: Article[];
}

export const HeroSection: React.FC<HeroSectionProps> = ({ articles }) => {
  if (!articles || articles.length === 0) return null;

  const leadStory = articles[0];
  const secondaryStories = articles.slice(1, 4);

  const leadSourceStyle = getSourceBadgeStyle(leadStory.source);
  const leadCatStyle = getCategoryBadgeStyle(leadStory.category);

  return (
    <section className="border-b border-stone-200 pb-8 mb-8" aria-label="Lead Stories">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Primary Lead Story (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <Link href={`/article/${leadStory.id}`} className="group block space-y-4">
            <div className="overflow-hidden rounded-xs border border-stone-200 shadow-2xs">
              <ImageWithFallback
                src={leadStory.imageUrl}
                alt={leadStory.title}
                category={leadStory.category}
                aspectRatio="video"
                className="group-hover:scale-102 transition duration-500 ease-out"
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs">
                <span className={`font-bold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded-xs ${leadCatStyle.bg} ${leadCatStyle.text}`}>
                  {leadStory.category}
                </span>
                <span className="text-stone-300">&middot;</span>
                <span className={`px-2 py-0.5 rounded-xs border text-[11px] font-semibold ${leadSourceStyle.bg} ${leadSourceStyle.text} ${leadSourceStyle.border}`}>
                  {leadStory.source}
                </span>
                <span className="text-stone-400 text-xs">
                  {formatRelativeTime(leadStory.publishedAt)}
                </span>
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-stone-900 group-hover:text-stone-700 transition leading-snug">
                {leadStory.title}
              </h1>

              {leadStory.summary && (
                <p className="text-stone-600 text-sm sm:text-base leading-relaxed line-clamp-3">
                  {leadStory.summary}
                </p>
              )}

              <div className="pt-1 flex items-center text-xs font-semibold text-stone-900 group-hover:underline">
                Read full report &rarr;
              </div>
            </div>
          </Link>
        </div>

        {/* Secondary Stories Column (5 cols) */}
        <div className="lg:col-span-5 flex flex-col divide-y divide-stone-200">
          <div className="pb-2 mb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Top Developing Stories
          </div>
          {secondaryStories.map((story) => {
            const catStyle = getCategoryBadgeStyle(story.category);
            const srcStyle = getSourceBadgeStyle(story.source);

            return (
              <article key={story.id} className="py-4 first:pt-0 last:pb-0">
                <Link href={`/article/${story.id}`} className="group grid grid-cols-1 sm:grid-cols-12 gap-4">
                  {/* Thumbnail (4 cols) */}
                  <div className="sm:col-span-4 overflow-hidden rounded-xs border border-stone-200">
                    <ImageWithFallback
                      src={story.imageUrl}
                      alt={story.title}
                      category={story.category}
                      aspectRatio="video"
                      className="group-hover:scale-105 transition duration-300"
                    />
                  </div>

                  {/* Content (8 cols) */}
                  <div className="sm:col-span-8 flex flex-col justify-between space-y-1">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${catStyle.text}`}>
                          {story.category}
                        </span>
                        <span className="text-stone-300">&middot;</span>
                        <span className="text-stone-400 text-[11px]">
                          {formatRelativeTime(story.publishedAt)}
                        </span>
                      </div>
                      <h2 className="font-serif text-sm sm:text-base font-bold text-stone-900 group-hover:text-stone-700 transition line-clamp-2 leading-snug">
                        {story.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-[11px]">
                      <span className={`px-1.5 py-0.5 rounded-xs border font-medium ${srcStyle.bg} ${srcStyle.text} ${srcStyle.border}`}>
                        {story.source}
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
