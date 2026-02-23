import { publicApi } from './api';
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
    const { data } = await publicApi.get<CandleDto[]>(`/api/market/candles/${symbol}`, {
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
    const { data } = await publicApi.get<AIInsight>(`/api/market/ai-insight/${symbol}`);
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
    const { data } = await publicApi.get<MarketInstrument[]>('/api/market');
    return data;
};

/**
 * Fetch a specific instrument by symbol.
 * Route: GET /api/market/{symbol}
 */
export const getInstrumentBySymbol = async (symbol: string): Promise<MarketInstrument> => {
    const { data } = await publicApi.get<MarketInstrument>(`/api/market/${symbol}`);
    return data;
};

export interface LineChartDto {
    time: string; // ISO LocalDateTime
    price: number;
}

/**
 * Fetch line chart data from a specific time.
 * Route: GET /api/market/line/{symbol}?dateTime={dateTime}
 */
export const getLineChartData = async (symbol: string, dateTime: string): Promise<LineChartDto[]> => {
    const { data } = await publicApi.get<LineChartDto[]>(`/api/market/line/${symbol}`, {
        params: { dateTime }
    });
    return data;
};

export interface MarketData {
    id?: string;
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    instrumentSymbol?: string;
}

/**
 * Fetch market data history after a specific time.
 * Route: GET /api/market/history/{symbol}?from={from}
 */
export const getMarketDataHistoryList = async (symbol: string, from: string): Promise<MarketData[]> => {
    const { data } = await publicApi.get<MarketData[]>(`/api/market/history/${symbol}`, {
        params: { from }
    });
    return data;
};
