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
    GENERAL: 'Genel',
    CRYPTO: 'Kripto',
    STOCK: 'Borsa',
    BOND: 'Tahvil',
    COMMODITY: 'Emtia',
    FOREX: 'Döviz',
    FUND: 'Fon',
};

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
