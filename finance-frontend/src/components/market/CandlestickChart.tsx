import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import type { OHLCData } from '../../types';

interface CandlestickChartProps {
    data: OHLCData[];
}

const CandlestickChart = ({ data }: CandlestickChartProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // RULE 3: Do NOT render chart if data is empty
        if (!data || data.length === 0) return;

        const chart = createChart(container, {
            width: container.clientWidth,
            height: 420,
            layout: {
                background: { color: 'transparent' },
                textColor: '#94a3b8',
                fontFamily: 'Inter, system-ui, sans-serif',
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
                borderColor: '#334155',
            },
            timeScale: {
                borderColor: '#334155',
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

        // Data is already parsed to { time: UNIX_SECONDS, open, high, low, close }
        // by the service layer (getCandleData). No raw ISO strings reach here.
        series.setData(data);
        chart.timeScale().fitContent();

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                chart.applyOptions({ width: entry.contentRect.width });
            }
        });
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
        };
    }, [data]);

    // RULE 3: Empty data fallback
    if (!data || data.length === 0) {
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
        <div
            ref={containerRef}
            className="w-full rounded-xl overflow-hidden"
            style={{ minHeight: 420 }}
        />
    );
};

export default CandlestickChart;
