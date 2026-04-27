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
    <div className="animate-pulse space-y-3">
        <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-7 w-10 bg-white/[0.05] rounded" />
            ))}
        </div>
        <div className="h-[380px] bg-white/[0.03] rounded" />
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
        <div className="bg-card border border-border rounded px-3.5 py-2.5 shadow-none">
            <p className="text-meta mb-0.5">{formatDateFull(label)}</p>
            <p className="text-[14px] font-bold tabular-nums text-foreground">{formatCurrency(payload[0].value)}</p>
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
    const accentColor = isPositive ? '#10b981' : isNeutral ? 'hsl(var(--muted-foreground))' : '#ef4444';
    const gradientId = `perfGradient-${portfolioId}`;

    return (
        <div className="space-y-5">
            {/* Range selector + Performance summary */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                {/* Range tabs */}
                <div className="flex gap-0.5 bg-background rounded p-1 border border-border">
                    {RANGES.map(({ label, value }) => (
                        <button key={value} onClick={() => setRange(value)}
                            className={`px-2.5 py-1.5 text-[11px] font-medium rounded transition-colors
                                ${range === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Performance badge */}
                {chartData.length > 1 && !isLoading && (
                    <span className={`inline-flex items-center gap-1.5 ${isPositive ? 'badge-positive' : isNeutral ? 'bg-white/5 text-muted-foreground text-[12px] font-medium px-2 py-0.5 rounded-sm' : 'badge-negative'}`}>
                        {isPositive ? <TrendingUp size={12} /> : isNeutral ? <Minus size={12} /> : <TrendingDown size={12} />}
                        {isPositive ? '+' : ''}{formatCurrency(change)}
                        <span className="text-[10px] opacity-60">({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)</span>
                    </span>
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
                <div className="flex flex-col items-center justify-center h-96 rounded bg-background border border-border">
                    <TrendingUp size={28} className="mb-2 text-ghost" />
                    <p className="text-[13px] text-muted-foreground">Bu zaman aralığı için veri bulunamadı.</p>
                    <p className="text-meta mt-1">Farklı bir aralık seçmeyi deneyin.</p>
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
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontFamily: 'monospace' }}
                            axisLine={{ stroke: '#1e293b' }}
                            tickLine={false}
                            tickFormatter={formatDateShort}
                            minTickGap={40}
                            dy={8}
                        />

                        <YAxis
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontFamily: 'monospace' }}
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
                                stroke: 'hsl(var(--subtle-foreground))',
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
