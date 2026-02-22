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

        // Create chart
        const chart = createChart(container, {
            width: container.clientWidth,
            height: 420,
            layout: {
                background: { color: 'transparent' },
                textColor: '#94a3b8', // slate-400
                fontFamily: 'Inter, system-ui, sans-serif',
            },
            grid: {
                vertLines: { color: '#1e293b' }, // slate-800
                horzLines: { color: '#1e293b' },
            },
            crosshair: {
                vertLine: { color: '#475569', labelBackgroundColor: '#334155' },
                horzLine: { color: '#475569', labelBackgroundColor: '#334155' },
            },
            rightPriceScale: {
                borderColor: '#334155', // slate-700
            },
            timeScale: {
                borderColor: '#334155',
                timeVisible: false,
            },
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',        // emerald-500
            downColor: '#ef4444',      // red-500
            borderDownColor: '#ef4444',
            borderUpColor: '#10b981',
            wickDownColor: '#ef4444',
            wickUpColor: '#10b981',
        });

        chartRef.current = chart;
        seriesRef.current = series;

        // Set data and fit
        series.setData(data);
        chart.timeScale().fitContent();

        // ResizeObserver for responsive resizing
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                chart.applyOptions({ width });
            }
        });
        resizeObserver.observe(container);

        // Cleanup: disconnect observer and remove chart to prevent memory leaks
        return () => {
            resizeObserver.disconnect();
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
};

export default CandlestickChart;
