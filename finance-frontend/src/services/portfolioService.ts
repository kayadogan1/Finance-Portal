import api from './api';

export interface DistributionData {
    labels: string[];
    series: number[];
}

export interface HistoryData {
    timeline: string[];
    totalValues: number[];
}

/**
 * Fetch portfolio asset distribution from the backend.
 */
export const getDistribution = async (): Promise<DistributionData> => {
    const { data } = await api.get<DistributionData>('/api/portfolio/distribution');
    return data;
};

/**
 * Fetch portfolio value history from the backend.
 */
export const getHistory = async (): Promise<HistoryData> => {
    const { data } = await api.get<HistoryData>('/api/portfolio/history');
    return data;
};
