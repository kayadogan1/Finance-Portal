import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    createChart,
    CandlestickSeries,
    LineSeries,
    type IChartApi,
} from 'lightweight-charts';
import type { OHLCData } from '../../types';
import { getCandleData, getLineData, type TimeSlot } from '../../services/marketService';
import { CandlestickChart as CandlestickIcon, LineChart as LineChartIcon, RefreshCw, TrendingUp } from 'lucide-react';
import { calculateSMA, calculateEMA, calculateRSI, type IndicatorPoint } from '../../utils/indicators';

/* ─── Types ─── */

type ChartMode = 'candle' | 'line';

/**
 * DateRange — controls how far back we request data from the backend.
 * Mapped to `from` (candles) or `dateTime` (line) query param.
 */
type DateRange = '1G' | '1H' | '1A' | '3A' | '6A' | '1Y' | 'ALL';

const DATE_RANGES: { label: string; value: DateRange }[] = [
    { label: '1G', value: '1G' },
    { label: '1H', value: '1H' },
    { label: '1A', value: '1A' },
    { label: '3A', value: '3A' },
    { label: '6A', value: '6A' },
    { label: '1Y', value: '1Y' },
    { label: 'Tümü', value: 'ALL' },
];

/** Convert DateRange to a `from` ISO LocalDateTime string for the backend */
function dateRangeToFrom(range: DateRange): string | undefined {
    if (range === 'ALL') return undefined; // no from = all data

    const now = new Date();
    const offsets: Record<Exclude<DateRange, 'ALL'>, number> = {
        '1G': 24 * 60 * 60 * 1000,
        '1H': 7 * 24 * 60 * 60 * 1000,
        '1A': 30 * 24 * 60 * 60 * 1000,
        '3A': 90 * 24 * 60 * 60 * 1000,
        '6A': 180 * 24 * 60 * 60 * 1000,
        '1Y': 365 * 24 * 60 * 60 * 1000,
    };

    const from = new Date(now.getTime() - offsets[range]);
    return from.toISOString().replace('Z', '').split('.')[0];
}

/* ─── TimeSlot tabs matching backend com.finance.shared.TimeSlot enum ─── */

const SLOTS: { label: string; value: TimeSlot }[] = [
    { label: '1dk', value: 'M1' },
    { label: '5dk', value: 'M5' },
    { label: '15dk', value: 'M15' },
    { label: '30dk', value: 'M30' },
    { label: '1sa', value: 'H1' },
    { label: '4sa', value: 'H4' },
    { label: '1G', value: 'D1' },
    { label: '1H', value: 'W1' },
];

/* ─── Skeleton ─── */

const ChartSkeleton = () => (
    <div className="animate-pulse space-y-3">
        <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-7 w-10 bg-white/[0.05] rounded" />
            ))}
        </div>
        <div className="h-[420px] bg-white/[0.03] rounded" />
    </div>
);

/* ─── Indicator Config ─── */

type IndicatorId = 'sma20' | 'sma50' | 'ema12' | 'ema26' | 'rsi';

interface IndicatorConfig {
    id: IndicatorId;
    label: string;
    color: string;
    type: 'overlay' | 'panel';
}

const INDICATORS: IndicatorConfig[] = [
    { id: 'sma20', label: 'SMA 20', color: '#f59e0b', type: 'overlay' },
    { id: 'sma50', label: 'SMA 50', color: '#8b5cf6', type: 'overlay' },
    { id: 'ema12', label: 'EMA 12', color: '#06b6d4', type: 'overlay' },
    { id: 'ema26', label: 'EMA 26', color: '#ec4899', type: 'overlay' },
    { id: 'rsi',   label: 'RSI 14', color: '#a855f7', type: 'panel' },
];

/* ─── Chart Renderer — handles both Candlestick & Line + indicator overlays ─── */

interface LinePoint {
    time: number;
    value: number;
}

interface ChartRendererProps {
    ohlcData: OHLCData[];
    lineData: LinePoint[];
    mode: ChartMode;
    overlays: { id: string; data: IndicatorPoint[]; color: string }[];
}

