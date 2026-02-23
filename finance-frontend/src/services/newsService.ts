import { publicApi, privateApi } from './api';

export interface FilteredArticleDto {
    sourceName?: string;
    author?: string;
    title: string;
    description?: string;
    url: string;
    urlToImage?: string;
    publishedAt: string;
    content?: string;
}

/**
 * Fetch news articles.
 * Route: GET /api/news
 */
export const getNews = async (topic?: string, country?: string): Promise<FilteredArticleDto[]> => {
    const params: Record<string, string> = {};
    if (topic) params.topic = topic;
    if (country) params.country = country;

    const { data } = await publicApi.get<FilteredArticleDto[]>('/api/news', { params });
    return data;
};

/**
 * Trigger a refresh of news articles. Admin only.
 * Route: POST /api/news/refresh
 */
export const refreshNews = async (): Promise<void> => {
    await privateApi.post('/api/news/refresh');
};
