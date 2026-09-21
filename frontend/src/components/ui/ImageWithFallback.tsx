'use client';

import React, { useState } from 'react';
import { Newspaper } from 'lucide-react';

interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  className?: string;
  category?: string;
  aspectRatio?: 'video' | 'square' | 'portrait' | 'auto';
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  category = 'News',
  aspectRatio = 'auto',
}) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const hasValidSrc = Boolean(src && src.trim().length > 0 && !error);

  const aspectClass =
    aspectRatio === 'video'
      ? 'aspect-video'
      : aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === 'portrait'
      ? 'aspect-[3/4]'
      : '';

  if (!hasValidSrc) {
    return (
      <div
        className={`relative overflow-hidden bg-linear-to-br from-stone-800 via-stone-900 to-zinc-950 flex flex-col items-center justify-center text-stone-400 select-none ${aspectClass} ${className}`}
        aria-label={alt}
      >
        {/* Subtle decorative editorial grid background */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px]" />
        
        <div className="relative z-10 flex flex-col items-center gap-1.5 px-3 text-center">
          <div className="w-8 h-8 rounded-full bg-stone-800/80 border border-stone-700/60 flex items-center justify-center text-stone-300">
            <Newspaper className="w-4 h-4 opacity-75" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
            {category}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-stone-100 ${aspectClass} ${className}`}>
      {/* Skeleton loader before image loads */}
      {!loaded && (
        <div className="absolute inset-0 bg-stone-200 animate-pulse" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src!}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
