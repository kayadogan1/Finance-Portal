import { useQuery } from '@tanstack/react-query';
import { Newspaper, AlertCircle } from 'lucide-react';
import { getNews } from '../../services/newsService';
import NewsCard from './NewsCard';

const CardSkeleton = () => (
    <div className="animate-pulse card-base !p-0 overflow-hidden">
        <div className="h-36 bg-white/[0.03]" />
        <div className="p-4 space-y-3">
            <div className="h-4 rounded w-5/6 bg-white/[0.05]" />
            <div className="h-3 rounded w-full bg-white/[0.03]" />
            <div className="h-3 rounded w-3/4 bg-white/[0.02]" />
        </div>
    </div>
);

interface NewsGridProps {
    topic?: string;
    country?: string;
    title?: string;
    maxItems?: number;
    columns?: 2 | 3 | 4;
}

export default function NewsGrid({ topic, country, title = 'Son Haberler', maxItems = 12, columns = 3 }: NewsGridProps) {
    const { data: articles, isLoading, isError } = useQuery({
        queryKey: ['news', topic ?? 'all', country ?? 'all'],
        queryFn: () => getNews(topic, country),
        staleTime: 1000 * 60 * 3,
    });

    const gridCols = { 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', 4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' }[columns];

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Newspaper size={14} className="text-primary" />
                <span className="text-[14px] font-medium text-foreground">{title}</span>
                {topic && <span className="ml-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-sm bg-primary/8 text-primary">{topic}</span>}
            </div>

            {isLoading && <div className={`grid ${gridCols} gap-3.5`}>{Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}</div>}

            {isError && (
                <div className="flex items-center gap-2 p-3.5 rounded bg-negative/[0.06] border border-negative/10">
                    <AlertCircle size={14} className="text-negative shrink-0" />
                    <p className="text-[13px] text-negative">Haberler yüklenirken bir hata oluştu.</p>
                </div>
            )}

            {articles && articles.length === 0 && !isLoading && (
                <div className="text-center py-10">
                    <Newspaper className="mx-auto mb-2 text-ghost" size={24} />
                    <p className="text-meta">Bu kategoride şu an haber bulunmuyor.</p>
                </div>
            )}

            {articles && articles.length > 0 && (
                <div className={`grid ${gridCols} gap-3.5`}>
                    {articles.slice(0, maxItems).map((a, i) => (
                        <NewsCard key={`${a.url}-${i}`} title={a.title} description={a.description} url={a.url} urlToImage={a.urlToImage} sourceName={a.source?.name} publishedAt={a.publishedAt} category={a.category} />
                    ))}
                </div>
            )}
        </div>
    );
}
