import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { PieChartDto } from '../../services/portfolioService';

const COLORS = [
    '#10b981', '#8b5cf6', '#f59e0b', '#3b82f6',
    '#ef4444', '#06b6d4', '#ec4899', '#14b8a6',
    '#f97316', '#a855f7',
];

interface PortfolioPieChartProps {
    data: PieChartDto[];
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

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: ChartSlice & { percent?: number } }[] }) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0];
    const percent = item.payload.percentage ?? (item.payload.percent !== undefined ? item.payload.percent * 100 : undefined);
    return (
        <div className="bg-card border border-border rounded px-3 py-2 shadow-none">
            <p className="text-[13px] font-semibold text-foreground">{item.name}</p>
            {item.payload.symbol && (
                <p className="text-[11px] text-muted-foreground">{item.payload.symbol}</p>
            )}
            <p className="text-primary text-[12px] tabular-nums">
                ₺{Number(item.value).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </p>
            {percent !== undefined && <p className="text-meta">{percent.toFixed(1)}%</p>}
        </div>
    );
};

export default function PortfolioPieChartComponent({ data }: PortfolioPieChartProps) {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-[13px]">
                Varlık bulunamadı
            </div>
        );
    }

    const chartData: ChartSlice[] = data.map((d, index) => ({
        name: getSliceName(d, index),
        symbol: d.symbol ?? undefined,
        instrumentType: d.instrumentType ?? undefined,
        currency: d.currency ?? undefined,
        value: Number(d.totalValue),
        percentage: d.percentage === null || d.percentage === undefined ? undefined : Number(d.percentage),
    }));

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
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                        <span className="text-[11px] text-muted-foreground">{value || 'Varlık'}</span>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
