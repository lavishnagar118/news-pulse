import React from 'react';
import Link from 'next/link';
import { Newspaper, Activity } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="border-b border-gray-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:bg-blue-700 transition">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-gray-900 group-hover:text-blue-600 transition">
                News Pulse
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Clustered Timeline
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex items-center space-x-6 text-xs font-semibold text-gray-600">
          <Link href="/" className="hover:text-blue-600 transition-colors">
            Timeline
          </Link>
          <Link href="/#clusters" className="hover:text-blue-600 transition-colors">
            Story Explorer
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1 text-gray-400 hover:text-gray-600 transition"
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>Assessment Demo</span>
          </a>
        </nav>
      </div>
    </header>
  );
};
