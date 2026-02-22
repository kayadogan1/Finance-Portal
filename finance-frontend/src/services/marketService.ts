import api from './api';
import type { OHLCData, AIInsight } from '../types';

/**
 * Fetch OHLC market history for a given symbol from the backend.
 */
export const getMarketHistory = async (symbol: string): Promise<OHLCData[]> => {
    const { data } = await api.get<OHLCData[]>(`/api/market/history/${symbol}`);
    return data;
};

/**
 * Fetch AI-generated market insight for a given symbol from the backend.
 */
export const getAIInsight = async (symbol: string): Promise<AIInsight> => {
    const { data } = await api.get<AIInsight>(`/api/market/ai-insight/${symbol}`);
    return data;
};
