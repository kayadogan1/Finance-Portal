import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    createChart,
    CandlestickSeries,
    LineSeries,
    type IChartApi,
} from 'lightweight-charts';
import type { OHLCData } from '../../types';
import { getCandleData, type TimeSlot } from '../../services/marketService';
import { CandlestickChart as CandlestickIcon, LineChart as LineChartIcon, RefreshCw } from 'lucide-react';

/* ─── Types ─── */

type ChartMode = 'candle' | 'line';

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
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-7 w-10 bg-slate-700/40 rounded-md" />
            ))}
        </div>
        <div className="h-[420px] bg-slate-700/15 rounded-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-700/10 to-transparent" />
        </div>
    </div>
);

/* ─── Chart Renderer — handles both Candlestick & Line ─── */

function ChartRenderer({ data, mode }: { data: OHLCData[]; mode: ChartMode }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    const buildChart = useCallback(() => {
        const el = containerRef.current;
        if (!el || !data.length) return;

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
            series.setData(data as Parameters<typeof series.setData>[0]);
        } else {
            const series = chart.addSeries(LineSeries, {
                color: '#10b981',
                lineWidth: 2,
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 4,
                crosshairMarkerBackgroundColor: '#10b981',
                crosshairMarkerBorderColor: '#0f172a',
                priceLineVisible: false,
            });
            // Line mode: only use close + time
            const lineData = data.map(d => ({
                time: d.time,
                value: d.close,
            }));
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
    }, [data, mode]);

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
    /** Pre-fetched data — used by pages that manage their own queries */
    data?: OHLCData[];
    /** Symbol — when provided, this component fetches its own data with TimeSlot selector */
    symbol?: string;
    /** Default TimeSlot — defaults to W1 (Haftalık) */
    defaultSlot?: TimeSlot;
    /** Show chart mode toggle (Mum/Çizgi) — default true */
    showModeToggle?: boolean;
}

const CandlestickChart = ({
    data: externalData,
    symbol,
    defaultSlot = 'W1',
    showModeToggle = true,
}: CandlestickChartProps) => {
    const [slot, setSlot] = useState<TimeSlot>(defaultSlot);
    const [mode, setMode] = useState<ChartMode>('candle');

    // Self-managed query when `symbol` is provided
    const { data: fetchedData, isLoading, isError, isFetching } = useQuery<OHLCData[]>({
        queryKey: ['candle-data', symbol, slot],
        queryFn: () => getCandleData(symbol!, slot),
        enabled: !!symbol,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 15,
        refetchOnWindowFocus: false,
    });

    const chartData = externalData ?? fetchedData ?? [];
    const showToolbar = !!symbol;
    const loading = !!symbol && isLoading;

    // Empty fallback
    if (!loading && chartData.length === 0 && !isError) {
        return (
            <div
                className="w-full rounded-xl flex items-center justify-center bg-slate-900/30 border border-slate-700/40"
                style={{ minHeight: 420 }}
            >
                <div className="text-center">
                    <p className="text-slate-400 text-sm">Grafik verisi bulunamadı.</p>
                    <p className="text-slate-500 text-xs mt-1">
                        Bu enstrüman için henüz veri yok.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Toolbar: Mode toggle + TimeSlot selector */}
            {showToolbar && (
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

                        {/* TimeSlot Selector */}
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

                    {/* Loading indicator */}
                    {isFetching && (
                        <RefreshCw size={14} className="text-emerald-400 animate-spin" />
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

            {/* Chart — renders both modes using ChartRenderer */}
            {!loading && chartData.length > 0 && (
                <ChartRenderer data={chartData} mode={mode} />
            )}
        </div>
    );
};

export default CandlestickChart;