function ChartRenderer({ ohlcData, lineData, mode, overlays }: ChartRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    const buildChart = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;

        const data = mode === 'candle' ? ohlcData : lineData;
        if (!data || data.length === 0) return;

        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        const chart = createChart(el, {
            width: el.clientWidth,
            height: 420,
            layout: {
                background: { color: 'transparent' },
                textColor: '#94a3b8',
                fontFamily: '"SF Mono", "Fira Code", monospace',
            },
            grid: {
                vertLines: { color: '#1e293b' },
                horzLines: { color: '#1e293b' },
            },
            crosshair: {
                vertLine: { color: '#475569', labelBackgroundColor: '#334155' },
                horzLine: { color: '#475569', labelBackgroundColor: '#334155' },
            },
            rightPriceScale: {
                borderColor: '#1e293b',
                autoScale: true,
            },
            timeScale: {
                borderColor: '#1e293b',
                timeVisible: true,
                secondsVisible: false,
            },
        });

        chartRef.current = chart;

        if (mode === 'candle') {
            const series = chart.addSeries(CandlestickSeries, {
                upColor: '#10b981',
                downColor: '#ef4444',
                borderDownColor: '#ef4444',
                borderUpColor: '#10b981',
                wickDownColor: '#ef4444',
                wickUpColor: '#10b981',
            });
            series.setData(ohlcData as Parameters<typeof series.setData>[0]);
        } else {
            const series = chart.addSeries(LineSeries, {
                color: '#10b981',
                lineWidth: 2,
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 4,
                crosshairMarkerBackgroundColor: '#10b981',
                crosshairMarkerBorderColor: '#0f172a',
                priceLineVisible: false,
                lineType: 0,
            });
            series.setData(lineData as Parameters<typeof series.setData>[0]);
        }

        // Add indicator overlays (SMA, EMA lines)
        for (const overlay of overlays) {
            if (overlay.data.length === 0) continue;
            const overlaySeries = chart.addSeries(LineSeries, {
                color: overlay.color,
                lineWidth: 1,
                crosshairMarkerVisible: false,
                priceLineVisible: false,
                lastValueVisible: false,
            });
            overlaySeries.setData(overlay.data as Parameters<typeof overlaySeries.setData>[0]);
        }

        chart.timeScale().fitContent();

        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (chartRef.current) {
                    chartRef.current.applyOptions({ width: entry.contentRect.width });
                }
            }
        });
        ro.observe(el);

        return () => {
            ro.disconnect();
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [ohlcData, lineData, mode, overlays]);

    useEffect(() => {
        const cleanup = buildChart();
        return () => cleanup?.();
    }, [buildChart]);

    return (
        <div
            ref={containerRef}
            className="w-full rounded-xl overflow-hidden"
            style={{ minHeight: 420 }}
        />
    );
}

/* ─── RSI Panel ─── */

function RSIPanel({ data }: { data: IndicatorPoint[] }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || data.length === 0) return;

        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        const chart = createChart(el, {
            width: el.clientWidth,
            height: 120,
            layout: {
                background: { color: 'transparent' },
                textColor: '#94a3b8',
                fontFamily: '"SF Mono", "Fira Code", monospace',
            },
            grid: {
                vertLines: { color: '#1e293b' },
                horzLines: { color: '#1e293b' },
            },
            crosshair: {
                vertLine: { color: '#475569', labelBackgroundColor: '#334155' },
                horzLine: { color: '#475569', labelBackgroundColor: '#334155' },
            },
            rightPriceScale: {
                borderColor: '#1e293b',
                autoScale: false,
                scaleMargins: { top: 0.05, bottom: 0.05 },
            },
            timeScale: {
                borderColor: '#1e293b',
                timeVisible: true,
                secondsVisible: false,
                visible: false,
            },
        });

        chartRef.current = chart;

        const rsiSeries = chart.addSeries(LineSeries, {
            color: '#a855f7',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
        });
        rsiSeries.setData(data as Parameters<typeof rsiSeries.setData>[0]);

        // Overbought / Oversold lines
        rsiSeries.createPriceLine({ price: 70, color: '#ef444480', lineWidth: 1, lineStyle: 2, title: '70' });
        rsiSeries.createPriceLine({ price: 30, color: '#10b98180', lineWidth: 1, lineStyle: 2, title: '30' });
        rsiSeries.createPriceLine({ price: 50, color: '#475569',   lineWidth: 1, lineStyle: 1, title: '' });

        chart.timeScale().fitContent();

        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (chartRef.current) {
                    chartRef.current.applyOptions({ width: entry.contentRect.width });
                }
            }
        });
        ro.observe(el);

        return () => {
            ro.disconnect();
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [data]);

    return (
        <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground tracking-wide">RSI (14)</span>
            <div
                ref={containerRef}
                className="w-full rounded overflow-hidden border border-border"
                style={{ minHeight: 120 }}
            />
        </div>
    );
}

