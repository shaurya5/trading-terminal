'use client';

import { useEffect, useRef } from 'react';
import { ToastItem } from '@/types';

interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

function displaySymbol(s: string) {
  return s.replace('.NS', '').replace('.BO', '');
}

function SingleToast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Trigger slide-in: start off-screen right, animate to position
    const el = elRef.current;
    if (!el) return;
    // Force a reflow so the initial transform applies before the transition
    el.getBoundingClientRect();
    el.style.transform = 'translateX(0)';
    el.style.opacity = '1';
  }, []);

  const isAbove = toast.condition === 'above';
  const accentColor = isAbove ? 'border-green-500' : 'border-red-500';
  const accentText = isAbove ? 'text-green-400' : 'text-red-400';
  const accentBg = isAbove ? 'bg-green-500/10' : 'bg-red-500/10';

  return (
    <div
      ref={elRef}
      style={{
        transform: 'translateX(120%)',
        opacity: '0',
        transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
      }}
      className={`relative flex items-start gap-3 px-4 py-3 rounded-lg border-l-4 ${accentColor} bg-[#0d1117] border border-gray-700 shadow-lg shadow-black/40 max-w-sm`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${accentBg} flex items-center justify-center`}>
        <svg className={`w-4 h-4 ${accentText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isAbove ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          )}
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white font-mono">{displaySymbol(toast.symbol)}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${accentBg} ${accentText} uppercase font-semibold`}>
            {toast.condition}
          </span>
        </div>
        <div className="text-[11px] text-gray-400 mt-0.5">
          {displaySymbol(toast.symbol)} {toast.condition} {'\u20B9'}{toast.targetPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          Current: {'\u20B9'}{toast.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-gray-600 hover:text-gray-300 transition-colors mt-0.5"
        aria-label="Dismiss notification"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-10 right-4 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <SingleToast toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
