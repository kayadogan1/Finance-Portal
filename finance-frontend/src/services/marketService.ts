import { publicApi } from './api';
import type { OHLCData } from '../types';

/* ═══════════════════════════════════════════════════════════════════════
   BACKEND ENDPOINT MAP  (MarketController)
   ─────────────────────────────────────────────────────────────────────
   GET /api/market?page=&size=                  → Page<InstrumentDto>
   GET /api/market/{symbol}                     → Instrument
   GET /api/market/candles/{symbol}?slot=&from=  → CandleDto[]     (OHLC)
   GET /api/market/line/{symbol}?dateTime=       → LineChartDto[]   (close)
   GET /api/market/history/{symbol}?from=        → MarketData[]     (price)
   ═══════════════════════════════════════════════════════════════════════ */

/* ────────────────────── TimeSlot Enum ──────────────────────────────── */

export type TimeSlot = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1' | 'W1';

/* ────────────────────── Date Utilities ─────────────────────────────── */

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
    const match = isoString.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?/,
    );

    if (match) {
        const [, year, month, day, hour = '0', minute = '0', second = '0'] = match;
        return Math.floor(Date.UTC(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hour),
            Number(minute),
            Number(second),
        ) / 1000);
    }

    return Math.floor(new Date(isoString).getTime() / 1000);
}

/* ────────────────────── Backend DTO Shapes ─────────────────────────── */

/** Matches `com.finance.shared.CandleDto` */
interface CandleDto {
    time?: string;   // Java LocalDateTime ISO — may have microseconds
    timestamp?: string;
    date?: string;
    open: number | string;
    high: number | string;
    low: number | string;
    close: number | string;
}

/** Matches `com.finance.shared.LineChartDto` */
export interface LineChartDto {
    dateTime: string; // Java LocalDateTime ISO — may have microseconds
    close: number;
}

/**
 * Matches `com.finance.shared.InstrumentDto` (paginated endpoint).
 * Field name is `instrumentType` (not `type`).
 */
export type BackendInstrumentType = 'CRYPTO' | 'FIAT' | 'COMMODITY' | 'INDEX' | 'STOCK' | 'FOREX' | 'BOND' | 'FUND' | 'VIOP';

export interface InstrumentDto {
    symbol: string;
    name: string;
    instrumentType?: BackendInstrumentType;
    type?: BackendInstrumentType;
    currentPrice: number;
    change24h?: number;
    changePercent?: number;
    dailyChangePercent?: number;
    baseCurrency?: string;
    currency?: string;
    country?: string;
    exchange?: string;
    market?: string;
}

/** Matches `com.finance.models.Instrument` JPA entity (single-instrument endpoint) */
export interface BackendInstrument {
    id: string;
    symbol: string;
    name: string;
    type: 'CRYPTO' | 'FIAT' | 'COMMODITY' | 'INDEX' | 'STOCK' | 'FOREX' | 'BOND';
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
export interface MarketInstrument {
    symbol: string;
    name: string;
    type: string;
    currentPrice: number;
    hasPrice: boolean;
    change24h?: number;
    baseCurrency: string;
    country: 'TR' | 'US' | 'GLOBAL' | 'UNKNOWN';
    exchange: string;
    market: 'TR' | 'US' | 'GLOBAL' | 'UNKNOWN';
}

/** Spring Boot Page<T> response shape */
export interface PagedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;   // current page (0-indexed)
    size: number;
    first: boolean;
    last: boolean;
    empty: boolean;
}

/** Parsed line chart point — ready for ApexCharts/Recharts */
export interface ParsedLinePoint {
    timestamp: number; // UNIX milliseconds — ApexCharts datetime axis
    label: string;     // Human-readable label for Recharts
    close: number;
}

export interface HypotheticalReturnDto {
    symbol: string;
    name: string;
    instrumentType: BackendInstrumentType;
    instrumentCurrency: string;
    displayCurrency: string;
    purchaseDate: string;
    executedAt: string;
    quantity: number;
    purchasePrice: number;
    currentPrice: number;
    costValue: number;
    currentValue: number;
    profitLoss: number;
    profitLossPercent: number | null;
    fxRateToDisplayCurrency: number;
}

