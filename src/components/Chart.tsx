'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
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
import { CandleData, IndicatorConfig, IndicatorType } from '@/types';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateStochastic,
  calculateATR,
  calculateVWAP,
  calculateWilliamsR,
  calculateOBV,
  TimeValue,
} from '@/lib/indicators';
import { getIndicatorPanel } from '@/lib/indicatorCatalog';

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

type SubChartEntry = {
  chart: IChartApi;
  div: HTMLDivElement;
  series: Map<string, ISeriesApi<any>>;
};

function safeRemoveChart(chart: IChartApi | null) {
  if (!chart) return;
  try { chart.remove(); } catch { /* already disposed */ }
}

const COMPARE_COLORS = ['#FF9800', '#E91E63', '#00BCD4', '#8BC34A'];

export default function Chart({ data, symbol, indicators, compareData, measureMode }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Chart instance refs
  const chartRef = useRef<IChartApi | null>(null);
  const mainDivRef = useRef<HTMLDivElement | null>(null);

  // Series refs for main chart
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const compareSeriesRef = useRef<ISeriesApi<'Line'>[]>([]);

  // Dynamic overlay series map: keyed by indicator id (Bollinger uses ${id}-upper, ${id}-middle, ${id}-lower)
  const overlaySeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());

  // Dynamic sub-chart map: keyed by panel type (e.g., 'RSI', 'MACD', 'STOCHASTIC', etc.)
  // Indicators of the same type share one sub-chart panel.
  const subChartsRef = useRef<Map<string, SubChartEntry>>(new Map());

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

  // Compute which sub-chart panel types are active
  const activeSubPanelTypes = useMemo(() => {
    const types = new Set<string>();
    indicators.filter(i => i.enabled).forEach(i => {
      const panel = getIndicatorPanel(i.type);
      if (panel === 'subchart') types.add(i.type);
    });
    return types;
  }, [indicators]);

  // Structural key for rebuild detection
  const structureKey = useMemo(() => {
    const enabledIds = indicators
      .filter(i => i.enabled)
      .map(i => `${i.id}:${i.type}`)
      .sort()
      .join(',');
    const subPanels = [...activeSubPanelTypes].sort().join(',');
    const cmpCount = compareData?.length ?? 0;
    return `${enabledIds}|${subPanels}|${cmpCount}`;
  }, [indicators, activeSubPanelTypes, compareData]);

  // Track the structural state used for the last build
  const prevStructureKeyRef = useRef<string | null>(null);

  const destroyCharts = useCallback(() => {
    // Destroy all sub-charts
    subChartsRef.current.forEach(entry => {
      safeRemoveChart(entry.chart);
    });
    subChartsRef.current.clear();

    // Destroy main chart
    safeRemoveChart(chartRef.current);
    chartRef.current = null;

    // Clear all series refs
    candleSeriesRef.current = null;
    volumeSeriesRef.current = null;
    compareSeriesRef.current = [];
    overlaySeriesRef.current.clear();

    mainDivRef.current = null;
  }, []);

  /**
   * Create the series for a specific sub-chart indicator type.
   * Returns the series keyed by indicator id for storage in the SubChartEntry's series map.
   */
  const createSubChartSeries = useCallback((
    subChart: IChartApi,
    ind: IndicatorConfig,
  ): Map<string, ISeriesApi<any>> => {
    const result = new Map<string, ISeriesApi<any>>();

    switch (ind.type) {
      case 'RSI': {
        const rsiSeries = subChart.addSeries(LineSeries, {
          color: ind.color || '#AB47BC',
          lineWidth: 1,
          priceLineVisible: false,
        });
        result.set(ind.id, rsiSeries);

        // Reference lines at 70/30
        const ob = subChart.addSeries(LineSeries, {
          color: 'rgba(239,83,80,0.4)',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
        });
        const os = subChart.addSeries(LineSeries, {
          color: 'rgba(38,166,154,0.4)',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
        });
        result.set(`${ind.id}-overbought`, ob);
        result.set(`${ind.id}-oversold`, os);
        break;
      }
      case 'MACD': {
        const ml = subChart.addSeries(LineSeries, {
          color: '#2196F3',
          lineWidth: 1,
          priceLineVisible: false,
        });
        const sl = subChart.addSeries(LineSeries, {
          color: '#FF9800',
          lineWidth: 1,
          priceLineVisible: false,
        });
        const hs = subChart.addSeries(HistogramSeries, {
          priceLineVisible: false,
        });
        result.set(`${ind.id}-macd`, ml);
        result.set(`${ind.id}-signal`, sl);
        result.set(`${ind.id}-histogram`, hs);
        break;
      }
      case 'STOCHASTIC': {
        const kSeries = subChart.addSeries(LineSeries, {
          color: ind.color || '#E91E63',
          lineWidth: 1,
          priceLineVisible: false,
        });
        const dSeries = subChart.addSeries(LineSeries, {
          color: '#FF9800',
          lineWidth: 1,
          priceLineVisible: false,
        });
        result.set(`${ind.id}-k`, kSeries);
        result.set(`${ind.id}-d`, dSeries);

        // Reference lines at 80/20
        const ob = subChart.addSeries(LineSeries, {
          color: 'rgba(239,83,80,0.4)',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
        });
        const os = subChart.addSeries(LineSeries, {
          color: 'rgba(38,166,154,0.4)',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
        });
        result.set(`${ind.id}-overbought`, ob);
        result.set(`${ind.id}-oversold`, os);
        break;
      }
      case 'ATR': {
        const atrSeries = subChart.addSeries(LineSeries, {
          color: ind.color || '#FF9800',
          lineWidth: 1,
          priceLineVisible: false,
        });
        result.set(ind.id, atrSeries);
        break;
      }
      case 'WILLIAMS_R': {
        const wrSeries = subChart.addSeries(LineSeries, {
          color: ind.color || '#8BC34A',
          lineWidth: 1,
          priceLineVisible: false,
        });
        result.set(ind.id, wrSeries);

        // Reference lines at -20/-80
        const ob = subChart.addSeries(LineSeries, {
          color: 'rgba(239,83,80,0.4)',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
        });
        const os = subChart.addSeries(LineSeries, {
          color: 'rgba(38,166,154,0.4)',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
        });
        result.set(`${ind.id}-overbought`, ob);
        result.set(`${ind.id}-oversold`, os);
        break;
      }
      case 'OBV': {
        const obvSeries = subChart.addSeries(LineSeries, {
          color: ind.color || '#03A9F4',
          lineWidth: 1,
          priceLineVisible: false,
        });
        result.set(ind.id, obvSeries);
        break;
      }
    }
    return result;
  }, []);

  /**
   * Update series data for a single sub-chart indicator.
   */
  const updateSubChartIndicatorData = useCallback((
    ind: IndicatorConfig,
    seriesMap: Map<string, ISeriesApi<any>>,
  ) => {
    if (data.length === 0) return;

    const toLineData = (values: TimeValue[]): LineData[] =>
      values.map(d => ({ time: d.time as Time, value: d.value })) as LineData[];

    switch (ind.type) {
      case 'RSI': {
        const rsiData = calculateRSI(data, ind.period || 14);
        const series = seriesMap.get(ind.id);
        if (series) series.setData(toLineData(rsiData));

        const ob = seriesMap.get(`${ind.id}-overbought`);
        const os = seriesMap.get(`${ind.id}-oversold`);
        if (ob) ob.setData(rsiData.map(d => ({ time: d.time as Time, value: 70 })) as LineData[]);
        if (os) os.setData(rsiData.map(d => ({ time: d.time as Time, value: 30 })) as LineData[]);
        break;
      }
      case 'MACD': {
        const macdData = calculateMACD(data);
        const ml = seriesMap.get(`${ind.id}-macd`);
        const sl = seriesMap.get(`${ind.id}-signal`);
        const hs = seriesMap.get(`${ind.id}-histogram`);
        if (ml) ml.setData(toLineData(macdData.macd));
        if (sl) sl.setData(toLineData(macdData.signal));
        if (hs) hs.setData(macdData.histogram.map(d => ({
          time: d.time as Time,
          value: d.value,
          color: d.color,
        })) as HistogramData[]);
        break;
      }
      case 'STOCHASTIC': {
        const kPeriod = ind.params?.kPeriod ?? ind.period ?? 14;
        const dPeriod = ind.params?.dPeriod ?? 3;
        const stochData = calculateStochastic(data, kPeriod, dPeriod);
        const kSeries = seriesMap.get(`${ind.id}-k`);
        const dSeries = seriesMap.get(`${ind.id}-d`);
        if (kSeries) kSeries.setData(toLineData(stochData.k));
        if (dSeries) dSeries.setData(toLineData(stochData.d));

        const ob = seriesMap.get(`${ind.id}-overbought`);
        const os = seriesMap.get(`${ind.id}-oversold`);
        if (ob) ob.setData(stochData.k.map(d => ({ time: d.time as Time, value: 80 })) as LineData[]);
        if (os) os.setData(stochData.k.map(d => ({ time: d.time as Time, value: 20 })) as LineData[]);
        break;
      }
      case 'ATR': {
        const atrData = calculateATR(data, ind.period || 14);
        const series = seriesMap.get(ind.id);
        if (series) series.setData(toLineData(atrData));
        break;
      }
      case 'WILLIAMS_R': {
        const wrData = calculateWilliamsR(data, ind.period || 14);
        const series = seriesMap.get(ind.id);
        if (series) series.setData(toLineData(wrData));

        const ob = seriesMap.get(`${ind.id}-overbought`);
        const os = seriesMap.get(`${ind.id}-oversold`);
        if (ob) ob.setData(wrData.map(d => ({ time: d.time as Time, value: -20 })) as LineData[]);
        if (os) os.setData(wrData.map(d => ({ time: d.time as Time, value: -80 })) as LineData[]);
        break;
      }
      case 'OBV': {
        const obvData = calculateOBV(data);
        const series = seriesMap.get(ind.id);
        if (series) series.setData(toLineData(obvData));
        break;
      }
    }
  }, [data]);

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

    const toLineData = (values: TimeValue[]): LineData[] =>
      values.map(d => ({ time: d.time as Time, value: d.value })) as LineData[];

    // Update overlay and sub-chart indicators
    indicators.forEach(ind => {
      if (!ind.enabled) return;

      const panel = getIndicatorPanel(ind.type);

      if (panel === 'overlay') {
        // Overlay indicators
        switch (ind.type) {
          case 'SMA': {
            const smaData = calculateSMA(data, ind.period);
            const series = overlaySeriesRef.current.get(ind.id);
            if (series) series.setData(toLineData(smaData));
            break;
          }
          case 'EMA': {
            const emaData = calculateEMA(data, ind.period);
            const series = overlaySeriesRef.current.get(ind.id);
            if (series) series.setData(toLineData(emaData));
            break;
          }
          case 'BOLLINGER': {
            const stdDev = ind.params?.stdDev ?? 2;
            const bb = calculateBollingerBands(data, ind.period || 20, stdDev);
            const upper = overlaySeriesRef.current.get(`${ind.id}-upper`);
            const middle = overlaySeriesRef.current.get(`${ind.id}-middle`);
            const lower = overlaySeriesRef.current.get(`${ind.id}-lower`);
            if (upper) upper.setData(toLineData(bb.upper));
            if (middle) middle.setData(toLineData(bb.middle));
            if (lower) lower.setData(toLineData(bb.lower));
            break;
          }
          case 'VWAP': {
            const vwapData = calculateVWAP(data);
            const series = overlaySeriesRef.current.get(ind.id);
            if (series) series.setData(toLineData(vwapData));
            break;
          }
        }
      } else {
        // Sub-chart indicators
        const subEntry = subChartsRef.current.get(ind.type);
        if (subEntry) {
          updateSubChartIndicatorData(ind, subEntry.series);
        }
      }
    });
  }, [data, indicators, compareData, updateSubChartIndicatorData]);

  /**
   * Full chart rebuild: destroys everything and creates new chart instances + series.
   * Only called when structural key changes.
   */
  const buildChart = useCallback(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    const container = chartContainerRef.current;
    // Wait for the container to have actual dimensions (flex layout may not have resolved yet)
    if (container.clientWidth === 0 || container.clientHeight === 0) return;

    destroyCharts();

    const subChartCount = activeSubPanelTypes.size;
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

    // Create overlay indicator series on the main chart
    const newOverlayMap = new Map<string, ISeriesApi<any>>();
    indicators.forEach(ind => {
      if (!ind.enabled) return;
      const panel = getIndicatorPanel(ind.type);
      if (panel !== 'overlay') return;

      switch (ind.type) {
        case 'SMA': {
          const s = chart.addSeries(LineSeries, {
            color: ind.color,
            lineWidth: 1,
            priceLineVisible: false,
          });
          newOverlayMap.set(ind.id, s);
          break;
        }
        case 'EMA': {
          const s = chart.addSeries(LineSeries, {
            color: ind.color,
            lineWidth: 1,
            priceLineVisible: false,
          });
          newOverlayMap.set(ind.id, s);
          break;
        }
        case 'BOLLINGER': {
          const u = chart.addSeries(LineSeries, {
            color: '#2196F3',
            lineWidth: 1,
            priceLineVisible: false,
          });
          const m = chart.addSeries(LineSeries, {
            color: '#FF9800',
            lineWidth: 1,
            priceLineVisible: false,
          });
          const l = chart.addSeries(LineSeries, {
            color: '#2196F3',
            lineWidth: 1,
            priceLineVisible: false,
          });
          newOverlayMap.set(`${ind.id}-upper`, u);
          newOverlayMap.set(`${ind.id}-middle`, m);
          newOverlayMap.set(`${ind.id}-lower`, l);
          break;
        }
        case 'VWAP': {
          const s = chart.addSeries(LineSeries, {
            color: ind.color || '#009688',
            lineWidth: 1,
            priceLineVisible: false,
          });
          newOverlayMap.set(ind.id, s);
          break;
        }
      }
    });
    overlaySeriesRef.current = newOverlayMap;

    // Create sub-chart panels for each active panel type
    const sortedPanelTypes = [...activeSubPanelTypes].sort();
    sortedPanelTypes.forEach((panelType, panelIdx) => {
      const isLastPanel = panelIdx === sortedPanelTypes.length - 1;

      const subDiv = document.createElement('div');
      subDiv.style.height = `${subHeight}px`;
      subDiv.style.borderTop = '1px solid #1a1e2e';
      container.appendChild(subDiv);

      const subChart = createChart(subDiv, {
        width: container.clientWidth,
        height: subHeight,
        layout: { background: { color: '#0a0e17' }, textColor: '#8a8f98' },
        grid: { vertLines: { color: '#1a1e2e' }, horzLines: { color: '#1a1e2e' } },
        rightPriceScale: { borderColor: '#1a1e2e' },
        timeScale: {
          borderColor: '#1a1e2e',
          visible: isLastPanel,
          timeVisible: isIntraday,
        },
      });

      const subEntry: SubChartEntry = {
        chart: subChart,
        div: subDiv,
        series: new Map(),
      };

      // Create series for each enabled indicator of this panel type
      indicators.forEach(ind => {
        if (!ind.enabled || ind.type !== panelType) return;
        const seriesMap = createSubChartSeries(subChart, ind);
        seriesMap.forEach((s, key) => {
          subEntry.series.set(key, s);
        });
      });

      subChartsRef.current.set(panelType, subEntry);

      // Sync time scales bidirectionally with main chart
      chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (range) {
          try { subChart.timeScale().setVisibleLogicalRange(range); } catch { /* */ }
        }
      });
      subChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (range) {
          try { chart.timeScale().setVisibleLogicalRange(range); } catch { /* */ }
        }
      });
    });

    // Record the structural state for this build
    prevStructureKeyRef.current = structureKey;

    // Set initial data on all series
    updateSeriesData();

    chart.timeScale().fitContent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey, activeSubPanelTypes, destroyCharts, createSubChartSeries, updateSeriesData]);

  /**
   * Resize all chart instances to fit their containers without rebuilding.
   */
  const handleResize = useCallback(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const subChartCount = subChartsRef.current.size;
    const mainHeight = subChartCount === 0 ? container.clientHeight : container.clientHeight * 0.6;
    const subHeight = subChartCount > 0 ? (container.clientHeight * 0.4) / subChartCount : 0;
    const width = container.clientWidth;

    if (chartRef.current && mainDivRef.current) {
      mainDivRef.current.style.height = `${mainHeight}px`;
      chartRef.current.resize(width, mainHeight);
    }

    subChartsRef.current.forEach(entry => {
      entry.div.style.height = `${subHeight}px`;
      entry.chart.resize(width, subHeight);
    });
  }, []);

  // Effect: Build chart on mount and when structure changes
  useEffect(() => {
    if (data.length === 0) return;

    const structureChanged = prevStructureKeyRef.current !== structureKey;

    if (structureChanged) {
      // Full rebuild needed
      buildChart();
    } else {
      // Structure is the same - just update data in-place
      updateSeriesData();
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [data, indicators, compareData, structureKey, buildChart, updateSeriesData]);

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
          // If chart hasn't been built yet (prevStructureKeyRef is null), build it now
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
  }, [data, indicators, compareData, structureKey]);

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
  }, [data, indicators, compareData, structureKey]);

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
