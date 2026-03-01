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
import type { PerformanceLineChartDto } from '../../services/portfolioService';

const TIMEFRAMES = [
    { label: '1G', days: 1 },
    { label: '3G', days: 3 },
    { label: '1H', days: 7 },
    { label: '1A', days: 30 },
    { label: '3A', days: 90 },
    { label: '1Y', days: 365 },
] as const;

const ChartSkeleton = () => (
    <div className="animate-pulse space-y-3">
        <div className="h-[300px] bg-slate-700/20 rounded-lg" />
    </div>
);

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
            <p className="text-slate-400 text-[11px]">{label}</p>
            <p className="text-emerald-400 text-sm font-bold font-mono">
                ₺{Number(payload[0].value).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </p>
        </div>
    );
};

interface PerformanceAreaChartProps {
    portfolioId: string;
}

export default function PerformanceAreaChart({ portfolioId }: PerformanceAreaChartProps) {
    const [selectedDays, setSelectedDays] = useState(30);

    /**
     * CACHING MANDATE:
     * - staleTime: 10 minutes — switching 1M -> 3M -> 1M serves from memory cache
     * - refetchOnWindowFocus: disabled — prevents expensive backend recalculations
     * - queryKey includes [portfolioId, selectedDays] for proper cache isolation
     */
    const { data, isLoading, isError } = useQuery<PerformanceLineChartDto[]>({
        queryKey: ['portfolioHistory', portfolioId, selectedDays],
        queryFn: () => getPortfolioHistory(portfolioId, selectedDays),
        staleTime: 1000 * 60 * 10,        // 10 minutes — aggressive cache
        gcTime: 1000 * 60 * 30,            // 30 minutes — keep in garbage collection
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    const chartData = (data ?? []).map((d) => ({
        date: d.time,
        value: Number(d.totalPrice),
    }));

    return (
        <div className="space-y-4">
            {/* Timeframe toggle group */}
            <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1 w-fit border border-slate-700/50">
                {TIMEFRAMES.map(({ label, days }) => (
                    <button
                        key={days}
                        onClick={() => setSelectedDays(days)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200
                            ${selectedDays === days
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Chart area */}
            {isLoading && <ChartSkeleton />}

            {isError && (
                <div className="flex items-center justify-center h-[300px] text-red-400 text-sm">
                    Performans verileri yüklenemedi.
                </div>
            )}

            {!isLoading && !isError && chartData.length === 0 && (
                <div className="flex items-center justify-center h-[300px] text-slate-500 text-sm">
                    Bu zaman aralığı için veri bulunamadı.
                </div>
            )}

            {!isLoading && chartData.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart
                        data={chartData}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            axisLine={{ stroke: '#334155' }}
                            tickLine={false}
                            tickFormatter={(val: string) => {
                                if (selectedDays <= 7) return val.slice(5); // "02-15"
                                return val.slice(5);
                            }}
                        />
                        <YAxis
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            width={70}
                            tickFormatter={(val: number) =>
                                val >= 1000 ? `₺${(val / 1000).toFixed(1)}K` : `₺${val.toFixed(0)}`
                            }
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#10b981"
                            strokeWidth={2}
                            fill="url(#perfGradient)"
                            animationDuration={500}
                            animationEasing="ease-out"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
