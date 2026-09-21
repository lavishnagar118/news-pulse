import React from 'react';
import { Article } from '@/lib/types';

interface TimelineCardProps {
  article: Article;
}

export const TimelineCard: React.FC<TimelineCardProps> = ({ article }) => {
  return (
    <article className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition bg-white">
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
          {article.source || 'News Source'}
        </span>
        <time dateTime={article.publishedAt}>
          {new Date(article.publishedAt).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
      </div>
      <h3 className="text-base font-semibold text-gray-900 line-clamp-2 mt-1">
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {article.title}
        </a>
      </h3>
      {article.summary && (
        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{article.summary}</p>
      )}
    </article>
  );
};
