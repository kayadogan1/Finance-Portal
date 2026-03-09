import { useQuery } from '@tanstack/react-query';
import { Newspaper, AlertCircle } from 'lucide-react';
import { getNews } from '../../services/newsService';
import NewsCard from './NewsCard';

/* ─── Skeleton ─── */
const CardSkeleton = () => (
    <div className="animate-pulse bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="h-40 bg-slate-700/40" />
        <div className="p-4 space-y-3">
            <div className="h-4 bg-slate-700/60 rounded w-5/6" />
            <div className="h-3 bg-slate-700/40 rounded w-full" />
            <div className="h-3 bg-slate-700/30 rounded w-3/4" />
            <div className="flex justify-between pt-1">
                <div className="h-3 bg-slate-700/30 rounded w-20" />
                <div className="h-3 bg-slate-700/20 rounded w-4" />
            </div>
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

export default function NewsGrid({
    topic,
    country,
    title = 'Son Haberler',
    maxItems = 12,
    columns = 3,
}: NewsGridProps) {
    const { data: articles, isLoading, isError } = useQuery({
        queryKey: ['news', topic ?? 'all', country ?? 'all'],
        queryFn: () => getNews(topic, country),
        staleTime: 1000 * 60 * 3,
    });

    const gridCols = {
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    }[columns];

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2">
                <Newspaper size={20} className="text-emerald-400" />
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                {topic && (
                    <span className="ml-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
                                     bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                        {topic}
                    </span>
                )}
            </div>

            {isLoading && (
                <div className={`grid ${gridCols} gap-4`}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <CardSkeleton key={i} />
                    ))}
                </div>
            )}

            {isError && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle size={20} className="text-red-400 shrink-0" />
                    <p className="text-sm text-red-300">
                        Haberler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.
                    </p>
                </div>
            )}

            {articles && articles.length === 0 && !isLoading && (
                <div className="text-center py-12 text-slate-500">
                    <Newspaper className="mx-auto mb-3 opacity-40" size={36} />
                    <p className="text-sm">Bu kategoride şu an haber bulunmuyor.</p>
                </div>
            )}

            {articles && articles.length > 0 && (
                <div className={`grid ${gridCols} gap-4`}>
                    {articles.slice(0, maxItems).map((article, idx) => (
                        <NewsCard
                            key={`${article.url}-${idx}`}
                            title={article.title}
                            description={article.description}
                            url={article.url}
                            urlToImage={article.urlToImage}
                            sourceName={article.source?.name}
                            publishedAt={article.publishedAt}
                            category={article.category}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
