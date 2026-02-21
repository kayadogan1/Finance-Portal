export interface DistributionData {
    labels: string[];
    series: number[];
}

export interface HistoryData {
    timeline: string[];
    totalValues: number[];
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getDistribution = async (): Promise<DistributionData> => {
    await delay(1000);
    return {
        labels: ['THYAO', 'ASELS', 'USD', 'NAKİT'],
        series: [45000, 30000, 15000, 10000],
    };
};

export const getHistory = async (): Promise<HistoryData> => {
    await delay(1000);
    return {
        timeline: ['2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19'],
        totalValues: [95000, 96500, 94000, 98000, 100000],
    };
};
