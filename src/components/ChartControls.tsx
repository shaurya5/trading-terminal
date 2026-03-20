'use client';

import { useState, useEffect } from 'react';
import { IndicatorConfig, IndicatorType } from '@/types';
import { INDICATOR_CATALOG, INDICATOR_PALETTE } from '@/lib/indicatorCatalog';
import { validate, FORMULA_PRESETS } from '@/lib/formulaParser';

/** Saved custom formula persisted to localStorage */
interface SavedCustomFormula {
  id: string;
  name: string;
  formula: string;
  color: string;
}

interface ChartControlsProps {
  indicators: IndicatorConfig[];
  onAddIndicator: (type: IndicatorType) => void;
  onRemoveIndicator: (id: string) => void;
  onUpdateIndicator: (id: string, updates: Partial<Pick<IndicatorConfig, 'period' | 'color' | 'enabled'>>) => void;
  onAddCustomIndicator?: (name: string, formula: string, color: string) => void;
  measureMode?: boolean;
  onToggleMeasure?: () => void;
}

function IndicatorModal({
  indicators,
  onAdd,
  onRemove,
  onUpdate,
  onAddCustom,
  onClose,
}: {
  indicators: IndicatorConfig[];
  onAdd: (type: IndicatorType) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Pick<IndicatorConfig, 'period' | 'color' | 'enabled'>>) => void;
  onAddCustom?: (name: string, formula: string, color: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'active' | 'add' | 'custom'>('active');

  // Close modal on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const overlays = INDICATOR_CATALOG.filter(c => c.panel === 'overlay');
  const subcharts = INDICATOR_CATALOG.filter(c => c.panel === 'subchart');

  // Custom formula state
  const [customName, setCustomName] = useState('');
  const [customFormula, setCustomFormula] = useState('');
  const [customColor, setCustomColor] = useState(INDICATOR_PALETTE[0]);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [savedFormulas, setSavedFormulas] = useState<SavedCustomFormula[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load saved formulas from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('trading-custom-formulas');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setSavedFormulas(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save formulas to localStorage
  const persistFormulas = (formulas: SavedCustomFormula[]) => {
    setSavedFormulas(formulas);
    try {
      localStorage.setItem('trading-custom-formulas', JSON.stringify(formulas));
    } catch {
      // ignore
    }
  };

  // Validate formula on change
  useEffect(() => {
    if (!customFormula.trim()) {
      setValidationResult(null);
      return;
    }
    const result = validate(customFormula);
    setValidationResult(result);
  }, [customFormula]);

  const handleAddCustom = () => {
    if (!customFormula.trim() || !customName.trim() || !validationResult?.valid) return;

    if (onAddCustom) {
      onAddCustom(customName.trim(), customFormula.trim(), customColor);
    }

    // Save to localStorage
    const newFormula: SavedCustomFormula = {
      id: editingId || crypto.randomUUID(),
      name: customName.trim(),
      formula: customFormula.trim(),
      color: customColor,
    };

    if (editingId) {
      persistFormulas(savedFormulas.map(f => f.id === editingId ? newFormula : f));
      setEditingId(null);
    } else {
      persistFormulas([...savedFormulas, newFormula]);
    }

    // Reset form
    setCustomName('');
    setCustomFormula('');
    setCustomColor(INDICATOR_PALETTE[0]);
    setTab('active');
  };

  const handleEditSaved = (f: SavedCustomFormula) => {
    setCustomName(f.name);
    setCustomFormula(f.formula);
    setCustomColor(f.color);
    setEditingId(f.id);
  };

  const handleDeleteSaved = (id: string) => {
    persistFormulas(savedFormulas.filter(f => f.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setCustomName('');
      setCustomFormula('');
    }
  };

  const handlePresetClick = (preset: typeof FORMULA_PRESETS[number]) => {
    setCustomName(preset.name);
    setCustomFormula(preset.formula);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[520px] max-h-[600px] bg-[#111820] border border-gray-600 rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-sm text-white font-semibold">Indicators</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setTab('active')}
            className={`flex-1 py-2 text-[11px] uppercase tracking-wider font-medium transition-colors ${
              tab === 'active' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Active ({indicators.length})
          </button>
          <button
            onClick={() => setTab('add')}
            className={`flex-1 py-2 text-[11px] uppercase tracking-wider font-medium transition-colors ${
              tab === 'add' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Add New
          </button>
          <button
            onClick={() => setTab('custom')}
            className={`flex-1 py-2 text-[11px] uppercase tracking-wider font-medium transition-colors ${
              tab === 'custom' ? 'text-white border-b-2 border-orange-500' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Custom
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'active' && (
            <div className="p-3 space-y-1.5">
              {indicators.length === 0 && (
                <div className="py-8 text-center text-gray-400 text-[12px]">
                  No indicators added. Click &quot;Add New&quot; or &quot;Custom&quot; to get started.
                </div>
              )}
              {indicators.map(ind => {
                const catalog = INDICATOR_CATALOG.find(c => c.type === ind.type);
                const isCustom = ind.isCustom;
                const label = isCustom ? (ind.customName || 'Custom') : (catalog?.label ?? ind.type);
                const showPeriod = !isCustom && ind.period > 0;
                const panelLabel = isCustom ? 'overlay' : (catalog?.panel === 'overlay' ? 'overlay' : 'panel');
                const panelClass = isCustom
                  ? 'text-orange-300 bg-orange-500/20 border border-orange-500/30'
                  : catalog?.panel === 'overlay'
                    ? 'text-blue-300 bg-blue-500/20 border border-blue-500/30'
                    : 'text-purple-300 bg-purple-500/20 border border-purple-500/30';
                const description = isCustom ? ind.formula : catalog?.description;

                return (
                  <div
                    key={ind.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded border transition-all ${
                      ind.enabled
                        ? 'border-gray-600 bg-[#1a2030]'
                        : 'border-gray-700/50 bg-[#111820] opacity-40'
                    }`}
                  >
                    {/* Color picker */}
                    <div className="relative group/color shrink-0">
                      <button
                        className="w-6 h-6 rounded-full border-2 border-gray-500 hover:border-white transition-colors"
                        style={{ backgroundColor: ind.color }}
                        title="Change color"
                      />
                      <div className="absolute left-0 top-full mt-1 hidden group-hover/color:flex flex-wrap gap-1 p-1.5 bg-[#1a2030] border border-gray-600 rounded shadow-xl z-10 w-[100px]">
                        {INDICATOR_PALETTE.map(c => (
                          <button
                            key={c}
                            onClick={() => onUpdate(ind.id, { color: c })}
                            className="w-4 h-4 rounded-full border-2 transition-transform hover:scale-125"
                            style={{ backgroundColor: c, borderColor: c === ind.color ? '#fff' : 'transparent' }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-white font-mono font-bold truncate">{label}</span>
                        <span className={`text-[8px] font-semibold uppercase tracking-wider px-1 py-px rounded shrink-0 ${panelClass}`}>
                          {isCustom ? 'custom' : panelLabel}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 block truncate">{description}</span>
                    </div>

                    {/* Period input */}
                    {showPeriod && (
                      <div className="shrink-0 text-center">
                        <label className="text-[8px] text-gray-500 block mb-0.5 uppercase">Period</label>
                        <input
                          type="number"
                          min={1}
                          value={ind.period}
                          onChange={e => {
                            const n = parseInt(e.target.value, 10);
                            if (!isNaN(n) && n > 0) onUpdate(ind.id, { period: n });
                          }}
                          className="w-14 px-1.5 py-1 text-[12px] text-white bg-[#0d1117] border border-gray-600 rounded outline-none focus:border-blue-500 text-center font-mono font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    )}

                    {/* Toggle visibility */}
                    <button
                      onClick={() => onUpdate(ind.id, { enabled: !ind.enabled })}
                      className={`shrink-0 p-1.5 rounded transition-colors ${
                        ind.enabled ? 'text-green-400 hover:text-green-300 bg-green-500/10' : 'text-gray-500 hover:text-gray-300'
                      }`}
                      title={ind.enabled ? 'Hide indicator' : 'Show indicator'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {ind.enabled ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        )}
                      </svg>
                    </button>

                    {/* Remove */}
                    <button
                      onClick={() => onRemove(ind.id)}
                      className="shrink-0 p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                      title="Remove indicator"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'add' && (
            <div className="p-3">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-2">Overlay (on price chart)</div>
              <div className="grid grid-cols-2 gap-1.5 mb-4">
                {overlays.map(entry => (
                  <button
                    key={entry.type}
                    onClick={() => { onAdd(entry.type); setTab('active'); }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded border border-gray-700 hover:border-blue-500/50 hover:bg-blue-500/10 transition-colors text-left"
                  >
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: entry.defaultColor }} />
                    <div className="min-w-0">
                      <div className="text-[12px] text-white font-medium">
                        {entry.label}
                        {entry.defaultPeriod > 0 && <span className="text-gray-400 ml-1">({entry.defaultPeriod})</span>}
                      </div>
                      <div className="text-[9px] text-gray-400 truncate">{entry.description}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-2">Sub-chart (separate panel)</div>
              <div className="grid grid-cols-2 gap-1.5">
                {subcharts.map(entry => (
                  <button
                    key={entry.type}
                    onClick={() => { onAdd(entry.type); setTab('active'); }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded border border-gray-700 hover:border-blue-500/50 hover:bg-blue-500/10 transition-colors text-left"
                  >
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: entry.defaultColor }} />
                    <div className="min-w-0">
                      <div className="text-[12px] text-white font-medium">
                        {entry.label}
                        {entry.defaultPeriod > 0 && <span className="text-gray-400 ml-1">({entry.defaultPeriod})</span>}
                      </div>
                      <div className="text-[9px] text-gray-400 truncate">{entry.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'custom' && (
            <div className="p-3 space-y-3">
              {/* Presets */}
              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1.5">Presets</div>
                <div className="flex flex-wrap gap-1">
                  {FORMULA_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => handlePresetClick(preset)}
                      className="px-2 py-1 text-[10px] text-orange-300 border border-orange-500/30 bg-orange-500/10 rounded hover:bg-orange-500/20 transition-colors"
                      title={preset.description}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium block mb-1">Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="My Custom Indicator"
                  className="w-full px-2.5 py-1.5 text-[12px] text-white bg-[#0d1117] border border-gray-600 rounded outline-none focus:border-orange-500 font-mono placeholder:text-gray-600"
                />
              </div>

              {/* Formula textarea */}
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium block mb-1">Formula</label>
                <textarea
                  value={customFormula}
                  onChange={e => setCustomFormula(e.target.value)}
                  placeholder="e.g. sma(close, 20) - sma(close, 50)"
                  rows={3}
                  className="w-full px-2.5 py-1.5 text-[12px] text-white bg-[#0d1117] border border-gray-600 rounded outline-none focus:border-orange-500 font-mono resize-none placeholder:text-gray-600"
                />
                <div className="text-[9px] text-gray-500 mt-0.5">
                  Variables: close, open, high, low, volume, hl2, hlc3, ohlc4 | Functions: sma, ema, highest, lowest, abs, max, min, sqrt
                </div>
              </div>

              {/* Validation */}
              {validationResult && (
                <div className={`px-2.5 py-1.5 rounded text-[11px] font-mono ${
                  validationResult.valid
                    ? 'bg-green-500/10 border border-green-500/30 text-green-300'
                    : 'bg-red-500/10 border border-red-500/30 text-red-300'
                }`}>
                  {validationResult.valid ? 'Formula is valid' : `Error: ${validationResult.error}`}
                </div>
              )}

              {/* Color picker */}
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium block mb-1">Color</label>
                <div className="flex items-center gap-1.5">
                  {INDICATOR_PALETTE.map(c => (
                    <button
                      key={c}
                      onClick={() => setCustomColor(c)}
                      className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-125"
                      style={{ backgroundColor: c, borderColor: c === customColor ? '#fff' : 'transparent' }}
                    />
                  ))}
                </div>
              </div>

              {/* Add button */}
              <button
                onClick={handleAddCustom}
                disabled={!customFormula.trim() || !customName.trim() || !validationResult?.valid}
                className="w-full px-3 py-2 text-[12px] font-medium bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
              >
                {editingId ? 'Update & Add to Chart' : 'Add to Chart'}
              </button>

              {/* Saved formulas */}
              {savedFormulas.length > 0 && (
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1.5">Saved Custom Formulas</div>
                  <div className="space-y-1">
                    {savedFormulas.map(f => (
                      <div
                        key={f.id}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded border transition-all ${
                          editingId === f.id
                            ? 'border-orange-500/50 bg-orange-500/5'
                            : 'border-gray-700 bg-[#0d1117]'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-white font-mono font-bold truncate">{f.name}</div>
                          <div className="text-[9px] text-gray-500 font-mono truncate">{f.formula}</div>
                        </div>
                        <button
                          onClick={() => {
                            if (onAddCustom) onAddCustom(f.name, f.formula, f.color);
                            setTab('active');
                          }}
                          className="shrink-0 px-1.5 py-0.5 text-[9px] text-green-400 border border-green-500/30 rounded hover:bg-green-500/10 transition-colors"
                          title="Add to chart"
                        >
                          +Add
                        </button>
                        <button
                          onClick={() => handleEditSaved(f)}
                          className="shrink-0 p-1 text-gray-500 hover:text-orange-400 transition-colors"
                          title="Edit formula"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteSaved(f.id)}
                          className="shrink-0 p-1 text-gray-500 hover:text-red-400 transition-colors"
                          title="Delete saved formula"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChartControls({
  indicators,
  onAddIndicator,
  onRemoveIndicator,
  onUpdateIndicator,
  onAddCustomIndicator,
  measureMode,
  onToggleMeasure,
}: ChartControlsProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1 px-3 py-1 border-b border-gray-800 bg-[#0d1117] min-h-[32px]">
        {/* Indicators manage button */}
        <button
          onClick={() => setModalOpen(true)}
          className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 text-[11px] text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Manage
        </button>

        {/* Toggle chips for ALL indicators (both enabled and disabled) */}
        <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
          {indicators.map(ind => {
            const catalog = INDICATOR_CATALOG.find(c => c.type === ind.type);
            const isCustom = ind.isCustom;
            const label = isCustom ? (ind.customName || 'Custom') : (catalog?.label ?? ind.type);
            return (
              <button
                key={ind.id}
                onClick={() => onUpdateIndicator(ind.id, { enabled: !ind.enabled })}
                aria-pressed={ind.enabled}
                className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded font-mono transition-colors ${
                  ind.enabled
                    ? 'text-white border border-gray-600 bg-gray-800'
                    : 'text-gray-600 border border-gray-800 hover:border-gray-700 hover:text-gray-500'
                }`}
                title={ind.enabled ? `Click to disable ${label}` : `Click to enable ${label}`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: ind.enabled ? ind.color : '#333' }}
                />
                {label}
                {!isCustom && ind.period > 0 && <span className={ind.enabled ? 'text-gray-400' : 'text-gray-700'}>{ind.period}</span>}
              </button>
            );
          })}
        </div>

        {/* Tools */}
        {onToggleMeasure && (
          <>
            <span className="text-gray-700 mx-0.5 shrink-0">|</span>
            <button
              onClick={onToggleMeasure}
              aria-pressed={measureMode}
              aria-label="Toggle measure tool"
              className={`shrink-0 px-2 py-0.5 text-[11px] rounded font-mono transition-colors flex items-center gap-1 ${
                measureMode
                  ? 'text-yellow-400 border border-yellow-600 bg-yellow-900/30'
                  : 'text-gray-500 border border-gray-800 hover:border-gray-700 hover:text-gray-400'
              }`}
              title="Measure tool"
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

      {modalOpen && (
        <IndicatorModal
          indicators={indicators}
          onAdd={onAddIndicator}
          onRemove={onRemoveIndicator}
          onUpdate={onUpdateIndicator}
          onAddCustom={onAddCustomIndicator}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
