import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { HistoryData } from '../../services/portfolioService';

interface Props {
    data: HistoryData;
}

const PortfolioHistoryChart = ({ data }: Props) => {
    const options: ApexOptions = {
        chart: {
            type: 'area',
            background: 'transparent',
            fontFamily: 'Inter, system-ui, sans-serif',
            toolbar: { show: false },
            zoom: { enabled: false },
        },
        colors: ['#10b981'],
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.45,
                opacityTo: 0.05,
                stops: [0, 100],
            },
        },
        stroke: {
            curve: 'smooth',
            width: 3,
        },
        dataLabels: { enabled: false },
        grid: {
            borderColor: '#1e293b',
            strokeDashArray: 4,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } },
        },
        xaxis: {
            categories: data.timeline,
            labels: {
                style: { colors: '#64748b', fontSize: '12px' },
                formatter: (val: string) => {
                    const d = new Date(val);
                    return `${d.getDate()} Şub`;
                },
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            labels: {
                style: { colors: '#64748b', fontSize: '12px' },
                formatter: (val: number) => `₺${(val / 1000).toFixed(0)}K`,
            },
        },
        tooltip: {
            theme: 'dark',
            x: {
                formatter: (val: number) => {
                    const d = new Date(data.timeline[val - 1]);
                    return d.toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                    });
                },
            },
            y: {
                formatter: (val: number) => `₺${val.toLocaleString('tr-TR')}`,
            },
        },
        markers: {
            size: 5,
            colors: ['#0f172a'],
            strokeColors: '#10b981',
            strokeWidth: 2,
            hover: { size: 7 },
        },
        responsive: [
            {
                breakpoint: 480,
                options: {
                    chart: { height: 280 },
                },
            },
        ],
    };

    const series = [
        {
            name: 'Portföy Değeri',
            data: data.totalValues,
        },
    ];

    return (
        <Chart
            options={options}
            series={series}
            type="area"
            height={350}
        />
    );
};

export default PortfolioHistoryChart;
