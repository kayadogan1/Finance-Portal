import { publicApi, privateApi } from './api';

/* ─── Backend DTO types ─── */

/** Matches `com.newsservice.dto.Source` */
export interface NewsSource {
    id: string;
    name: string;
}

/**
 * Matches `com.newsservice.dto.NewsInstrumentDto`
 *
 * AI classification tarafından tespit edilen enstrüman bilgisi.
 * Backend: NewsArticleInstrument entity → NewsInstrumentDto record
 */
export interface NewsInstrumentDto {
    symbol: string;       // "THYAO", "BTCUSDT", "XU100" vb.
    assetType: string;    // "STOCK", "CRYPTO", "INDEX", "BOND", "COMMODITY", "FOREX", "FUND", "VIOP"
    score: string | null; // Güven skoru (ör. "0.87")
    rankOrder: number;    // Sıralama (1 = en yüksek)
    primaryMatch: boolean;// Birincil eşleşme mi?
    matchSource: string;  // "LEXICON", "MODEL", "CANDIDATE"
}

/**
 * Matches `com.newsservice.dto.FilteredArticleDto`
 *
 * Backend fields:
 *   source           → Source(id, name)
 *   author           → String
 *   title            → String
 *   country          → String (enum name — "US", "UK", "TR")
 *   category         → String (enum name — "CRYPTO", "STOCK", "BOND", "COMMODITY", "FOREX", "FUND", "GENERAL")
 *   description      → String
 *   content          → String
 *   url              → String
 *   urlToImage       → String
 *   publishedAt      → String (ISO datetime)
 *   modelName        → String (AI model adı, ör. "classification-api")
 *   instrumentSymbol → String (AI birincil enstrüman sembolü)
 *   instruments      → List<NewsInstrumentDto> (sıralı, skorlu enstrüman listesi)
 */
export interface FilteredArticleDto {
    source: NewsSource;
    author?: string;
    title: string;
    country: string;
    category: string;
    description?: string;
    content?: string;
    url: string;
    urlToImage?: string;
    publishedAt: string;
    modelName?: string;
    instrumentSymbol?: string;
    instruments?: NewsInstrumentDto[];
}

/**
 * NewsTopic display labels (Turkish)
 *
 * Backend enum: GENERAL, CRYPTO, STOCK, BOND, COMMODITY, FOREX, FUND
 */
export const TOPIC_LABELS: Record<string, string> = {
    GENERAL: 'Genel Piyasa',
    CRYPTO: 'Kripto',
    STOCK: 'Hisse',
    INDEX: 'Endeks',
    BOND: 'Tahvil',
    VIOP: 'Tahvil/Bono',
    COMMODITY: 'Emtia',
    FOREX: 'Forex',
    FUND: 'Fon',
};

export const NEWS_CATEGORIES = [
    { key: '', label: 'Tümü', serverTopic: undefined },
    { key: 'STOCK', label: 'Hisse', serverTopic: 'STOCK' },
    { key: 'INDEX', label: 'Endeks', serverTopic: 'STOCK' },
    { key: 'FUND', label: 'Fon', serverTopic: 'FUND' },
    { key: 'BOND', label: 'Tahvil/Bono', serverTopic: 'BOND' },
    { key: 'COMMODITY', label: 'Emtia', serverTopic: 'COMMODITY' },
    { key: 'FOREX', label: 'Forex', serverTopic: 'FOREX' },
    { key: 'CRYPTO', label: 'Kripto', serverTopic: 'CRYPTO' },
    { key: 'GENERAL', label: 'Genel Piyasa', serverTopic: 'GENERAL' },
] as const;

/**
 * Asset type renk kodlaması — enstrüman tag'lerinde ve badge'lerde kullanılır.
 */
export const ASSET_TYPE_COLORS: Record<string, string> = {
    STOCK: '#3b82f6',     // blue
    INDEX: '#8b5cf6',     // violet
    CRYPTO: '#f97316',    // orange
    BOND: '#10b981',      // emerald
    COMMODITY: '#f59e0b', // amber
    FOREX: '#06b6d4',     // cyan
    FUND: '#14b8a6',      // teal
    VIOP: '#ec4899',      // pink
};

const normalize = (value?: string | null) => (value ?? '').trim().toUpperCase();

