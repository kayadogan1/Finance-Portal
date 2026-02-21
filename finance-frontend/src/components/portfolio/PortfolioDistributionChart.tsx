import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { DistributionData } from '../../services/portfolioService';

interface Props {
    data: DistributionData;
}

const PortfolioDistributionChart = ({ data }: Props) => {
    const total = data.series.reduce((sum, v) => sum + v, 0);

    const options: ApexOptions = {
        chart: {
            type: 'donut',
            background: 'transparent',
            fontFamily: 'Inter, system-ui, sans-serif',
        },
        labels: data.labels,
        colors: ['#10b981', '#6366f1', '#f59e0b', '#64748b'],
        stroke: {
            width: 2,
            colors: ['#0f172a'],
        },
        dataLabels: {
            enabled: true,
            style: {
                fontSize: '13px',
                fontWeight: 600,
                colors: ['#fff'],
            },
            dropShadow: { enabled: false },
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '62%',
                    labels: {
                        show: true,
                        name: {
                            show: true,
                            fontSize: '14px',
                            color: '#94a3b8',
                            offsetY: -8,
                        },
                        value: {
                            show: true,
                            fontSize: '22px',
                            fontWeight: 700,
                            color: '#f1f5f9',
                            offsetY: 4,
                            formatter: (val: string) =>
                                `₺${Number(val).toLocaleString('tr-TR')}`,
                        },
                        total: {
                            show: true,
                            label: 'Toplam',
                            fontSize: '14px',
                            color: '#94a3b8',
                            formatter: () => `₺${total.toLocaleString('tr-TR')}`,
                        },
                    },
                },
            },
        },
        legend: {
            position: 'bottom',
            fontSize: '13px',
            labels: { colors: '#cbd5e1' },
            markers: { size: 8, offsetX: -4 },
            itemMargin: { horizontal: 12, vertical: 6 },
            formatter: (seriesName: string, opts) => {
                const value = opts.w.globals.series[opts.seriesIndex];
                return `${seriesName}  —  ₺${value.toLocaleString('tr-TR')}`;
            },
        },
        tooltip: {
            theme: 'dark',
            y: {
                formatter: (val: number) => `₺${val.toLocaleString('tr-TR')}`,
            },
        },
        responsive: [
            {
                breakpoint: 480,
                options: {
                    chart: { height: 320 },
                    legend: { position: 'bottom' },
                },
            },
        ],
    };

    return (
        <Chart
            options={options}
            series={data.series}
            type="donut"
            height={380}
        />
    );
};

export default PortfolioDistributionChart;