/* ─── Main Exported Component ─── */

interface CandlestickChartProps {
    /** Pre-fetched OHLC data — backward compat */
    data?: OHLCData[];
    /** Symbol — when provided, this component fetches its own data */
    symbol?: string;
    /** Default TimeSlot for candle interval — defaults to W1 */
    defaultSlot?: TimeSlot;
    /** Default date range — defaults to 1H (1 Hafta) */
    defaultRange?: DateRange;
    /** Show chart mode toggle (Mum/Çizgi) — default true */
    showModeToggle?: boolean;
}

const CandlestickChart = ({
    data: externalData,
    symbol,
    defaultSlot = 'W1',
    defaultRange = '1H',
    showModeToggle = true,
}: CandlestickChartProps) => {
    const [slot, setSlot] = useState<TimeSlot>(defaultSlot);
    const [mode, setMode] = useState<ChartMode>('candle');
    const [range, setRange] = useState<DateRange>(defaultRange);
    const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorId>>(new Set());

    const toggleIndicator = (id: IndicatorId) => {
        setActiveIndicators(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // Compute `from` string based on selected DateRange
    const fromDate = useMemo(() => dateRangeToFrom(range), [range]);

    // ──── Candle data query ────
    const {
        data: fetchedCandleData,
        isLoading: candleLoading,
        isError: candleError,
        isFetching: candleFetching,
    } = useQuery<OHLCData[]>({
        queryKey: ['candle-data', symbol, slot, fromDate],
        queryFn: () => getCandleData(symbol!, slot, fromDate),
        enabled: !!symbol && mode === 'candle',
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 15,
        refetchOnWindowFocus: false,
    });

    // ──── Line data query ────
    const {
        data: fetchedLineData,
        isLoading: lineLoading,
        isError: lineError,
        isFetching: lineFetching,
    } = useQuery({
        queryKey: ['line-data', symbol, fromDate],
        queryFn: () => getLineData(symbol!, fromDate),
        enabled: !!symbol && mode === 'line',
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 15,
        refetchOnWindowFocus: false,
    });

    // Transform line data to Lightweight Charts format
    // IMPORTANT: Lightweight Charts requires STRICTLY ASCENDING timestamps with NO duplicates
    const lineChartData: LinePoint[] = useMemo(() => {
        if (!fetchedLineData) return [];
        const mapped = fetchedLineData.map(d => ({
            time: Math.floor(d.timestamp / 1000),
            value: d.close,
        }));
        // Sort ascending and deduplicate (keep last entry per timestamp)
        mapped.sort((a, b) => a.time - b.time);
        const deduped = new Map<number, LinePoint>();
        for (const p of mapped) deduped.set(p.time, p);
        return [...deduped.values()];
    }, [fetchedLineData]);

    // Use external data if passed, otherwise use fetched data
    // Also sort + deduplicate candle data
    const candleData = useMemo(() => {
        const raw = externalData ?? fetchedCandleData ?? [];
        if (raw.length === 0) return raw;
        const sorted = [...raw].sort((a, b) => a.time - b.time);
        const deduped = new Map<number, OHLCData>();
        for (const c of sorted) deduped.set(c.time, c);
        return [...deduped.values()];
    }, [externalData, fetchedCandleData]);

    // Compute indicator data from candle OHLC data
    const indicatorOverlays = useMemo(() => {
        if (mode !== 'candle' || candleData.length === 0) return [];
        const overlays: { id: string; data: IndicatorPoint[]; color: string }[] = [];
        if (activeIndicators.has('sma20')) overlays.push({ id: 'sma20', data: calculateSMA(candleData, 20), color: '#f59e0b' });
        if (activeIndicators.has('sma50')) overlays.push({ id: 'sma50', data: calculateSMA(candleData, 50), color: '#8b5cf6' });
        if (activeIndicators.has('ema12')) overlays.push({ id: 'ema12', data: calculateEMA(candleData, 12), color: '#06b6d4' });
        if (activeIndicators.has('ema26')) overlays.push({ id: 'ema26', data: calculateEMA(candleData, 26), color: '#ec4899' });
        return overlays;
    }, [candleData, activeIndicators, mode]);

    const rsiData = useMemo(() => {
        if (!activeIndicators.has('rsi') || candleData.length === 0) return [];
        return calculateRSI(candleData, 14);
    }, [candleData, activeIndicators]);

    const showToolbar = !!symbol;
    const isLoading = mode === 'candle' ? candleLoading : lineLoading;
    const isError = mode === 'candle' ? candleError : lineError;
    const isFetching = mode === 'candle' ? candleFetching : lineFetching;
    const loading = !!symbol && isLoading;

    const hasData = mode === 'candle' ? candleData.length > 0 : lineChartData.length > 0;

    // Empty fallback
    if (!loading && !hasData && !isError) {
        return (
            <div
                className="w-full rounded flex items-center justify-center bg-background border border-border"
                style={{ minHeight: 420 }}
            >
                <div className="text-center">
                    <p className="text-[13px] text-muted-foreground">Grafik verisi bulunamadı.</p>
                    <p className="text-meta mt-1">Bu enstrüman için seçilen zaman aralığında veri yok.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Toolbar */}
            {showToolbar && (
                <div className="space-y-2">
                    {/* Row 1: Mode toggle + Date range */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            {/* Chart Mode Toggle */}
                            {showModeToggle && (
                                <div className="flex gap-0.5 bg-background rounded p-1 border border-border">
                                    <button
                                        onClick={() => setMode('candle')}
                                        title="Mum Grafik"
                                        className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded transition-colors
                                            ${mode === 'candle' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                                    >
                                        <CandlestickIcon size={12} /> Mum
                                    </button>
                                    <button
                                        onClick={() => setMode('line')}
                                        title="Çizgi Grafik"
                                        className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded transition-colors
                                            ${mode === 'line' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                                    >
                                        <LineChartIcon size={12} /> Çizgi
                                    </button>
                                </div>
                            )}

                            {/* Date Range Selector — applies to BOTH modes */}
                            <div className="flex gap-0.5 bg-background rounded p-1 border border-border">
                                {DATE_RANGES.map(({ label, value }) => (
                                    <button key={value} onClick={() => setRange(value)}
                                        className={`px-2.5 py-1.5 text-[11px] font-medium rounded transition-colors
                                            ${range === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Loading indicator */}
                        {isFetching && (
                            <RefreshCw size={14} className="text-primary animate-spin" />
                        )}
                    </div>

                    {/* Row 2: TimeSlot selector — only for candle mode */}
                    {mode === 'candle' && (
                        <div className="flex items-center gap-2">
                            <span className="text-label">Mum Aralığı:</span>
                            <div className="flex gap-0.5 bg-background rounded p-1 border border-border">
                                {SLOTS.map(({ label, value }) => (
                                    <button key={value} onClick={() => setSlot(value)}
                                        className={`px-2.5 py-1.5 text-[11px] font-medium rounded transition-colors
                                            ${slot === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Row 3: Indicator selector — only for candle mode */}
                    {mode === 'candle' && (
                        <div className="flex items-center gap-2">
                            <TrendingUp size={13} className="text-muted-foreground" />
                            <span className="text-label">İndikatörler:</span>
                            <div className="flex gap-1 flex-wrap">
                                {INDICATORS.map((ind) => (
                                    <button
                                        key={ind.id}
                                        onClick={() => toggleIndicator(ind.id)}
                                        className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all ${
                                            activeIndicators.has(ind.id)
                                                ? 'border-transparent text-white'
                                                : 'border-border text-muted-foreground hover:text-foreground hover:border-white/10'
                                        }`}
                                        style={activeIndicators.has(ind.id) ? { backgroundColor: ind.color + '30', color: ind.color, borderColor: ind.color + '50' } : undefined}
                                    >
                                        {ind.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* States */}
            {loading && <ChartSkeleton />}

            {isError && (
                <div className="flex items-center justify-center rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 text-sm" style={{ minHeight: 420 }}>
                    Grafik verileri yüklenemedi. Tekrar deneyin.
                </div>
            )}

            {/* Chart */}
            {!loading && hasData && (
                <>
                    <ChartRenderer ohlcData={candleData} lineData={lineChartData} mode={mode} overlays={indicatorOverlays} />

                    {/* Indicator legend */}
                    {indicatorOverlays.length > 0 && (
                        <div className="flex gap-3 px-1">
                            {indicatorOverlays.map(o => {
                                const cfg = INDICATORS.find(i => i.id === o.id);
                                return (
                                    <span key={o.id} className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: o.color }}>
                                        <span className="inline-block w-3 h-[2px] rounded" style={{ backgroundColor: o.color }} />
                                        {cfg?.label}
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {/* RSI Panel */}
                    {activeIndicators.has('rsi') && rsiData.length > 0 && (
                        <RSIPanel data={rsiData} />
                    )}
                </>
            )}
        </div>
    );
};

export default CandlestickChart;
