import api from './api';
import type { OHLCData, AIInsight } from '../types';

/* ─────────────────────────────── Backend DTO shapes ─────────────────────────────── */

/** Matches `com.finance.shared.CandleDto` */
interface CandleDto {
    time: string; // ISO LocalDateTime e.g. "2026-01-20T00:00:00"
    open: number;
    high: number;
    low: number;
    close: number;
}

/* ─────────────────────────────── Market History ─────────────────────────────── */

/**
 * Fetch OHLC candlestick data from the backend.
 * Route: GET /api/market/candles/{symbol}?slot=D1
 *
 * The backend returns CandleDto[] with `time` as an ISO LocalDateTime string.
 * We normalise it to `YYYY-MM-DD` for lightweight-charts compatibility.
 */
export const getMarketHistory = async (symbol: string): Promise<OHLCData[]> => {
    const { data } = await api.get<CandleDto[]>(`/api/market/candles/${symbol}`, {
        params: { slot: 'D1' },
    });

    return data.map((candle) => ({
        time: candle.time.slice(0, 10), // "2026-01-20T00:00:00" → "2026-01-20"
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
    }));
};

/* ─────────────────────────────── AI Insight ─────────────────────────────── */

/**
 * Fetch AI-powered market insight for a symbol.
 * Route: GET /api/market/ai-insight/{symbol}
 */
export const getAIInsight = async (symbol: string): Promise<AIInsight> => {
    const { data } = await api.get<AIInsight>(`/api/market/ai-insight/${symbol}`);
    return data;
};

/* ─────────────────────────────── Instruments ─────────────────────────────── */

export interface MarketInstrument {
    symbol: string;
    name: string;
    type: 'CRYPTO' | 'FIAT' | 'COMMODITY' | 'INDEX';
    currentPrice: number;
    change24h: number;
}

/**
 * Fetch all available market instruments.
 * Route: GET /api/market/instruments
 */
export const getMarketInstruments = async (): Promise<MarketInstrument[]> => {
    const { data } = await api.get<MarketInstrument[]>('/api/market/instruments');
    return data;
};
