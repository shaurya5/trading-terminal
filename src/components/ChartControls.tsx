'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { IndicatorConfig, IndicatorType } from '@/types';
import { INDICATOR_CATALOG, INDICATOR_PALETTE } from '@/lib/indicatorCatalog';

interface ChartControlsProps {
  indicators: IndicatorConfig[];
  onAddIndicator: (type: IndicatorType) => void;
  onRemoveIndicator: (id: string) => void;
  onUpdateIndicator: (id: string, updates: Partial<Pick<IndicatorConfig, 'period' | 'color' | 'enabled'>>) => void;
  measureMode?: boolean;
  onToggleMeasure?: () => void;
}

/* ── Inline period editor ───────────────────────────────────── */
function PeriodEditor({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(String(value));
      inputRef.current?.select();
    }
  }, [editing, value]);

  const commit = useCallback(() => {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n > 0 && n !== value) onCommit(n);
    setEditing(false);
  }, [draft, value, onCommit]);

  if (!editing) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        className="text-[10px] text-gray-400 hover:text-white transition-colors tabular-nums cursor-text"
        title="Click to edit period"
      >
        {value}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type="number"
      min={1}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setEditing(false);
      }}
      onBlur={commit}
      onClick={e => e.stopPropagation()}
      className="w-7 px-0.5 text-[10px] text-white bg-gray-900 border border-gray-600 rounded outline-none text-center tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      autoFocus
    />
  );
}

