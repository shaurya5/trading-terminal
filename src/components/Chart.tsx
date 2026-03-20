'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  HistogramData,
  Time,
} from 'lightweight-charts';
import { CandleData, IndicatorConfig } from '@/types';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands } from '@/lib/indicators';

interface MeasurePoint {
  price: number;
  time: Time;
  x: number;
  y: number;
}

interface ChartProps {
  data: CandleData[];
  symbol: string;
  indicators: IndicatorConfig[];
  compareData?: { symbol: string; data: CandleData[]; color: string }[];
  measureMode?: boolean;
}

function safeRemoveChart(chart: IChartApi | null) {
  if (!chart) return;
  try { chart.remove(); } catch { /* already disposed */ }
}

const COMPARE_COLORS = ['#FF9800', '#E91E63', '#00BCD4', '#8BC34A'];

export default function Chart({ data, symbol, indicators, compareData, measureMode }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Chart instance refs
  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);

  // DOM element refs for sub-chart containers
  const mainDivRef = useRef<HTMLDivElement | null>(null);
  const rsiDivRef = useRef<HTMLDivElement | null>(null);
  const macdDivRef = useRef<HTMLDivElement | null>(null);

  // Series refs for in-place data updates
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const compareSeriesRef = useRef<ISeriesApi<'Line'>[]>([]);
  const indicatorSeriesRef = useRef<ISeriesApi<'Line'>[]>([]);
  // Bollinger bands are groups of 3 series (upper, middle, lower)
  const bollingerSeriesRef = useRef<[ISeriesApi<'Line'>, ISeriesApi<'Line'>, ISeriesApi<'Line'>][]>([]);

  // RSI sub-chart series
  const rsiLineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiOverboughtSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiOversoldSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // MACD sub-chart series
  const macdLineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSignalSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdHistogramSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Track the structural state that was used for the last build
  const prevStructureRef = useRef<{ hasRSI: boolean; hasMACD: boolean; indicatorKeys: string; compareCount: number } | null>(null);

  // Measure tool state
  const [measurePoint1, setMeasurePoint1] = useState<MeasurePoint | null>(null);
  const [measurePoint2, setMeasurePoint2] = useState<MeasurePoint | null>(null);
  const [cursorPoint, setCursorPoint] = useState<{ x: number; y: number; price: number; time: Time } | null>(null);
  const measureModeRef = useRef(measureMode);
  measureModeRef.current = measureMode;
  const measureClickStateRef = useRef<'empty' | 'has_first' | 'has_both'>('empty');
  useEffect(() => {
    if (measurePoint1 && measurePoint2) {
      measureClickStateRef.current = 'has_both';
    } else if (measurePoint1) {
      measureClickStateRef.current = 'has_first';
    } else {
      measureClickStateRef.current = 'empty';
    }
  }, [measurePoint1, measurePoint2]);

  const hasRSI = indicators.some(i => i.type === 'RSI' && i.enabled);
  const hasMACD = indicators.some(i => i.type === 'MACD' && i.enabled);

  // Build a structural key for overlay indicators (SMA/EMA/BOLLINGER configs that affect which series exist on the main chart)
  // We need to rebuild when the set of enabled indicators or their types change, but NOT when only data changes.
  const indicatorStructureKey = indicators
    .filter(i => i.enabled && i.type !== 'RSI' && i.type !== 'MACD')
    .map(i => `${i.type}-${i.period}-${i.color}`)
    .join(',');
  const compareCount = compareData?.length ?? 0;

  const destroyCharts = useCallback(() => {
    safeRemoveChart(chartRef.current);
    safeRemoveChart(rsiChartRef.current);
    safeRemoveChart(macdChartRef.current);
    chartRef.current = null;
    rsiChartRef.current = null;
    macdChartRef.current = null;
    candleSeriesRef.current = null;
    volumeSeriesRef.current = null;
    compareSeriesRef.current = [];
    indicatorSeriesRef.current = [];
    bollingerSeriesRef.current = [];
    rsiLineSeriesRef.current = null;
    rsiOverboughtSeriesRef.current = null;
    rsiOversoldSeriesRef.current = null;
    macdLineSeriesRef.current = null;
    macdSignalSeriesRef.current = null;
    macdHistogramSeriesRef.current = null;
    mainDivRef.current = null;
    rsiDivRef.current = null;
    macdDivRef.current = null;
  }, []);

  /**
   * Full chart rebuild: destroys everything and creates new chart instances + series.
   * Only called when sub-chart structure changes (RSI/MACD toggle, indicator config change, compare symbol count change).
   */
  const buildChart = useCallback(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    const container = chartContainerRef.current;
    // Wait for the container to have actual dimensions (flex layout may not have resolved yet)
    if (container.clientWidth === 0 || container.clientHeight === 0) return;

    destroyCharts();

    const subChartCount = (hasRSI ? 1 : 0) + (hasMACD ? 1 : 0);
    const mainHeight = subChartCount === 0 ? container.clientHeight : container.clientHeight * 0.6;
    const subHeight = subChartCount > 0 ? (container.clientHeight * 0.4) / subChartCount : 0;

    const mainDiv = document.createElement('div');
    mainDiv.style.height = `${mainHeight}px`;
    container.innerHTML = '';
    container.appendChild(mainDiv);
    mainDivRef.current = mainDiv;

    const isIntraday = typeof data[0]?.time === 'number';

    const chart = createChart(mainDiv, {
      width: container.clientWidth,
      height: mainHeight,
      layout: { background: { color: '#0a0e17' }, textColor: '#8a8f98' },
      grid: { vertLines: { color: '#1a1e2e' }, horzLines: { color: '#1a1e2e' } },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: '#1a1e2e' },
      timeScale: {
        borderColor: '#1a1e2e',
        timeVisible: isIntraday,
        secondsVisible: false,
      },
    });
    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderDownColor: '#ef5350',
      borderUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      wickUpColor: '#26a69a',
    });
    candleSeriesRef.current = candleSeries;

    // Volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    // Comparison overlays
    const newCompareSeries: ISeriesApi<'Line'>[] = [];
    if (compareData && compareData.length > 0) {
      compareData.forEach((comp, idx) => {
        const series = chart.addSeries(LineSeries, {
          color: comp.color || COMPARE_COLORS[idx % COMPARE_COLORS.length],
          lineWidth: 2,
          priceLineVisible: false,
          priceScaleId: `compare-${idx}`,
          title: comp.symbol.replace('.NS', '').replace('.BO', ''),
        });
        chart.priceScale(`compare-${idx}`).applyOptions({
          scaleMargins: { top: 0.1, bottom: 0.2 },
        });
        newCompareSeries.push(series);
      });
    }
    compareSeriesRef.current = newCompareSeries;

    // Overlay indicators (SMA, EMA, Bollinger)
    const newIndicatorSeries: ISeriesApi<'Line'>[] = [];
    const newBollingerSeries: [ISeriesApi<'Line'>, ISeriesApi<'Line'>, ISeriesApi<'Line'>][] = [];
    indicators.forEach(ind => {
      if (!ind.enabled) return;
      if (ind.type === 'SMA') {
        const s = chart.addSeries(LineSeries, { color: ind.color, lineWidth: 1, priceLineVisible: false });
        newIndicatorSeries.push(s);
      }
      if (ind.type === 'EMA') {
        const s = chart.addSeries(LineSeries, { color: ind.color, lineWidth: 1, priceLineVisible: false });
        newIndicatorSeries.push(s);
      }
      if (ind.type === 'BOLLINGER') {
        const u = chart.addSeries(LineSeries, { color: '#2196F3', lineWidth: 1, priceLineVisible: false });
        const m = chart.addSeries(LineSeries, { color: '#FF9800', lineWidth: 1, priceLineVisible: false });
        const l = chart.addSeries(LineSeries, { color: '#2196F3', lineWidth: 1, priceLineVisible: false });
        newBollingerSeries.push([u, m, l]);
      }
    });
    indicatorSeriesRef.current = newIndicatorSeries;
    bollingerSeriesRef.current = newBollingerSeries;

    // RSI sub-chart
    if (hasRSI) {
      const rsiDiv = document.createElement('div');
      rsiDiv.style.height = `${subHeight}px`;
      rsiDiv.style.borderTop = '1px solid #1a1e2e';
      container.appendChild(rsiDiv);
      rsiDivRef.current = rsiDiv;

      const rsiChart = createChart(rsiDiv, {
        width: container.clientWidth, height: subHeight,
        layout: { background: { color: '#0a0e17' }, textColor: '#8a8f98' },
        grid: { vertLines: { color: '#1a1e2e' }, horzLines: { color: '#1a1e2e' } },
        rightPriceScale: { borderColor: '#1a1e2e' },
        timeScale: { borderColor: '#1a1e2e', visible: !hasMACD, timeVisible: isIntraday },
      });
      rsiChartRef.current = rsiChart;

      const rsiSeries = rsiChart.addSeries(LineSeries, { color: '#AB47BC', lineWidth: 1, priceLineVisible: false });
      rsiLineSeriesRef.current = rsiSeries;

      const ob = rsiChart.addSeries(LineSeries, { color: 'rgba(239,83,80,0.4)', lineWidth: 1, lineStyle: 2, priceLineVisible: false });
      const os = rsiChart.addSeries(LineSeries, { color: 'rgba(38,166,154,0.4)', lineWidth: 1, lineStyle: 2, priceLineVisible: false });
      rsiOverboughtSeriesRef.current = ob;
      rsiOversoldSeriesRef.current = os;

      chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (range) { try { rsiChart.timeScale().setVisibleLogicalRange(range); } catch { /* */ } }
      });
      rsiChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (range) { try { chart.timeScale().setVisibleLogicalRange(range); } catch { /* */ } }
      });
    }

    // MACD sub-chart
    if (hasMACD) {
      const macdDiv = document.createElement('div');
      macdDiv.style.height = `${subHeight}px`;
      macdDiv.style.borderTop = '1px solid #1a1e2e';
      container.appendChild(macdDiv);
      macdDivRef.current = macdDiv;

      const macdChart = createChart(macdDiv, {
        width: container.clientWidth, height: subHeight,
        layout: { background: { color: '#0a0e17' }, textColor: '#8a8f98' },
        grid: { vertLines: { color: '#1a1e2e' }, horzLines: { color: '#1a1e2e' } },
        rightPriceScale: { borderColor: '#1a1e2e' },
        timeScale: { borderColor: '#1a1e2e', timeVisible: isIntraday },
      });
      macdChartRef.current = macdChart;

      const ml = macdChart.addSeries(LineSeries, { color: '#2196F3', lineWidth: 1, priceLineVisible: false });
      const sl = macdChart.addSeries(LineSeries, { color: '#FF9800', lineWidth: 1, priceLineVisible: false });
      const hs = macdChart.addSeries(HistogramSeries, { priceLineVisible: false });
      macdLineSeriesRef.current = ml;
      macdSignalSeriesRef.current = sl;
      macdHistogramSeriesRef.current = hs;

      chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (range) { try { macdChart.timeScale().setVisibleLogicalRange(range); } catch { /* */ } }
      });
      macdChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (range) { try { chart.timeScale().setVisibleLogicalRange(range); } catch { /* */ } }
      });
    }

    // Record the structural state for this build
    prevStructureRef.current = {
      hasRSI,
      hasMACD,
      indicatorKeys: indicatorStructureKey,
      compareCount,
    };

    // Set initial data on all series
    updateSeriesData();

    chart.timeScale().fitContent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRSI, hasMACD, indicatorStructureKey, compareCount, destroyCharts]);

  /**
   * Update data in-place on all existing series without destroying/recreating charts.
   */
  const updateSeriesData = useCallback(() => {
    if (data.length === 0) return;

    // Candlestick data
    if (candleSeriesRef.current) {
      const candleData: CandlestickData[] = data.map(d => ({
        time: d.time as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));
      candleSeriesRef.current.setData(candleData);
    }

    // Volume data
    if (volumeSeriesRef.current) {
      const volumeData: HistogramData[] = data.map(d => ({
        time: d.time as Time,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)',
      }));
      volumeSeriesRef.current.setData(volumeData);
    }

    // Compare overlays
    if (compareData && compareSeriesRef.current.length > 0) {
      compareData.forEach((comp, idx) => {
        const series = compareSeriesRef.current[idx];
        if (!series || comp.data.length === 0) return;
        series.setData(comp.data.map(d => ({
          time: d.time as Time,
          value: d.close,
        })) as LineData[]);
      });
    }

    // Overlay indicators (SMA, EMA, Bollinger)
    let lineIdx = 0;
    let bbIdx = 0;
    indicators.forEach(ind => {
      if (!ind.enabled) return;
      if (ind.type === 'SMA') {
        const smaData = calculateSMA(data, ind.period);
        const series = indicatorSeriesRef.current[lineIdx];
        if (series) {
          series.setData(smaData.map(d => ({ time: d.time as Time, value: d.value })) as LineData[]);
        }
        lineIdx++;
      }
      if (ind.type === 'EMA') {
        const emaData = calculateEMA(data, ind.period);
        const series = indicatorSeriesRef.current[lineIdx];
        if (series) {
          series.setData(emaData.map(d => ({ time: d.time as Time, value: d.value })) as LineData[]);
        }
        lineIdx++;
      }
      if (ind.type === 'BOLLINGER') {
        const bb = calculateBollingerBands(data, ind.period);
        const bbSeries = bollingerSeriesRef.current[bbIdx];
        if (bbSeries) {
          bbSeries[0].setData(bb.upper.map(d => ({ time: d.time as Time, value: d.value })) as LineData[]);
          bbSeries[1].setData(bb.middle.map(d => ({ time: d.time as Time, value: d.value })) as LineData[]);
          bbSeries[2].setData(bb.lower.map(d => ({ time: d.time as Time, value: d.value })) as LineData[]);
        }
        bbIdx++;
      }
    });

    // RSI data
    if (hasRSI && rsiLineSeriesRef.current && rsiOverboughtSeriesRef.current && rsiOversoldSeriesRef.current) {
      const rsiInd = indicators.find(i => i.type === 'RSI' && i.enabled);
      const rsiData = calculateRSI(data, rsiInd?.period ?? 14);
      rsiLineSeriesRef.current.setData(rsiData.map(d => ({ time: d.time as Time, value: d.value })) as LineData[]);
      rsiOverboughtSeriesRef.current.setData(rsiData.map(d => ({ time: d.time as Time, value: 70 })) as LineData[]);
      rsiOversoldSeriesRef.current.setData(rsiData.map(d => ({ time: d.time as Time, value: 30 })) as LineData[]);
    }

    // MACD data
    if (hasMACD && macdLineSeriesRef.current && macdSignalSeriesRef.current && macdHistogramSeriesRef.current) {
      const macdData = calculateMACD(data);
      macdLineSeriesRef.current.setData(macdData.macd.map(d => ({ time: d.time as Time, value: d.value })) as LineData[]);
      macdSignalSeriesRef.current.setData(macdData.signal.map(d => ({ time: d.time as Time, value: d.value })) as LineData[]);
      macdHistogramSeriesRef.current.setData(macdData.histogram.map(d => ({ time: d.time as Time, value: d.value, color: d.color })) as HistogramData[]);
    }
  }, [data, indicators, compareData, hasRSI, hasMACD]);

  /**
   * Resize all chart instances to fit their containers without rebuilding.
   */
  const handleResize = useCallback(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const subChartCount = (rsiChartRef.current ? 1 : 0) + (macdChartRef.current ? 1 : 0);
    const mainHeight = subChartCount === 0 ? container.clientHeight : container.clientHeight * 0.6;
    const subHeight = subChartCount > 0 ? (container.clientHeight * 0.4) / subChartCount : 0;
    const width = container.clientWidth;

    if (chartRef.current && mainDivRef.current) {
      mainDivRef.current.style.height = `${mainHeight}px`;
      chartRef.current.resize(width, mainHeight);
    }
    if (rsiChartRef.current && rsiDivRef.current) {
      rsiDivRef.current.style.height = `${subHeight}px`;
      rsiChartRef.current.resize(width, subHeight);
    }
    if (macdChartRef.current && macdDivRef.current) {
      macdDivRef.current.style.height = `${subHeight}px`;
      macdChartRef.current.resize(width, subHeight);
    }
  }, []);

  // Effect: Build chart on mount and when structure changes (RSI/MACD toggle, indicator configs, compare symbol count)
  useEffect(() => {
    if (data.length === 0) return;

    const prev = prevStructureRef.current;
    const structureChanged = !prev ||
      prev.hasRSI !== hasRSI ||
      prev.hasMACD !== hasMACD ||
      prev.indicatorKeys !== indicatorStructureKey ||
      prev.compareCount !== compareCount;

    if (structureChanged) {
      // Full rebuild needed
      buildChart();
    } else {
      // Structure is the same — just update data in-place
      updateSeriesData();
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [data, indicators, hasRSI, hasMACD, compareData, indicatorStructureKey, compareCount, buildChart, updateSeriesData]);

  // Effect: Window resize handler + ResizeObserver for initial layout
  useEffect(() => {
    window.addEventListener('resize', handleResize);

    // ResizeObserver catches the case where the container goes from 0 to nonzero size
    // (e.g., flex layout resolving after mount, or view switching)
    const container = chartContainerRef.current;
    let observer: ResizeObserver | null = null;
    if (container) {
      observer = new ResizeObserver(() => {
        if (container.clientWidth > 0 && container.clientHeight > 0) {
          // If chart hasn't been built yet (prevStructureRef is null), build it now
          if (!chartRef.current && data.length > 0) {
            buildChart();
          } else {
            handleResize();
          }
        }
      });
      observer.observe(container);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, [handleResize, buildChart, data.length]);

  // Effect: Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyCharts();
    };
  }, [destroyCharts]);

  // Reset measure points when measureMode is turned off or data changes
  useEffect(() => {
    if (!measureMode) {
      setMeasurePoint1(null);
      setMeasurePoint2(null);
      setCursorPoint(null);
    }
  }, [measureMode, data]);

  // Subscribe to crosshair move for in-progress measurement
  useEffect(() => {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series) return;

    const handler = (param: { point?: { x: number; y: number }; time?: Time }) => {
      if (!measureModeRef.current || !param.point || !param.time) {
        setCursorPoint(null);
        return;
      }
      const price = series.coordinateToPrice(param.point.y);
      if (price !== null && price !== undefined) {
        setCursorPoint({
          x: param.point.x,
          y: param.point.y,
          price: price as number,
          time: param.time,
        });
      }
    };

    chart.subscribeCrosshairMove(handler);
    return () => {
      try { chart.unsubscribeCrosshairMove(handler); } catch { /* disposed */ }
    };
  }, [data, indicators, hasRSI, hasMACD, compareData]);

  // Handle chart clicks for measure tool
  useEffect(() => {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series) return;

    const container = chartContainerRef.current;
    if (!container) return;

    const mainDiv = container.firstElementChild as HTMLElement | null;
    if (!mainDiv) return;

    const handleClick = (e: MouseEvent) => {
      if (!measureModeRef.current) return;

      const rect = mainDiv.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const time = chart.timeScale().coordinateToTime(x);
      const price = series.coordinateToPrice(y);

      if (time === null || time === undefined || price === null || price === undefined) return;

      const point: MeasurePoint = {
        price: price as number,
        time: time as Time,
        x,
        y,
      };

      const state = measureClickStateRef.current;
      if (state === 'empty') {
        setMeasurePoint1(point);
        setMeasurePoint2(null);
        measureClickStateRef.current = 'has_first';
      } else if (state === 'has_first') {
        setMeasurePoint2(point);
        measureClickStateRef.current = 'has_both';
      } else {
        setMeasurePoint1(point);
        setMeasurePoint2(null);
        measureClickStateRef.current = 'has_first';
      }
    };

    mainDiv.addEventListener('click', handleClick);
    return () => {
      mainDiv.removeEventListener('click', handleClick);
    };
  }, [data, indicators, hasRSI, hasMACD, compareData]);

  // Compute updated pixel positions for measure points based on current chart state
  const getPixelCoords = useCallback((point: MeasurePoint): { x: number; y: number } | null => {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series) return null;
    try {
      const x = chart.timeScale().timeToCoordinate(point.time);
      const y = series.priceToCoordinate(point.price);
      if (x === null || x === undefined || y === null || y === undefined) return null;
      return { x: x as number, y: y as number };
    } catch {
      return null;
    }
  }, []);

  // Compute measurement display values
  const measureInfo = (() => {
    const p1 = measurePoint1;
    const p2 = measurePoint2 || (measurePoint1 && cursorPoint ? { price: cursorPoint.price, time: cursorPoint.time, x: cursorPoint.x, y: cursorPoint.y } : null);
    if (!p1 || !p2) return null;

    const priceDiff = p2.price - p1.price;
    const pctChange = (priceDiff / p1.price) * 100;

    const t1 = p1.time;
    const t2 = p2.time;
    let barCount = 0;
    if (data.length > 0) {
      const idx1 = data.findIndex(d => d.time === t1 || (typeof d.time === 'number' && typeof t1 === 'number' && d.time >= (t1 as number)));
      const idx2 = data.findIndex(d => d.time === t2 || (typeof d.time === 'number' && typeof t2 === 'number' && d.time >= (t2 as number)));
      if (idx1 >= 0 && idx2 >= 0) {
        barCount = Math.abs(idx2 - idx1);
      }
    }

    const px1 = getPixelCoords(p1);
    const px2 = measurePoint2 ? getPixelCoords(p2 as MeasurePoint) : (cursorPoint ? { x: cursorPoint.x, y: cursorPoint.y } : null);

    if (!px1 || !px2) return null;

    return {
      priceDiff,
      pctChange,
      barCount,
      x1: px1.x,
      y1: px1.y,
      x2: px2.x,
      y2: px2.y,
      isPositive: priceDiff >= 0,
    };
  })();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">{symbol} · OHLCV</span>
          {compareData && compareData.length > 0 && (
            <div className="flex items-center gap-1.5">
              {compareData.map((c, i) => (
                <span key={c.symbol} className="flex items-center gap-1 text-[10px]" style={{ color: c.color || COMPARE_COLORS[i % COMPARE_COLORS.length] }}>
                  <span className="w-2 h-0.5 rounded" style={{ backgroundColor: c.color || COMPARE_COLORS[i % COMPARE_COLORS.length] }} />
                  {c.symbol.replace('.NS', '').replace('.BO', '')}
                </span>
              ))}
            </div>
          )}
          {measureMode && (
            <span className="text-[10px] text-yellow-500 font-mono ml-2">
              MEASURE {measurePoint1 ? (measurePoint2 ? '(click to reset)' : '(click second point)') : '(click first point)'}
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 relative" style={{ cursor: measureMode ? 'crosshair' : undefined }}>
        <div ref={chartContainerRef} className="absolute inset-0" />
        {/* Measure overlay */}
        {measureMode && measureInfo && (
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
            <svg className="absolute inset-0 w-full h-full">
              <line
                x1={measureInfo.x1}
                y1={measureInfo.y1}
                x2={measureInfo.x2}
                y2={measureInfo.y2}
                stroke={measureInfo.isPositive ? '#26a69a' : '#ef5350'}
                strokeWidth={1.5}
                strokeDasharray="6 3"
              />
              <circle cx={measureInfo.x1} cy={measureInfo.y1} r={4} fill={measureInfo.isPositive ? '#26a69a' : '#ef5350'} />
              <circle cx={measureInfo.x2} cy={measureInfo.y2} r={4} fill={measureInfo.isPositive ? '#26a69a' : '#ef5350'} />
            </svg>
            <div
              className="absolute px-2.5 py-1.5 rounded border text-[11px] font-mono shadow-lg"
              style={{
                left: `${(measureInfo.x1 + measureInfo.x2) / 2}px`,
                top: `${Math.min(measureInfo.y1, measureInfo.y2) - 8}px`,
                transform: 'translate(-50%, -100%)',
                backgroundColor: '#0d1117',
                borderColor: measureInfo.isPositive ? '#26a69a' : '#ef5350',
                color: '#e1e4e8',
                whiteSpace: 'nowrap',
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: measureInfo.isPositive ? '#26a69a' : '#ef5350' }}>
                  {measureInfo.isPositive ? '+' : ''}{measureInfo.priceDiff.toFixed(2)}
                </span>
                <span style={{ color: measureInfo.isPositive ? '#26a69a' : '#ef5350' }}>
                  ({measureInfo.isPositive ? '+' : ''}{measureInfo.pctChange.toFixed(2)}%)
                </span>
                <span className="text-gray-500">|</span>
                <span className="text-gray-400">
                  {measureInfo.barCount} bar{measureInfo.barCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        )}
        {/* Measure point 1 indicator (before second point is placed) */}
        {measureMode && measurePoint1 && !measureInfo && (() => {
          const px = getPixelCoords(measurePoint1);
          if (!px) return null;
          return (
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
              <svg className="absolute inset-0 w-full h-full">
                <circle cx={px.x} cy={px.y} r={4} fill="#FFD700" />
              </svg>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