export const normalizeNewsCategory = (article: Pick<FilteredArticleDto, 'category' | 'title' | 'description' | 'instrumentSymbol' | 'instruments'>): string => {
    const instrumentType = normalize(article.instruments?.find(i => i.primaryMatch)?.assetType ?? article.instruments?.[0]?.assetType);
    const category = normalize(article.category);
    const text = normalize(`${article.title ?? ''} ${article.description ?? ''} ${article.instrumentSymbol ?? ''}`);
    const raw = instrumentType || category;

    if (raw === 'INDEX' || text.includes('ENDEKS') || text.includes('BIST 100') || text.includes('XU100')) return 'INDEX';
    if (raw === 'VIOP' || raw === 'BOND' || text.includes('TAHVIL') || text.includes('TAHVİL') || text.includes('BONO')) return 'BOND';
    if (raw === 'STOCK' || raw === 'HISSE' || raw === 'HİSSE' || category === 'STOCK') return 'STOCK';
    if (raw === 'FUND' || text.includes('FON')) return 'FUND';
    if (raw === 'COMMODITY' || text.includes('ALTIN') || text.includes('PETROL') || text.includes('EMTIA')) return 'COMMODITY';
    if (raw === 'FOREX' || raw === 'FIAT' || text.includes('DOLAR') || text.includes('EURO') || text.includes('KUR')) return 'FOREX';
    if (raw === 'CRYPTO' || text.includes('BITCOIN') || text.includes('KRIPTO') || text.includes('KRİPTO')) return 'CRYPTO';
    return 'GENERAL';
};

export const getNewsCategoryLabel = (category?: string): string => {
    return TOPIC_LABELS[normalize(category)] ?? category ?? 'Genel Piyasa';
};

const symbolVariants = (symbol?: string | null) => {
    const normalized = normalize(symbol);
    if (!normalized) return new Set<string>();
    return new Set([normalized, normalized.replace(/\.IS$/, ''), normalized.replace(/USDT$/, ''), normalized.replace(/USD$/, '')].filter(Boolean));
};

const textTokens = (value?: string | null) => {
    return new Set(
        normalize(value)
            .split(/[^A-Z0-9ĞÜŞİÖÇ]+/i)
            .filter(token => token.length >= 3),
    );
};

export const articleMatchesInstrument = (
    article: FilteredArticleDto,
    instrument: { symbol: string; name?: string; type?: string },
): boolean => {
    const variants = symbolVariants(instrument.symbol);
    if (variants.size === 0) return false;

    const directSymbols = [
        article.instrumentSymbol,
        ...(article.instruments ?? []).map(inst => inst.symbol),
    ];

    if (directSymbols.some(symbol => {
        const articleVariants = symbolVariants(symbol);
        return [...articleVariants].some(variant => variants.has(variant));
    })) {
        return true;
    }

    const bodyTokens = textTokens(`${article.title ?? ''} ${article.description ?? ''} ${article.content ?? ''}`);
    if ([...variants].some(variant => variant.length >= 3 && bodyTokens.has(variant))) {
        return true;
    }

    const usableNameTokens = [...textTokens(instrument.name)].filter(token => token.length >= 4 && !['ANONIM', 'ANONİM', 'SIRKETI', 'ŞIRKETI', 'SANAYI', 'SANAYİ', 'TICARET', 'TİCARET'].includes(token));
    return usableNameTokens.length > 0 && usableNameTokens.slice(0, 3).some(token => bodyTokens.has(token));
};

/* ─── API calls ─── */

/**
 * Fetch news articles (1-week window — server-side filter).
 * Route: GET /api/news?topic={topic}&country={country}
 *
 * Backend returns FilteredArticleDto[] — already limited to last 7 days.
 */
export const getNews = async (topic?: string, country?: string): Promise<FilteredArticleDto[]> => {
    const params: Record<string, string> = {};
    if (topic) params.topic = topic;
    if (country) params.country = country;

    const { data } = await publicApi.get<FilteredArticleDto[]>('/api/news', { params });
    return Array.isArray(data) ? data : [];
};

/**
 * Fetch available news topics from backend enum.
 * Route: GET /api/news/topics
 * Returns: string[] — e.g. ["GENERAL", "CRYPTO", "STOCK", "BOND", "COMMODITY", "FOREX", "FUND"]
 */
export const getTopics = async (): Promise<string[]> => {
    const { data } = await publicApi.get<string[]>('/api/news/topics');
    return Array.isArray(data) ? data : [];
};

/**
 * Trigger a refresh of news articles. Admin only.
 * Route: POST /api/news/refresh
 */
export const refreshNews = async (): Promise<void> => {
    await privateApi.post('/api/news/refresh');
};