const parseOptionalNumber = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const INSTRUMENT_TYPES = new Set(['CRYPTO', 'FIAT', 'COMMODITY', 'INDEX', 'STOCK', 'FOREX', 'BOND', 'FUND', 'VIOP']);
const US_EXCHANGES = new Set(['NASDAQ', 'NYSE', 'AMEX', 'ARCA', 'CBOE']);
const TR_EXCHANGES = new Set(['BIST', 'BORSA_ISTANBUL', 'ISTANBUL', 'VIOP', 'TEFAS']);

const TR_SYMBOL_HINTS = new Set([
    'BIST100', 'BIST30', 'BIST50', 'BISTBANK', 'BISTSINAI',
    'XU030', 'XU050', 'XU100', 'XUSIN', 'XBANK', 'XGMYO',
    'AKBNK', 'ARCLK', 'ASELS', 'BIMAS', 'DOAS', 'EKGYO', 'ENKAI', 'EREGL',
    'FROTO', 'GARAN', 'GUBRF', 'HALKB', 'ISCTR', 'KCHOL', 'KOZAL', 'KRDMD',
    'MGROS', 'PETKM', 'PGSUS', 'SAHOL', 'SASA', 'SISE', 'TCELL', 'THYAO',
    'TOASO', 'TTKOM', 'TUPRS', 'VAKBN', 'YKBNK', 'ZOREN',
]);

const TR_NAME_HINTS = [
    'TURK', 'TURKIYE', 'TÜRK', 'TÜRKİYE', 'ANADOLU', 'YATIRIM', 'MENKUL',
    'SANAY', 'TICARET', 'TİCARET', 'GAYRIMENKUL', 'GAYRİMENKUL', 'BANKASI',
    'HOLDING A', 'HOLDİNG A', 'ORTAKLIGI', 'ORTAKLIĞI', 'A.O', 'A.S', 'A.Ş',
    'BIST 100', 'BIST100', 'BORSA ISTANBUL', 'BORSA İSTANBUL',
];

const normalizeString = (value?: string | null) => (value ?? '').trim().toUpperCase();

export const cleanInstrumentDisplayName = (name?: string | null, symbol?: string | null): string => {
    const raw = (name ?? '').trim();
    if (!raw) return symbol ?? '';
    if (!/[?�]/.test(raw)) return raw;

    return raw
        .replace(/�\?MSA/gi, 'ÇİMSA')
        .replace(/�\?MENTO/gi, 'ÇİMENTO')
        .replaceAll('�?', 'İ')
        .replaceAll('�', '')
        .replace(/SANAY\?/gi, 'SANAYİ')
        .replace(/T\?CARET/gi, 'TİCARET')
        .replace(/A\.\?\./gi, 'A.Ş.')
        .replace(/\?MENTO/gi, 'ÇİMENTO')
        .replace(/\?MSA/gi, 'ÇİMSA')
        .replace(/GEM\?/gi, 'GEMİ')
        .replace(/\?N\?AA/gi, 'İNŞA')
        .replace(/DEN\?Z/gi, 'DENİZ')
        .replace(/NAKL\?YAT/gi, 'NAKLİYAT')
        .replace(/BAKIM ONARIM/gi, 'BAKIM ONARIM')
        .replace(/T\?RK/gi, 'TÜRK')
        .replace(/T\?RKIYE/gi, 'TÜRKİYE')
        .replace(/\s+/g, ' ')
        .trim();
};

export const normalizeInstrumentType = (value?: string | null): BackendInstrumentType => {
    const type = normalizeString(value);
    if (type === 'STOCKS' || type === 'HISSE' || type === 'HİSSE') return 'STOCK';
    if (type === 'INDEXES' || type === 'INDICES' || type === 'ENDEKS') return 'INDEX';
    if (type === 'CURRENCY' || type === 'FX' || type === 'DOVIZ' || type === 'DÖVİZ') return 'FOREX';
    if (type === 'FUNDS' || type === 'FON') return 'FUND';
    if (type === 'BONDS' || type === 'TAHVIL' || type === 'TAHVİL') return 'BOND';
    return INSTRUMENT_TYPES.has(type) ? type as BackendInstrumentType : 'STOCK';
};

