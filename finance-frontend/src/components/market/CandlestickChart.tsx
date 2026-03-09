import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, CandlestickSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import type { OHLCData } from '../../types';
import { getCandleData, type TimeSlot } from '../../services/marketService';
import { RefreshCw } from 'lucide-react';

/* ─── TimeSlot tabs matching backend com.finance.shared.TimeSlot enum ─── */

const SLOTS: { label: string; value: TimeSlot; desc: string }[] = [
    { label: '1dk', value: 'M1', desc: '1 Dakika' },
    { label: '5dk', value: 'M5', desc: '5 Dakika' },
    { label: '15dk', value: 'M15', desc: '15 Dakika' },
    { label: '30dk', value: 'M30', desc: '30 Dakika' },
    { label: '1sa', value: 'H1', desc: '1 Saat' },
    { label: '4sa', value: 'H4', desc: '4 Saat' },
    { label: '1G', value: 'D1', desc: 'Günlük' },
    { label: '1H', value: 'W1', desc: 'Haftalık' },
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

/* ─── Inner Chart Renderer (pure Lightweight Charts) ─── */

function OHLCChartRenderer({ data }: { data: OHLCData[] }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || !data.length) return;

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
            rightPriceScale: { borderColor: '#1e293b' },
            timeScale: {
                borderColor: '#1e293b',
                timeVisible: true,
                secondsVisible: false,
            },
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#ef4444',
            borderDownColor: '#ef4444',
            borderUpColor: '#10b981',
            wickDownColor: '#ef4444',
            wickUpColor: '#10b981',
        });

        chartRef.current = chart;
        seriesRef.current = series;
        series.setData(data as Parameters<typeof series.setData>[0]);
        chart.timeScale().fitContent();

        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                chart.applyOptions({ width: entry.contentRect.width });
            }
        });
        ro.observe(el);

        return () => {
            ro.disconnect();
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
        };
    }, [data]);

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
}

const CandlestickChart = ({ data: externalData, symbol }: CandlestickChartProps) => {
    const [slot, setSlot] = useState<TimeSlot>('D1');

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
    const showSlotSelector = !!symbol;
    const loading = !!symbol && isLoading;

    // Empty fallback
    if (!loading && chartData.length === 0) {
        return (
            <div
                className="w-full rounded-xl flex items-center justify-center bg-slate-900/30 border border-slate-700/40"
                style={{ minHeight: 420 }}
            >
                <div className="text-center">
                    <p className="text-slate-400 text-sm">Grafik verisi bulunamadı.</p>
                    <p className="text-slate-500 text-xs mt-1">
                        Bu enstrüman için henüz mum verisi yok.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* TimeSlot selector — only when self-managed */}
            {showSlotSelector && (
                <div className="flex items-center gap-3">
                    <div className="flex gap-1 bg-slate-900/60 rounded-lg p-1 border border-slate-700/40">
                        {SLOTS.map(({ label, value }) => (
                            <button
                                key={value}
                                onClick={() => setSlot(value)}
                                title={SLOTS.find(s => s.value === value)?.desc}
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
                    {isFetching && (
                        <RefreshCw size={14} className="text-emerald-400 animate-spin" />
                    )}
                </div>
            )}

            {/* Loading */}
            {loading && <ChartSkeleton />}

            {/* Error */}
            {isError && (
                <div className="flex items-center justify-center rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 text-sm" style={{ minHeight: 420 }}>
                    Mum verileri yüklenemedi. Tekrar deneyin.
                </div>
            )}

            {/* Chart */}
            {!loading && chartData.length > 0 && (
                <OHLCChartRenderer data={chartData} />
            )}
        </div>
    );
};

export default CandlestickChart;
