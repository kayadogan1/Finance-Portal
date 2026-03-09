import { publicApi, privateApi } from './api';

/* ─── Backend DTO types ─── */

/** Matches `com.newsservice.dto.Source` */
export interface NewsSource {
    id: string;
    name: string;
}

/**
 * Matches `com.newsservice.dto.FilteredArticleDto`
 *
 * Backend fields:
 *   source       → Source(id, name)
 *   author       → String
 *   title        → String
 *   country      → String (enum name — "US", "UK", "TR")
 *   category     → String (enum name — "CRYPTO", "STOCK", etc.)
 *   description  → String
 *   content      → String
 *   url          → String
 *   urlToImage   → String
 *   publishedAt  → String (ISO datetime)
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
}

/** NewsTopic display labels (Turkish) */
export const TOPIC_LABELS: Record<string, string> = {
    TECHNOLOGY: 'Teknoloji',
    BUSINESS: 'İş Dünyası',
    FINANCE: 'Finans',
    ECONOMY: 'Ekonomi',
    POLITICS: 'Politika',
    HEALTH: 'Sağlık',
    SCIENCE: 'Bilim',
    SPORTS: 'Spor',
    ENTERTAINMENT: 'Eğlence',
    ENERGY: 'Enerji',
    DEFENSE: 'Savunma',
    AI: 'Yapay Zeka',
    CRYPTO: 'Kripto',
    STOCK: 'Borsa',
    BOND: 'Tahvil',
    COMMODITY: 'Emtia',
    FOREX: 'Döviz',
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
    return data ?? [];
};

/**
 * Fetch available news topics from backend enum.
 * Route: GET /api/news/topics
 * Returns: string[] — e.g. ["TECHNOLOGY", "BUSINESS", ...]
 */
export const getTopics = async (): Promise<string[]> => {
    const { data } = await publicApi.get<string[]>('/api/news/topics');
    return data ?? [];
};

/**
 * Trigger a refresh of news articles. Admin only.
 * Route: POST /api/news/refresh
 */
export const refreshNews = async (): Promise<void> => {
    await privateApi.post('/api/news/refresh');
};
