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
import { CandlestickChart as CandlestickIcon, LineChart as LineChartIcon, RefreshCw } from 'lucide-react';

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
                <div key={i} className="h-7 w-10 bg-slate-700/40 rounded-md" />
            ))}
        </div>
        <div className="h-[420px] bg-slate-700/15 rounded-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-700/10 to-transparent" />
        </div>
    </div>
);

/* ─── Chart Renderer — handles both Candlestick & Line ─── */

interface LinePoint {
    time: number;
    value: number;
}

function ChartRenderer({ ohlcData, lineData, mode }: { ohlcData: OHLCData[]; lineData: LinePoint[]; mode: ChartMode }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    const buildChart = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;

        const data = mode === 'candle' ? ohlcData : lineData;
        if (!data || data.length === 0) return;

        // Destroy previous chart
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
                // lineType 0 = Simple (point-to-point, no smoothing)
                // This ensures actual data points are connected without interpolation
                lineType: 0,
            });
            series.setData(lineData as Parameters<typeof series.setData>[0]);
        }

        chart.timeScale().fitContent();

        // Responsive
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
    }, [ohlcData, lineData, mode]);

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
    const lineChartData: LinePoint[] = useMemo(() => {
        if (!fetchedLineData) return [];
        return fetchedLineData.map(d => ({
            time: Math.floor(d.timestamp / 1000), // UNIX seconds for Lightweight Charts
            value: d.close,
        }));
    }, [fetchedLineData]);

    // Use external data if passed, otherwise use fetched data
    const candleData = externalData ?? fetchedCandleData ?? [];

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
                className="w-full rounded-xl flex items-center justify-center bg-slate-900/30 border border-slate-700/40"
                style={{ minHeight: 420 }}
            >
                <div className="text-center">
                    <p className="text-slate-400 text-sm">Grafik verisi bulunamadı.</p>
                    <p className="text-slate-500 text-xs mt-1">
                        Bu enstrüman için seçilen zaman aralığında veri yok.
                    </p>
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
                                <div className="flex gap-0.5 bg-slate-900/60 rounded-lg p-1 border border-slate-700/40">
                                    <button
                                        onClick={() => setMode('candle')}
                                        title="Mum Grafik (Candlestick)"
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-200
                                            ${mode === 'candle'
                                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                            }`}
                                    >
                                        <CandlestickIcon size={12} />
                                        Mum
                                    </button>
                                    <button
                                        onClick={() => setMode('line')}
                                        title="Çizgi Grafik (Line)"
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-200
                                            ${mode === 'line'
                                                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                            }`}
                                    >
                                        <LineChartIcon size={12} />
                                        Çizgi
                                    </button>
                                </div>
                            )}

                            {/* Date Range Selector — applies to BOTH modes */}
                            <div className="flex gap-0.5 bg-slate-900/60 rounded-lg p-1 border border-slate-700/40">
                                {DATE_RANGES.map(({ label, value }) => (
                                    <button
                                        key={value}
                                        onClick={() => setRange(value)}
                                        className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-200
                                            ${range === value
                                                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Loading indicator */}
                        {isFetching && (
                            <RefreshCw size={14} className="text-emerald-400 animate-spin" />
                        )}
                    </div>

                    {/* Row 2: TimeSlot selector — only for candle mode */}
                    {mode === 'candle' && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Mum Aralığı:</span>
                            <div className="flex gap-0.5 bg-slate-900/60 rounded-lg p-1 border border-slate-700/40">
                                {SLOTS.map(({ label, value }) => (
                                    <button
                                        key={value}
                                        onClick={() => setSlot(value)}
                                        className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-200
                                            ${slot === value
                                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                            }`}
                                    >
                                        {label}
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
                <ChartRenderer ohlcData={candleData} lineData={lineChartData} mode={mode} />
            )}
        </div>
    );
};

export default CandlestickChart;