const looksLikeTurkishName = (name?: string) => {
    const normalized = normalizeString(cleanInstrumentDisplayName(name))
        .replaceAll('?', 'I')
        .replaceAll('�', 'I');
    return TR_NAME_HINTS.some((hint) => normalized.includes(hint));
};

const inferExchange = (inst: InstrumentDto): string => {
    const exchange = normalizeString(inst.exchange);
    if (exchange) return exchange;

    const rawSymbol = normalizeString(inst.symbol);
    const symbol = rawSymbol.replace(/\.IS$/, '');
    const type = normalizeInstrumentType(inst.instrumentType ?? inst.type);
    const name = normalizeString(cleanInstrumentDisplayName(inst.name, inst.symbol));

    if (
        rawSymbol.endsWith('.IS')
        || symbol.startsWith('XU')
        || TR_SYMBOL_HINTS.has(symbol)
        || name.includes('BIST')
        || looksLikeTurkishName(inst.name)
    ) {
        return type === 'FUND' ? 'TEFAS' : type === 'VIOP' ? 'VIOP' : 'BIST';
    }
    if (type === 'CRYPTO') return 'CRYPTO';
    if (type === 'FOREX' || type === 'FIAT') return 'FOREX';
    if (type === 'COMMODITY') return 'COMMODITY';
    return 'NASDAQ';
};

export const inferBaseCurrency = (inst: Partial<InstrumentDto>): string => {
    const explicit = normalizeString(inst.baseCurrency ?? inst.currency);

    const rawSymbol = normalizeString(inst.symbol);
    const symbol = rawSymbol.replace(/\.IS$/, '');
    const type = normalizeInstrumentType(inst.instrumentType ?? inst.type);
    const exchange = normalizeString(inst.exchange);
    const country = normalizeString(inst.country);
    const market = normalizeString(inst.market);
    const name = normalizeString(cleanInstrumentDisplayName(inst.name, inst.symbol));
    const isStrongTRInstrument =
        country === 'TR' ||
        market === 'TR' ||
        TR_EXCHANGES.has(exchange) ||
        rawSymbol.endsWith('.IS') ||
        symbol.startsWith('XU') ||
        TR_SYMBOL_HINTS.has(symbol) ||
        name.includes('BIST') ||
        looksLikeTurkishName(inst.name);

    if (type === 'CRYPTO') return 'USDT';
    if (type === 'FOREX' || type === 'FIAT') {
        if (symbol.endsWith('TRY')) return 'TRY';
        return symbol.slice(-3) || 'USD';
    }
    if (isStrongTRInstrument) {
        return 'TRY';
    }
    if (explicit) return explicit;
    if (type === 'COMMODITY') return 'USD';
    return 'USD';
};

export const inferMarketInfo = (inst: InstrumentDto) => {
    const exchange = inferExchange(inst);
    const currency = inferBaseCurrency({ ...inst, exchange });
    const country = normalizeString(inst.country);
    const market = normalizeString(inst.market);

    const isTR = currency === 'TRY' || country === 'TR' || market === 'TR' || TR_EXCHANGES.has(exchange);
    const isUS = currency === 'USD' && (country === 'US' || market === 'US' || US_EXCHANGES.has(exchange));

    if (normalizeInstrumentType(inst.instrumentType ?? inst.type) === 'CRYPTO') {
        return { baseCurrency: currency, country: 'GLOBAL' as const, exchange, market: 'GLOBAL' as const };
    }
    if (isTR) return { baseCurrency: currency, country: 'TR' as const, exchange, market: 'TR' as const };
    if (isUS || currency === 'USD') return { baseCurrency: currency, country: 'US' as const, exchange, market: 'US' as const };
    return { baseCurrency: currency, country: 'UNKNOWN' as const, exchange, market: 'UNKNOWN' as const };
};

