'use client';

import React from 'react';
import Link from 'next/link';
import { Article } from '@/lib/types';
import { ArticleCard } from './ArticleCard';
import { ArrowRight } from 'lucide-react';

interface CategorySectionsProps {
  articles: Article[];
}

const ORDERED_CATEGORIES = [
  { key: 'World', label: 'World News', subtitle: 'Global reporting and international affairs' },
  { key: 'Politics', label: 'Politics & Governance', subtitle: 'Policy, diplomacy, and electoral developments' },
  { key: 'Business', label: 'Business & Economy', subtitle: 'Markets, industry dispatches, and commerce' },
  { key: 'Technology', label: 'Technology & Science', subtitle: 'Computing, digital trends, and artificial intelligence' },
  { key: 'Science', label: 'Science & Environment', subtitle: 'Research discoveries, climate, and space' },
  { key: 'Health', label: 'Health & Medicine', subtitle: 'Public healthcare, medical research, and wellness' },
  { key: 'Sports', label: 'Sports & Competition', subtitle: 'Athletic results, tournaments, and club coverage' },
  { key: 'Entertainment', label: 'Culture & Entertainment', subtitle: 'Arts, media, cinema, and literature' },
];

export const CategorySections: React.FC<CategorySectionsProps> = ({ articles }) => {
  if (!articles || articles.length === 0) return null;

  // Group articles by category (case-insensitive)
  const categoryMap = new Map<string, Article[]>();
  for (const art of articles) {
    const cat = art.category || 'General';
    const existing = categoryMap.get(cat) || [];
    existing.push(art);
    categoryMap.set(cat, existing);
  }

  // Filter categories that have at least 1 article
  const activeSections = ORDERED_CATEGORIES.filter((catDef) => {
    const matched = categoryMap.get(catDef.key);
    return matched && matched.length > 0;
  });

  if (activeSections.length === 0) return null;

  return (
    <div className="space-y-12">
      {activeSections.map((sec) => {
        const catArticles = categoryMap.get(sec.key) || [];
        // Show up to 3 articles per category section
        const displayArticles = catArticles.slice(0, 3);

        return (
          <section key={sec.key} className="border-t-2 border-stone-900 pt-6" aria-label={sec.label}>
            {/* Section Masthead */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 mb-6 border-b border-stone-200">
              <div>
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Section
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-black tracking-tight text-stone-900">
                  {sec.label}
                </h2>
                <p className="text-xs text-stone-600 mt-0.5">{sec.subtitle}</p>
              </div>

              <Link
                href={`/category/${sec.key}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-800 hover:text-stone-950 hover:underline transition self-start sm:self-end"
              >
                <span>View all {sec.key}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Articles Grid (3 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayArticles.map((art) => (
                <ArticleCard key={art.id} article={art} variant="standard" />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};
