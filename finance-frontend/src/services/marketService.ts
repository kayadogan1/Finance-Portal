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

/* ────────────────────── TimeSlot Enum ──────────────────────────────── */

export type TimeSlot = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1' | 'W1';

/* ────────────────────── Date Utilities ─────────────────────────────── */

/**
 * Convert a JS Date to Spring-compatible LocalDateTime string.
 * Spring expects "2026-03-02T10:30:43" — no trailing Z, no milliseconds.
 */
function toLocalDateTime(date: Date): string {
    return date.toISOString().replace('Z', '').split('.')[0];
}

/**
 * RULE 2 — MANDATORY DATE PARSING
 *
 * Java LocalDateTime strings can arrive with microseconds:
 *   "2026-02-20T11:41:27.080933"
 *
 * Chart libraries CANNOT consume these raw strings. We MUST convert
 * them at the SERVICE LAYER before any component receives the data.
 *
 * Lightweight Charts → UNIX timestamp in SECONDS
 * ApexCharts         → UNIX timestamp in MILLISECONDS
 */
function javaDateToUnixSeconds(isoString: string): number {
    // new Date() handles "2026-02-20T11:41:27.080933" correctly —
    // it truncates excess precision but parses the date fine.
    return Math.floor(new Date(isoString).getTime() / 1000);
}

function javaDateToUnixMs(isoString: string): number {
    return new Date(isoString).getTime();
}

/* ────────────────────── Backend DTO Shapes ─────────────────────────── */

/** Matches `com.finance.shared.CandleDto` */
interface CandleDto {
    time: string;   // Java LocalDateTime ISO — may have microseconds
    open: number;
    high: number;
    low: number;
    close: number;
}

/** Matches `com.finance.shared.LineChartDto` */
export interface LineChartDto {
    dateTime: string; // Java LocalDateTime ISO — may have microseconds
    close: number;
}

/** Matches `com.finance.models.Instrument` JPA entity */
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

/** Matches `com.finance.models.MarketData` JPA entity */
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

/** Parsed line chart point — ready for ApexCharts/Recharts */
export interface ParsedLinePoint {
    timestamp: number; // UNIX milliseconds — ApexCharts datetime axis
    label: string;     // Human-readable label for Recharts
    close: number;
}

/* ═══════════════════════════════════════════════════════════════════════
   1. CANDLESTICK DATA  →  <CandlestickChart> ONLY
   Endpoint: GET /api/market/candles/{symbol}?slot={slot}&from={ISO}
   Returns:  CandleDto[] →  OHLCData[] (time = UNIX SECONDS)
   ═══════════════════════════════════════════════════════════════════════ */

export const getCandleData = async (
    symbol: string,
    slot: TimeSlot = 'D1',
    from?: string,
): Promise<OHLCData[]> => {
    const { data } = await publicApi.get<CandleDto[]>(`/api/market/candles/${symbol}`, {
        params: { slot, ...(from && { from }) },
    });

    // RULE 3: Validate — backend returns 204 No Content → data is null
    if (!data || !Array.isArray(data) || data.length === 0) return [];

    // RULE 2: Convert Java LocalDateTime to UNIX seconds for Lightweight Charts
    return data.map((c) => ({
        time: javaDateToUnixSeconds(c.time),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
    }));
};

/** @deprecated Use `getCandleData`. Kept for backward compat. */
export const getMarketHistory = getCandleData;

/* ═══════════════════════════════════════════════════════════════════════
   2. LINE CHART DATA  →  <ComparisonChart> / <AreaChart> / <LineChart>
   Endpoint: GET /api/market/line/{symbol}?dateTime={ISO}
   Returns:  LineChartDto[] →  ParsedLinePoint[]
   ═══════════════════════════════════════════════════════════════════════ */

export const getLineData = async (
    symbol: string,
    dateTime?: string,
): Promise<ParsedLinePoint[]> => {
    // Backend NPEs if dateTime is null — always send a value
    const dt = dateTime ?? toLocalDateTime(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    const { data } = await publicApi.get<LineChartDto[]>(`/api/market/line/${symbol}`, {
        params: { dateTime: dt },
    });

    // RULE 3: Validate
    if (!data || !Array.isArray(data) || data.length === 0) return [];

    // RULE 2: Parse Java LocalDateTime to both UNIX ms and readable label
    return data.map((d) => {
        const dateObj = new Date(d.dateTime);
        return {
            timestamp: dateObj.getTime(),             // UNIX ms for ApexCharts
            label: dateObj.toLocaleDateString('tr-TR'), // "20.02.2026" for Recharts
            close: Number(d.close),
        };
    });
};

/** @deprecated Use `getLineData`. */
export const getLineChartData = getLineData;

/* ═══════════════════════════════════════════════════════════════════════
   3. RAW MARKET DATA  →  change24h computation
   Endpoint: GET /api/market/history/{symbol}?from={ISO}
   Returns:  MarketData[] = { id, instrument, price, timestamp }
   ═══════════════════════════════════════════════════════════════════════ */

export const getMarketDataHistory = async (
    symbol: string,
    from: string,
): Promise<MarketDataEntry[]> => {
    const { data } = await publicApi.get<MarketDataEntry[]>(`/api/market/history/${symbol}`, {
        params: { from },
    });
    return Array.isArray(data) ? data : [];
};

/* ═══════════════════════════════════════════════════════════════════════
   4. INSTRUMENTS  →  enriched with real change24h from /history
   Endpoint: GET /api/market → Instrument[]
   ═══════════════════════════════════════════════════════════════════════ */

export const getMarketInstruments = async (): Promise<MarketInstrument[]> => {
    const { data: instruments } = await publicApi.get<BackendInstrument[]>('/api/market');

    if (!Array.isArray(instruments) || instruments.length === 0) return [];

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
