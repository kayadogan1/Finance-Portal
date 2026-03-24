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

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { percent: number } }[] }) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0];
    return (
        <div className="bg-card border border-border rounded px-3 py-2 shadow-none">
            <p className="text-[13px] font-semibold text-foreground">{item.name}</p>
            <p className="text-primary text-[12px] tabular-nums">
                ₺{Number(item.value).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-meta">{(item.payload.percent * 100).toFixed(1)}%</p>
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

    const chartData = data.map((d) => ({
        name: d.instrumentName,
        value: Number(d.totalValue),
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
                        <span className="text-[11px] text-muted-foreground">{value}</span>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