export const normalizeInstrument = (inst: InstrumentDto): MarketInstrument => {
    const marketInfo = inferMarketInfo(inst);
    const change24h = parseOptionalNumber(inst.change24h ?? inst.changePercent ?? inst.dailyChangePercent);
    const currentPrice = parseOptionalNumber(inst.currentPrice);
    return {
        symbol: inst.symbol,
        name: cleanInstrumentDisplayName(inst.name, inst.symbol),
        type: normalizeInstrumentType(inst.instrumentType ?? inst.type),
        currentPrice: currentPrice ?? 0,
        hasPrice: currentPrice !== undefined,
        ...(change24h !== undefined ? { change24h } : {}),
        ...marketInfo,
    };
};

export const hasChange = (inst: Pick<MarketInstrument, 'change24h'>): inst is Pick<MarketInstrument, 'change24h'> & { change24h: number } => {
    return Number.isFinite(inst.change24h);
};

export const formatChangePercent = (change?: number): string => {
    if (!Number.isFinite(change)) return '—';
    return `${change! >= 0 ? '+' : ''}${change!.toFixed(2)}%`;
};

export const belongsToMarket = (inst: Pick<MarketInstrument, 'market' | 'country' | 'exchange' | 'baseCurrency' | 'type' | 'symbol'>, region: 'TR' | 'US'): boolean => {
    if (inst.type === 'CRYPTO') return true;
    if (inst.type === 'FOREX' || inst.type === 'FIAT' || inst.type === 'COMMODITY') return true;
    if (region === 'TR') {
        return inst.market === 'TR' || inst.country === 'TR' || inst.baseCurrency === 'TRY' || TR_EXCHANGES.has(normalizeString(inst.exchange));
    }
    return inst.market === 'US' || inst.country === 'US' || (inst.baseCurrency === 'USD' && inst.market !== 'TR');
};

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

    if (!data || !Array.isArray(data) || data.length === 0) return [];

    const normalized = data
        .map((c) => {
            const rawTime = c.time ?? c.timestamp ?? c.date;
            const time = rawTime ? javaDateToUnixSeconds(rawTime) : Number.NaN;
            const open = Number(c.open);
            const high = Number(c.high);
            const low = Number(c.low);
            const close = Number(c.close);
            return { time, open, high, low, close };
        })
        .filter((c) => {
            const values = [c.time, c.open, c.high, c.low, c.close];
            if (!values.every(Number.isFinite)) return false;
            if (c.high < Math.max(c.open, c.close, c.low)) return false;
            if (c.low > Math.min(c.open, c.close, c.high)) return false;
            return true;
        })
        .sort((a, b) => a.time - b.time);

    const deduped = new Map<number, OHLCData>();
    for (const candle of normalized) deduped.set(candle.time, candle);
    return [...deduped.values()];
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
    const { data } = await publicApi.get<LineChartDto[]>(`/api/market/line/${symbol}`, {
        params: dateTime ? { dateTime } : undefined,
    });

    // RULE 3: Validate
    if (!data || !Array.isArray(data) || data.length === 0) return [];

    // RULE 2: Parse Java LocalDateTime to both UNIX ms and readable label
    return data
        .map((d) => {
            const timestamp = javaDateToUnixSeconds(d.dateTime) * 1000;
            const close = Number(d.close);
            const dateObj = new Date(timestamp);
            return {
                timestamp,
                label: dateObj.toLocaleDateString('tr-TR'), // "20.02.2026" for Recharts
                close,
            };
        })
        .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.close))
        .sort((a, b) => a.timestamp - b.timestamp);
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
   4a. INSTRUMENTS (PAGINATED)
   Endpoint: GET /api/market?page={page}&size={size}
   Returns:  Page<InstrumentDto> → { content, totalPages, ... }
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Fetch a single page of instruments with change24h enrichment.
 * Backend returns Page<InstrumentDto>. The `instrumentType` field
 * is mapped to `type` for frontend consistency.
 */
