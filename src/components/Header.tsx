'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface HeaderProps {
  onSearchOpen: () => void;
  activeView: string;
  onViewChange: (view: string) => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

const VIEWS = [
  { key: 'terminal', label: 'Terminal', shortcut: '1' },
  { key: 'markets', label: 'Markets', shortcut: '2' },
  { key: 'alerts', label: 'Alerts', shortcut: '3' },
  { key: 'multi', label: 'Multi-Chart', shortcut: '4' },
];

function Clock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return <div className="text-[10px] text-gray-500 font-mono hidden md:block">{time}</div>;
}

export default function Header({ onSearchOpen, activeView, onViewChange, onToggleSidebar, sidebarCollapsed }: HeaderProps) {
  return (
    <header className="flex items-center justify-between h-10 px-4 bg-[#070a10] border-b border-gray-800">
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            className="lg:hidden p-1 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-sm text-white font-bold tracking-tight">TRADE</span>
          <span className="text-sm text-orange-500 font-bold tracking-tight">TERMINAL</span>
        </div>

        <nav className="flex items-center gap-0.5 ml-4" aria-label="Main views">
          {VIEWS.map(v => (
            <button
              key={v.key}
              onClick={() => onViewChange(v.key)}
              aria-label={`${v.label} view`}
              aria-current={activeView === v.key ? 'page' : undefined}
              className={`px-3 py-1 text-[11px] transition-colors rounded ${
                activeView === v.key
                  ? 'text-white bg-gray-800'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <kbd className="text-[9px] text-gray-500 mr-1">{v.shortcut}</kbd>
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSearchOpen}
          aria-label="Search stocks"
          className="flex items-center gap-2 px-3 py-1 text-[11px] text-gray-500 bg-gray-800/50 border border-gray-700 rounded hover:border-gray-600 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="hidden sm:inline">Search</span>
          <kbd className="text-[9px] text-gray-500 bg-gray-800 px-1 rounded">/</kbd>
        </button>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-gray-500">NSE · LIVE</span>
        </div>
        <Link href="/disclaimer" className="text-[9px] text-gray-500 hover:text-gray-400 transition-colors">
          Disclaimer
        </Link>
        <Clock />
      </div>
    </header>
  );
}
