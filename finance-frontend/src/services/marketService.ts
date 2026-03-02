import { publicApi } from './api';
import type { OHLCData, AIInsight } from '../types';

/* ═══════════════════════════════════════════════════════════════════════
   BACKEND ENDPOINT MAP  (MarketController)
   ─────────────────────────────────────────────────────────────────────
   GET /api/market                             → Instrument[]
   GET /api/market/{symbol}                    → Instrument
   GET /api/market/candles/{symbol}?slot=&from= → CandleDto[]     (OHLC)
   GET /api/market/line/{symbol}?dateTime=      → LineChartDto[]   (close)
   GET /api/market/history/{symbol}?from=       → MarketData[]     (price)
   ═══════════════════════════════════════════════════════════════════════ */

/* ────────────────────── TimeSlot Enum (backend mirror) ──────────────── */

/**
 * Matches `com.finance.shared.TimeSlot` enum.
 * Used as the `slot` query parameter on the candles endpoint.
 */
export type TimeSlot = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1' | 'W1';

/**
 * Convert a JS Date to Spring-compatible LocalDateTime string.
 * Spring `@DateTimeFormat(iso = ISO.DATE_TIME)` with `LocalDateTime`
 * expects "2026-03-02T10:30:43", NOT "2026-03-02T10:30:43.000Z".
 * JavaScript's `toISOString()` appends 'Z' and milliseconds which
 * Spring rejects when binding to LocalDateTime.
 */
function toLocalDateTime(date: Date): string {
    return date.toISOString().replace('Z', '').split('.')[0];
}

/* ────────────────────── Backend DTO Shapes ──────────────────────────── */

/**
 * Matches `com.finance.shared.CandleDto`
 * record CandleDto(LocalDateTime time, BigDecimal open, high, low, close)
 */
interface CandleDto {
    time: string;   // ISO LocalDateTime  "2026-01-20T00:00:00"
    open: number;
    high: number;
    low: number;
    close: number;
}

/**
 * Matches `com.finance.shared.LineChartDto`
 * record LineChartDto(LocalDateTime dateTime, BigDecimal close)
 */
export interface LineChartDto {
    dateTime: string; // ISO LocalDateTime
    close: number;
}

/**
 * Matches `com.finance.models.Instrument` JPA entity
 */
export interface BackendInstrument {
    id: string;
    symbol: string;
    name: string;
    type: 'CRYPTO' | 'FIAT' | 'COMMODITY' | 'INDEX';
    currentPrice: number;
    baseCurrency: string;
    lastUpdateTime: string;
    active: boolean;
    historicalDataLoaded: boolean;
}

/**
 * Matches `com.finance.models.MarketData` JPA entity
 * Fields: id(UUID), instrument(Instrument), price(BigDecimal), timestamp(LocalDateTime)
 */
export interface MarketDataEntry {
    id: string;
    instrument: BackendInstrument;
    price: number;
    timestamp: string;
}

/** Frontend-enriched instrument with computed change24h */
export interface MarketInstrument extends BackendInstrument {
    change24h: number;
}

/* ═══════════════════════════════════════════════════════════════════════
   1. CANDLESTICK DATA  (for <CandlestickChart> ONLY)
   Endpoint: GET /api/market/candles/{symbol}?slot={TimeSlot}&from={ISO}
   Returns:  CandleDto[] → mapped to OHLCData[]
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Fetch OHLC candlestick data.
 * USE THIS for <CandlestickChart> components only — never for line/area charts.
 *
 * @param symbol  Instrument symbol (e.g. "BTCUSDT")
 * @param slot    TimeSlot enum value (default: "D1")
 * @param from    ISO DateTime string (optional — backend defaults to 24h ago)
 */
export const getCandleData = async (
    symbol: string,
    slot: TimeSlot = 'D1',
    from?: string,
): Promise<OHLCData[]> => {
    const { data } = await publicApi.get<CandleDto[]>(`/api/market/candles/${symbol}`, {
        params: { slot, ...(from && { from }) },
    });

    // Guard: backend returns 204 No Content → data is null
    return (data ?? []).map((c) => ({
        time: c.time.slice(0, 10),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
    }));
};