/* ── Color picker popover ───────────────────────────────────── */
function ColorPopover({ currentColor, onSelect, onClose }: {
  currentColor: string;
  onSelect: (color: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 z-50 bg-[#161b22] border border-gray-700 rounded shadow-xl p-1.5 flex flex-wrap gap-1 w-[120px]"
    >
      {INDICATOR_PALETTE.map(color => (
        <button
          key={color}
          onClick={(e) => { e.stopPropagation(); onSelect(color); onClose(); }}
          className="w-4 h-4 rounded-full border transition-transform hover:scale-125"
          style={{
            backgroundColor: color,
            borderColor: color === currentColor ? '#fff' : 'transparent',
          }}
          title={color}
        />
      ))}
    </div>
  );
}

/* ── Add-indicator dropdown ─────────────────────────────────── */
function AddDropdown({ onAdd, onClose }: { onAdd: (type: IndicatorType) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const overlays = INDICATOR_CATALOG.filter(c => c.panel === 'overlay');
  const subcharts = INDICATOR_CATALOG.filter(c => c.panel === 'subchart');

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 z-50 bg-[#161b22] border border-gray-700 rounded shadow-xl w-56 max-h-72 overflow-y-auto"
    >
      <div className="px-2 py-1 text-[9px] text-gray-500 uppercase tracking-wider border-b border-gray-800">Overlay</div>
      {overlays.map(entry => (
        <button
          key={entry.type}
          onClick={() => { onAdd(entry.type); onClose(); }}
          className="w-full px-2 py-1 text-left hover:bg-gray-800/60 flex items-center gap-2 transition-colors"
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.defaultColor }} />
          <span className="flex-1 min-w-0">
            <span className="text-[11px] text-white">{entry.label}</span>
            {entry.defaultPeriod > 0 && (
              <span className="text-[10px] text-gray-500 ml-1">({entry.defaultPeriod})</span>
            )}
            <span className="block text-[9px] text-gray-600 truncate">{entry.description}</span>
          </span>
        </button>
      ))}
      <div className="px-2 py-1 text-[9px] text-gray-500 uppercase tracking-wider border-b border-t border-gray-800">Sub-chart</div>
      {subcharts.map(entry => (
        <button
          key={entry.type}
          onClick={() => { onAdd(entry.type); onClose(); }}
          className="w-full px-2 py-1 text-left hover:bg-gray-800/60 flex items-center gap-2 transition-colors"
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.defaultColor }} />
          <span className="flex-1 min-w-0">
            <span className="text-[11px] text-white">{entry.label}</span>
            {entry.defaultPeriod > 0 && (
              <span className="text-[10px] text-gray-500 ml-1">({entry.defaultPeriod})</span>
            )}
            <span className="block text-[9px] text-gray-600 truncate">{entry.description}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/* ── Indicator chip ─────────────────────────────────────────── */
function IndicatorChip({
  indicator,
  onToggle,
  onRemove,
  onUpdate,
}: {
  indicator: IndicatorConfig;
  onToggle: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<Pick<IndicatorConfig, 'period' | 'color' | 'enabled'>>) => void;
}) {
  const [colorOpen, setColorOpen] = useState(false);
  const catalog = INDICATOR_CATALOG.find(c => c.type === indicator.type);
  const label = catalog?.label ?? indicator.type;
  const showPeriod = indicator.period > 0;

  return (
    <div
      className="relative group flex items-center gap-1 shrink-0"
    >
      <button
        onClick={onToggle}
        onContextMenu={e => { e.preventDefault(); setColorOpen(true); }}
        aria-pressed={indicator.enabled}
        aria-label={`Toggle ${label} indicator`}
        className={`flex items-center gap-1 px-1.5 py-0.5 text-[11px] rounded font-mono transition-colors select-none ${
          indicator.enabled
            ? 'text-white border border-gray-600 bg-gray-800'
            : 'text-gray-500 border border-gray-800 hover:border-gray-700 hover:text-gray-400 opacity-60'
        }`}
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: indicator.enabled ? indicator.color : '#444' }}
        />
        <span className="whitespace-nowrap">{label}</span>
        {showPeriod && (
          <>
            <span className="text-gray-600 text-[9px]">/</span>
            <PeriodEditor
              value={indicator.period}
              onCommit={p => onUpdate({ period: p })}
            />
          </>
        )}
      </button>

      {/* Gear icon for color picker */}
      <button
        onClick={e => { e.stopPropagation(); setColorOpen(!colorOpen); }}
        className="opacity-0 group-hover:opacity-100 w-3.5 h-3.5 flex items-center justify-center text-gray-600 hover:text-gray-300 transition-opacity"
        title="Change color"
      >
        <svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="8" cy="8" r="3" fill="currentColor" />
        </svg>
      </button>

      {/* Remove button */}
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className="opacity-0 group-hover:opacity-100 w-3.5 h-3.5 flex items-center justify-center text-gray-600 hover:text-red-400 transition-opacity"
        aria-label={`Remove ${label}`}
        title={`Remove ${label}`}
      >
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {colorOpen && (
        <ColorPopover
          currentColor={indicator.color}
          onSelect={c => onUpdate({ color: c })}
          onClose={() => setColorOpen(false)}
        />
      )}
    </div>
  );
}

/* ── Main ChartControls bar ─────────────────────────────────── */
export default function ChartControls({
  indicators,
  onAddIndicator,
  onRemoveIndicator,
  onUpdateIndicator,
  measureMode,
  onToggleMeasure,
}: ChartControlsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="flex items-center gap-1 px-3 py-1 border-b border-gray-800 bg-[#0d1117] min-h-[32px] overflow-x-auto">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-1 shrink-0">Indicators</span>

      {indicators.map(ind => (
        <IndicatorChip
          key={ind.id}
          indicator={ind}
          onToggle={() => onUpdateIndicator(ind.id, { enabled: !ind.enabled })}
          onRemove={() => onRemoveIndicator(ind.id)}
          onUpdate={updates => onUpdateIndicator(ind.id, updates)}
        />
      ))}

      {/* Add button */}
      <div className="relative shrink-0">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="px-1.5 py-0.5 text-[11px] text-gray-500 hover:text-blue-400 border border-dashed border-gray-700 hover:border-blue-500 rounded transition-colors font-mono"
          title="Add indicator"
        >
          + Add
        </button>
        {dropdownOpen && (
          <AddDropdown
            onAdd={onAddIndicator}
            onClose={() => setDropdownOpen(false)}
          />
        )}
      </div>

      {/* Separator & tools */}
      {onToggleMeasure && (
        <>
          <span className="text-gray-700 mx-1 shrink-0">|</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-1 shrink-0">Tools</span>
          <button
            onClick={onToggleMeasure}
            aria-pressed={measureMode}
            aria-label="Toggle measure tool"
            className={`px-2 py-0.5 text-[11px] rounded font-mono transition-colors flex items-center gap-1 shrink-0 ${
              measureMode
                ? 'text-yellow-400 border border-yellow-600 bg-yellow-900/30'
                : 'text-gray-500 border border-gray-800 hover:border-gray-700 hover:text-gray-400'
            }`}
            title="Measure tool: click two points to measure price difference, % change, and bar count"
          >
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 14L14 2" />
              <path d="M2 14L2 10" />
              <path d="M2 14L6 14" />
              <path d="M14 2L14 6" />
              <path d="M14 2L10 2" />
              <path d="M5 11L7 9" />
              <path d="M8 8L10 6" />
            </svg>
            Measure
          </button>
        </>
      )}
    </div>
  );
}
