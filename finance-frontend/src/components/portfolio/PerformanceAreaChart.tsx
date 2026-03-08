import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';
import { getPortfolioHistory } from '../../services/portfolioService';
import type { PerformanceLineChartDto, PortfolioRange } from '../../services/portfolioService';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/* ─── Range Tabs — maps to backend PortfolioRange enum ─── */

const RANGES: { label: string; value: PortfolioRange }[] = [
    { label: '1G', value: 'DAILY' },
    { label: '1H', value: 'WEEKLY' },
    { label: '1A', value: 'MONTHLY' },
    { label: '3A', value: 'THREE_MONTHS' },
    { label: '6A', value: 'SIX_MONTHS' },
    { label: '1Y', value: 'YEARLY' },
    { label: 'Tümü', value: 'ALL' },
];

/* ─── Turkish month abbreviations ─── */

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function formatDateShort(dateStr: string): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    return `${day} ${TR_MONTHS[d.getMonth()]}`;
}

function formatDateFull(dateStr: string): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${day} ${TR_MONTHS[d.getMonth()]} ${year}`;
}

function formatCurrency(value: number): string {
    return value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}

/* ─── Skeleton ─── */

const ChartSkeleton = () => (
    <div className="animate-pulse space-y-4">
        <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-8 w-12 bg-slate-700/40 rounded-md" />
            ))}
        </div>
        <div className="h-[380px] bg-slate-700/20 rounded-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-700/10 to-transparent" />
        </div>
    </div>
);

/* ─── Custom Tooltip ─── */

interface TooltipProps {
    active?: boolean;
    payload?: { value: number }[];
    label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (!active || !payload?.length || !label) return null;
    return (
        <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-600/50 rounded-xl px-4 py-3 shadow-2xl shadow-black/40">
            <p className="text-slate-400 text-[11px] font-medium mb-1">{formatDateFull(label)}</p>
            <p className="text-white text-base font-bold font-mono">
                {formatCurrency(payload[0].value)}
            </p>
        </div>
    );
};

/* ─── Main Component ─── */

interface PerformanceAreaChartProps {
    portfolioId: string;
}

export default function PerformanceAreaChart({ portfolioId }: PerformanceAreaChartProps) {
    const [range, setRange] = useState<PortfolioRange>('WEEKLY');

    const { data, isLoading, isError } = useQuery<PerformanceLineChartDto[]>({
        queryKey: ['portfolioHistory', portfolioId, range],
        queryFn: () => getPortfolioHistory(portfolioId, range),
        staleTime: 1000 * 60 * 10,
        gcTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    // Map backend fields to chart-friendly format
    const chartData = (data ?? []).map((d) => ({
        date: d.time,
        value: Number(d.totalPrice),
    }));

    // Calculate summary stats
    const firstValue = chartData.length > 0 ? chartData[0].value : 0;
    const lastValue = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
    const change = lastValue - firstValue;
    const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0;
    const isPositive = change > 0;
    const isNeutral = change === 0;

    // Dynamic gradient color based on performance
    const accentColor = isPositive ? '#10b981' : isNeutral ? '#64748b' : '#ef4444';
    const gradientId = `perfGradient-${portfolioId}`;

    return (
        <div className="space-y-5">
            {/* Range selector + Performance summary */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                {/* Range tabs */}
                <div className="flex gap-1 bg-slate-900/60 rounded-lg p-1 border border-slate-700/40">
                    {RANGES.map(({ label, value }) => (
                        <button
                            key={value}
                            onClick={() => setRange(value)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200
                                ${range === value
                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Performance badge */}
                {chartData.length > 1 && !isLoading && (
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono font-semibold border ${isPositive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : isNeutral
                                ? 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                        {isPositive ? <TrendingUp size={14} /> : isNeutral ? <Minus size={14} /> : <TrendingDown size={14} />}
                        {isPositive ? '+' : ''}{formatCurrency(change)}
                        <span className="text-[11px] opacity-70">({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)</span>
                    </div>
                )}
            </div>

            {/* Loading state */}
            {isLoading && <ChartSkeleton />}

            {/* Error state */}
            {isError && (
                <div className="flex items-center justify-center h-96 text-red-400 text-sm rounded-xl bg-red-500/5 border border-red-500/10">
                    Performans verileri yüklenemedi. Lütfen tekrar deneyin.
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !isError && chartData.length === 0 && (
                <div className="flex flex-col items-center justify-center h-96 text-slate-500 rounded-xl bg-slate-800/30 border border-slate-700/30">
                    <TrendingUp size={36} className="mb-3 opacity-30" />
                    <p className="text-sm">Bu zaman aralığı için veri bulunamadı.</p>
                    <p className="text-xs mt-1 text-slate-600">Farklı bir aralık seçmeyi deneyin.</p>
                </div>
            )}

            {/* Chart */}
            {!isLoading && chartData.length > 0 && (
                <ResponsiveContainer width="100%" height={380}>
                    <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={accentColor} stopOpacity={0.25} />
                                <stop offset="50%" stopColor={accentColor} stopOpacity={0.08} />
                                <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid
                            strokeDasharray="3 6"
                            stroke="#1e293b"
                            vertical={false}
                        />

                        <XAxis
                            dataKey="date"
                            tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                            axisLine={{ stroke: '#1e293b' }}
                            tickLine={false}
                            tickFormatter={formatDateShort}
                            minTickGap={40}
                            dy={8}
                        />

                        <YAxis
                            tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                            axisLine={false}
                            tickLine={false}
                            width={80}
                            domain={['dataMin - 1000', 'dataMax + 1000']}
                            tickFormatter={(val: number) =>
                                val >= 1_000_000
                                    ? `₺${(val / 1_000_000).toFixed(1)}M`
                                    : val >= 1_000
                                        ? `₺${(val / 1_000).toFixed(1)}K`
                                        : `₺${val.toFixed(0)}`
                            }
                        />

                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{
                                stroke: '#475569',
                                strokeWidth: 1,
                                strokeDasharray: '4 4',
                            }}
                        />

                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={accentColor}
                            strokeWidth={2.5}
                            fill={`url(#${gradientId})`}
                            animationDuration={600}
                            animationEasing="ease-out"
                            dot={false}
                            activeDot={{
                                r: 5,
                                fill: accentColor,
                                stroke: '#0f172a',
                                strokeWidth: 3,
                            }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
