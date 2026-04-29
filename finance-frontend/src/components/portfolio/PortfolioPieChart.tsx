import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { PieChartDto } from '../../services/portfolioService';
import { formatMarketPrice } from '../../utils/currency';

const COLORS = [
    '#10b981', '#8b5cf6', '#f59e0b', '#3b82f6',
    '#ef4444', '#06b6d4', '#ec4899', '#14b8a6',
    '#f97316', '#a855f7',
];

interface PortfolioPieChartProps {
    data: PieChartDto[];
    displayCurrency?: string;
}

type ChartSlice = {
    name: string;
    symbol?: string;
    instrumentType?: string;
    currency?: string;
    value: number;
    percentage?: number;
};

const getSliceName = (item: PieChartDto, index: number) => {
    const label = item.label?.trim();
    if (label) return label;
    const symbol = item.symbol?.trim();
    if (symbol) return symbol;
    const type = item.instrumentType?.trim();
    if (type) return type;
    return `Varlık ${index + 1}`;
};

const formatPercentage = (value?: number) => {
    if (value === undefined || !Number.isFinite(value)) return null;
    if (value > 0 && value < 0.1) return '<0.1%';
    return `%${value.toFixed(1)}`;
};

const CustomTooltip = ({ active, payload, displayCurrency }: { active?: boolean; payload?: { name: string; value: number; payload: ChartSlice & { percent?: number } }[]; displayCurrency?: string }) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0];
    const percent = item.payload.percentage ?? (item.payload.percent !== undefined ? item.payload.percent * 100 : undefined);
    const percentText = formatPercentage(percent);
    return (
        <div className="bg-card border border-border rounded px-3 py-2 shadow-none">
            <p className="text-[13px] font-semibold text-foreground">{item.name}</p>
            {item.payload.symbol && (
                <p className="text-[11px] text-muted-foreground">{item.payload.symbol}</p>
            )}
            <p className="text-primary text-[12px] tabular-nums">
                {formatMarketPrice(Number(item.value), displayCurrency ?? item.payload.currency ?? 'TRY')}
            </p>
            {percentText && <p className="text-meta">{percentText}</p>}
        </div>
    );
};

export default function PortfolioPieChartComponent({ data, displayCurrency }: PortfolioPieChartProps) {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-[13px]">
                Varlık bulunamadı
            </div>
        );
    }

    const totalValue = data.reduce((sum, item) => sum + Number(item.totalValue || 0), 0);
    const chartData: ChartSlice[] = data.map((d, index) => {
        const value = Number(d.totalValue);
        const backendPercent = d.percentage === null || d.percentage === undefined ? undefined : Number(d.percentage);
        const calculatedPercent = totalValue > 0 ? (value / totalValue) * 100 : undefined;
        return {
            name: getSliceName(d, index),
            symbol: d.symbol ?? undefined,
            instrumentType: d.instrumentType ?? undefined,
            currency: d.currency ?? undefined,
            value,
            percentage: backendPercent && backendPercent > 0 ? backendPercent : calculatedPercent,
        };
    });

    return (
        <ResponsiveContainer width="100%" height={280}>
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    minAngle={2}
                    dataKey="value"
                    nameKey="name"
                    animationDuration={600}
                    animationEasing="ease-out"
                >
                    {chartData.map((_, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            stroke="transparent"
                        />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip displayCurrency={displayCurrency} />} />
                <Legend
                    verticalAlign="bottom"
                    content={() => (
                        <div className="mt-2 grid grid-cols-1 gap-1.5 px-2">
                            {chartData.map((item, index) => (
                                <div key={`${item.name}-${index}`} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                    <span
                                        className="inline-block h-2.5 w-2.5 rounded-sm"
                                        style={{ background: COLORS[index % COLORS.length] }}
                                    />
                                    <span className="min-w-0 flex-1 truncate text-foreground">{item.name}</span>
                                    {(displayCurrency ?? item.currency) && (
                                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                            {displayCurrency ?? item.currency}
                                        </span>
                                    )}
                                    {formatPercentage(item.percentage) && (
                                        <span className="tabular-nums text-muted-foreground">{formatPercentage(item.percentage)}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
