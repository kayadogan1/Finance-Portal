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

/**
 * Matches the backend `com.finance.models.Instrument` entity
 * returned by `GET /api/market`
 */
export interface BackendInstrument {
    id: string;
    symbol: string;
    name: string;
    type: 'CRYPTO' | 'FIAT' | 'COMMODITY' | 'INDEX';
    currentPrice: number;
    baseCurrency: string;
    lastUpdateTime: string;
    active: boolean;           // Jackson serializes `isActive` as `active`
    historicalDataLoaded: boolean;
}

/** Frontend-enriched instrument with mock change24h */
export interface MarketInstrument extends BackendInstrument {
    change24h: number; // TODO: Remove mock when backend adds this field
}

/**
 * Simple hash to generate a deterministic mock change value per symbol.
 * This ensures the same symbol always shows the same mock % on each render.
 */
function mockChange(symbol: string): number {
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
        hash = ((hash << 5) - hash) + symbol.charCodeAt(i);
        hash |= 0;
    }
    // Range: -8.0% to +8.0%, rounded to 2 decimals
    return Number(((hash % 1600) / 100 - 8).toFixed(2));
}

/**
 * Fetch all available market instruments.
 * Route: GET /api/market
 * Returns: Instrument[] (JPA entity, not DTO)
 */
export const getMarketInstruments = async (): Promise<MarketInstrument[]> => {
    const { data } = await publicApi.get<BackendInstrument[]>('/api/market');
    // Enrich with mock change24h until backend supports it
    return data.map((inst) => ({
        ...inst,
        currentPrice: Number(inst.currentPrice) || 0,
        change24h: mockChange(inst.symbol),
    }));
};

/**
 * Fetch a specific instrument by symbol.
 * Route: GET /api/market/{symbol}
 */
export const getInstrumentBySymbol = async (symbol: string): Promise<MarketInstrument> => {
    const { data } = await publicApi.get<MarketInstrument>(`/api/market/${symbol}`);
    return data;
};

/**
 * Matches `com.finance.shared.LineChartDto`
 * record LineChartDto(LocalDateTime dateTime, BigDecimal close)
 */
export interface LineChartDto {
    dateTime: string; // ISO LocalDateTime
    close: number;
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

/**
 * Matches `com.finance.models.MarketData` entity
 * Fields: id(UUID), instrument(Instrument), price(BigDecimal), timestamp(LocalDateTime)
 * Note: Jackson serializes the nested `instrument` object.
 */
export interface MarketDataEntry {
    id: string;
    instrument: BackendInstrument;
    price: number;
    timestamp: string;
}

/**
 * Fetch market data history after a specific time.
 * Route: GET /api/market/history/{symbol}?from={from}
 * Returns: MarketData[] ordered by timestamp ASC
 */
export const getMarketDataHistory = async (symbol: string, from: string): Promise<MarketDataEntry[]> => {
    const { data } = await publicApi.get<MarketDataEntry[]>(`/api/market/history/${symbol}`, {
        params: { from }
    });
    return data;
};