export const getMarketInstrumentsPaged = async (
    page = 0,
    size = 10,
): Promise<PagedResponse<MarketInstrument>> => {
    const { data: pageData } = await publicApi.get<PagedResponse<InstrumentDto>>('/api/market', {
        params: { page, size },
    });

    if (!pageData || !pageData.content || pageData.content.length === 0) {
        return { content: [], totalElements: 0, totalPages: 0, number: 0, size, first: true, last: true, empty: true };
    }

    const enriched = pageData.content.map(normalizeInstrument);

    return { ...pageData, content: enriched };
};

export const searchMarketInstrumentsPaged = async ({
    q,
    type,
    page = 0,
    size = 12,
}: {
    q?: string;
    type?: BackendInstrumentType;
    page?: number;
    size?: number;
}): Promise<PagedResponse<MarketInstrument>> => {
    const { data: pageData } = await publicApi.get<PagedResponse<InstrumentDto>>('/api/market', {
        params: {
            page,
            size,
            ...(q?.trim() ? { q: q.trim() } : {}),
            ...(type ? { type } : {}),
        },
    });

    if (!pageData || !pageData.content || pageData.content.length === 0) {
        return { content: [], totalElements: 0, totalPages: 0, number: page, size, first: page === 0, last: true, empty: true };
    }

    return { ...pageData, content: pageData.content.map(normalizeInstrument) };
};

/* ═══════════════════════════════════════════════════════════════════════
   4b. ALL INSTRUMENTS (non-paginated fetch for Dashboard, categories)
   Fetches ALL pages sequentially and returns a flat MarketInstrument[].
   Used by Dashboard, category tabs, and comparison chart.
   ═══════════════════════════════════════════════════════════════════════ */

export const getMarketInstruments = async (): Promise<MarketInstrument[]> => {
    // Fetch first page to know total pages
    const firstPage = await getMarketInstrumentsPaged(0, 30);

    if (firstPage.totalPages <= 1) return firstPage.content;

    // Fetch remaining pages in parallel
    const remaining = await Promise.all(
        Array.from({ length: firstPage.totalPages - 1 }, (_, i) =>
            getMarketInstrumentsPaged(i + 1, 30)
        ),
    );

    return [firstPage, ...remaining].flatMap((p) => p.content);
};

export const getMarketInstrumentCatalog = async (): Promise<MarketInstrument[]> => {
    const firstPage = await getMarketInstrumentsPaged(0, 30);
    const maxPage = Math.min(firstPage.totalPages - 1, 100);
    if (maxPage <= 0) return firstPage.content;

    const pages: PagedResponse<MarketInstrument>[] = [firstPage];
    const pageNumbers = Array.from({ length: maxPage }, (_, i) => i + 1);
    const batchSize = 8;

    for (let i = 0; i < pageNumbers.length; i += batchSize) {
        const batch = pageNumbers.slice(i, i + batchSize);
        const results = await Promise.all(batch.map((page) => getMarketInstrumentsPaged(page, 30)));
        pages.push(...results);
    }

    const bySymbol = new Map<string, MarketInstrument>();
    for (const inst of pages.flatMap((p) => p.content)) {
        bySymbol.set(inst.symbol, inst);
    }
    return [...bySymbol.values()];
};

/**
 * Fetch a single instrument by symbol.
 * Route: GET /api/market/{symbol}
 */
export const getInstrumentBySymbol = async (symbol: string): Promise<BackendInstrument> => {
    const { data } = await publicApi.get<BackendInstrument>(`/api/market/${symbol}`);
    return {
        ...data,
        name: cleanInstrumentDisplayName(data.name, data.symbol),
    };
};

export const getHypotheticalReturn = async (
    symbol: string,
    purchaseDate: string,
    quantity = 1,
    displayCurrency?: string,
): Promise<HypotheticalReturnDto> => {
    const { data } = await publicApi.get<HypotheticalReturnDto>(`/api/market/hypothetical-return/${symbol}`, {
        params: {
            purchaseDate,
            quantity,
            ...(displayCurrency ? { displayCurrency } : {}),
        },
    });
    return data;
};