/**
 * @deprecated Use `getCandleData` instead. Kept for backward compat during migration.
 */
export const getMarketHistory = getCandleData;

/* ═══════════════════════════════════════════════════════════════════════
   2. LINE CHART DATA  (for <LineChart> / <AreaChart> / <ComparisonChart>)
   Endpoint: GET /api/market/line/{symbol}?dateTime={ISO}
   Returns:  LineChartDto[] = { dateTime, close }
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Fetch close-price line data for line/area charts.
 * USE THIS for any non-OHLC visualization (line, area, comparison).
 *
 * @param symbol    Instrument symbol
 * @param dateTime  ISO DateTime string — data returned from this point onward
 */
export const getLineData = async (
    symbol: string,
    dateTime?: string,
): Promise<LineChartDto[]> => {
    // Backend NPEs if dateTime is null (accesses dateTime.isAfter() without null check)
    // Always send a value — default to 30 days ago
    const dt = dateTime ?? toLocalDateTime(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    const { data } = await publicApi.get<LineChartDto[]>(`/api/market/line/${symbol}`, {
        params: { dateTime: dt },
    });

    // Guard: backend returns 204 No Content → data is null
    return (data ?? []).map((d) => ({
        dateTime: d.dateTime,
        close: Number(d.close),
    }));
};

/**
 * @deprecated Use `getLineData` instead.
 */
export const getLineChartData = getLineData;

/* ═══════════════════════════════════════════════════════════════════════
   3. RAW MARKET DATA  (for change24h computation, detailed analysis)
   Endpoint: GET /api/market/history/{symbol}?from={ISO}
   Returns:  MarketData[] = { id, instrument, price, timestamp }
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Fetch raw MarketData entries ordered by timestamp ASC.
 * Primary use: computing change24h by comparing oldest entry to currentPrice.
 */
export const getMarketDataHistory = async (
    symbol: string,
    from: string,
): Promise<MarketDataEntry[]> => {
    const { data } = await publicApi.get<MarketDataEntry[]>(`/api/market/history/${symbol}`, {
        params: { from },
    });
    // Guard: backend returns 204 No Content → data is null
    return data ?? [];
};

/* ═══════════════════════════════════════════════════════════════════════
   4. INSTRUMENTS
   Endpoint: GET /api/market → Instrument[]
   Enriched with real change24h from /history
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Fetch all instruments, then compute real change24h by fetching
 * each instrument's 24h history in parallel.
 */
export const getMarketInstruments = async (): Promise<MarketInstrument[]> => {
    const { data: instruments } = await publicApi.get<BackendInstrument[]>('/api/market');

    const from24h = toLocalDateTime(new Date(Date.now() - 24 * 60 * 60 * 1000));

    const historyResults = await Promise.allSettled(
        instruments.map((inst) =>
            publicApi
                .get<{ price: number; timestamp: string }[]>(
                    `/api/market/history/${inst.symbol}`,
                    { params: { from: from24h } },
                )
                .then((res) => ({ symbol: inst.symbol, data: res.data ?? [] }))
        ),
    );

    const oldPriceMap = new Map<string, number>();
    for (const result of historyResults) {
        if (result.status === 'fulfilled' && result.value.data?.length > 0) {
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
 * Fetch a single instrument by symbol.
 * Route: GET /api/market/{symbol}
 */
export const getInstrumentBySymbol = async (symbol: string): Promise<BackendInstrument> => {
    const { data } = await publicApi.get<BackendInstrument>(`/api/market/${symbol}`);
    return data;
};

/* ═══════════════════════════════════════════════════════════════════════
   5. AI INSIGHT
   Endpoint: GET /api/market/ai-insight/{symbol}
   ═══════════════════════════════════════════════════════════════════════ */

export const getAIInsight = async (symbol: string): Promise<AIInsight> => {
    const { data } = await publicApi.get<AIInsight>(`/api/market/ai-insight/${symbol}`);
    return data;
};
