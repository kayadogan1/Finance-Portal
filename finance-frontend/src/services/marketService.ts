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

/** Frontend-enriched instrument with computed change24h */
export interface MarketInstrument extends BackendInstrument {
    change24h: number;
}

/**
 * Fetch all available market instruments, then compute real change24h
 * by fetching each instrument's 24h history from GET /api/market/history/{symbol}?from=...
 *
 * Route: GET /api/market  →  Instrument[]
 * Route: GET /api/market/history/{symbol}?from=  →  MarketData[] (price, timestamp)
 */
export const getMarketInstruments = async (): Promise<MarketInstrument[]> => {
    const { data: instruments } = await publicApi.get<BackendInstrument[]>('/api/market');

    // 24 hours ago in ISO format for the history query
    const from24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fire all history requests in parallel
    const historyResults = await Promise.allSettled(
        instruments.map((inst) =>
            publicApi
                .get<{ price: number; timestamp: string }[]>(
                    `/api/market/history/${inst.symbol}`,
                    { params: { from: from24h } },
                )
                .then((res) => ({ symbol: inst.symbol, data: res.data }))
        ),
    );

    // Build a map: symbol → oldest price from 24h history
    const oldPriceMap = new Map<string, number>();
    for (const result of historyResults) {
        if (result.status === 'fulfilled' && result.value.data.length > 0) {
            // Backend returns ordered by timestamp ASC → first entry is oldest
            oldPriceMap.set(result.value.symbol, Number(result.value.data[0].price));
        }
    }

    return instruments.map((inst) => {
        const current = Number(inst.currentPrice) || 0;
        const old = oldPriceMap.get(inst.symbol);
        const change24h = old && old !== 0
            ? Number((((current - old) / old) * 100).toFixed(2))
            : 0;

        return { ...inst, currentPrice: current, change24h };
    });
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

