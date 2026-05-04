import { useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, ExternalLink, Link as LinkIcon, Newspaper } from 'lucide-react';
import {
    ASSET_TYPE_COLORS,
    buildNewsDetailPath,
    getNews,
    getNewsCategoryLabel,
    resolveNewsImage,
    type FilteredArticleDto,
} from '../services/newsService';

type ArticleState = {
    article?: Partial<FilteredArticleDto> & {
        sourceName?: string;
    };
};

const formatDate = (value?: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('tr-TR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const NewsArticleDetailPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const state = location.state as ArticleState | null;
    const targetUrl = searchParams.get('url') ?? state?.article?.url ?? '';

    const { data: fallbackArticles } = useQuery({
        queryKey: ['news-detail', targetUrl],
        queryFn: () => getNews(),
        enabled: Boolean(targetUrl) && !state?.article,
        staleTime: 1000 * 60 * 3,
    });

    const article = useMemo(() => {
        if (state?.article) {
            return {
                ...state.article,
                source: state.article.source ?? (state.article.sourceName ? { id: '', name: state.article.sourceName } : undefined),
            } as FilteredArticleDto;
        }
        return (fallbackArticles ?? []).find(item => item.url === targetUrl) ?? null;
    }, [fallbackArticles, state?.article, targetUrl]);

    if (!article) {
        return (
            <div className="space-y-4">
                <button
                    onClick={() => navigate('/news')}
                    className="inline-flex items-center gap-2 text-[13px] font-medium text-primary hover:text-primary/80 transition-colors"
                >
                    <ArrowLeft size={14} />
                    Haberlere Dön
                </button>
                <div className="card-base py-10 text-center">
                    <Newspaper className="mx-auto mb-3 text-ghost" size={24} />
                    <p className="text-[14px] text-foreground font-medium">Haber detayı bulunamadı.</p>
                    <p className="text-meta mt-2">Bağlantı eski olabilir veya haber akıştan düşmüş olabilir.</p>
                </div>
            </div>
        );
    }

    const imageUrl = resolveNewsImage(article.urlToImage, article.source?.name, article.category);
    const instruments = article.instruments ?? [];
    const hasRealImage = Boolean(article.urlToImage && article.urlToImage.trim().length > 0);
    const summaryText = article.content && article.content.trim().length > 80
        ? article.content
        : article.description || 'Bu haber için kaynak beslemesinden daha uzun bir özet gelmiyor.';

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                    onClick={() => navigate('/news')}
                    className="inline-flex items-center gap-2 text-[13px] font-medium text-primary hover:text-primary/80 transition-colors"
                >
                    <ArrowLeft size={14} />
                    Haberlere Dön
                </button>
                <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-[13px] font-medium text-foreground hover:bg-white/5 transition-colors"
                >
                    Kaynağı Aç
                    <ExternalLink size={13} />
                </a>
            </div>

            <article className="space-y-6">
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded bg-primary/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                            {getNewsCategoryLabel(article.category)}
                        </span>
                        {article.source?.name && (
                            <span className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground">
                                <LinkIcon size={11} />
                                {article.source.name}
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                            <CalendarDays size={12} />
                            {formatDate(article.publishedAt)}
                        </span>
                    </div>

                    <h1 className="text-[28px] font-semibold tracking-[-0.3px] text-foreground leading-tight">
                        {article.title}
                    </h1>

                    {article.description && (
                        <p className="max-w-4xl text-[15px] leading-7 text-muted-foreground">
                            {article.description}
                        </p>
                    )}
                </div>

                {hasRealImage ? (
                    <div className="overflow-hidden rounded border border-border bg-card">
                        <img
                            src={imageUrl}
                            alt={article.title}
                            className="h-[220px] w-full object-cover md:h-[320px]"
                            onError={(event) => {
                                (event.target as HTMLImageElement).src = resolveNewsImage(undefined, article.source?.name, article.category);
                            }}
                        />
                    </div>
                ) : (
                    <div className="overflow-hidden rounded border border-border bg-card">
                        <img
                            src={imageUrl}
                            alt={article.title}
                            className="h-[160px] w-full object-cover md:h-[180px]"
                        />
                    </div>
                )}

                <div className="grid items-start gap-6 xl:grid-cols-[1.65fr,0.75fr]">
                    <div className="card-base self-start space-y-4">
                        <div>
                            <h2 className="text-[15px] font-semibold text-foreground">Haber Özeti</h2>
                            <p className="text-meta mt-1">Beslemeden gelen açıklama ve içerik alanları</p>
                        </div>

                        {summaryText ? (
                            <div className="space-y-4 text-[14px] leading-7 text-foreground/90">
                                <p>{summaryText}</p>
                            </div>
                        ) : (
                            <p className="text-meta">Bu haber için ek içerik metni bulunmuyor.</p>
                        )}
                    </div>

                    <aside className="space-y-4">
                        <div className="card-base space-y-3">
                            <div>
                                <h2 className="text-[15px] font-semibold text-foreground">Kaynakça</h2>
                                <p className="text-meta mt-1">Orijinal haber bağlantısı ve yayın bilgisi</p>
                            </div>
                            <div className="space-y-2 text-[13px]">
                                <div>
                                    <span className="text-meta block mb-1">Kaynak</span>
                                    <span className="text-foreground font-medium">{article.source?.name ?? 'Bilinmiyor'}</span>
                                </div>
                                <div>
                                    <span className="text-meta block mb-1">Bağlantı</span>
                                    <a
                                        href={article.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="break-all text-primary hover:text-primary/80 transition-colors"
                                    >
                                        {article.url}
                                    </a>
                                </div>
                            </div>
                        </div>

                        {instruments.length > 0 && (
                            <div className="card-base space-y-3">
                                <div>
                                    <h2 className="text-[15px] font-semibold text-foreground">İlişkili Enstrümanlar</h2>
                                    <p className="text-meta mt-1">Sınıflandırma servisinin öne çıkardığı enstrümanlar</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {instruments.map((instrument) => {
                                        const color = ASSET_TYPE_COLORS[instrument.assetType] || '#6366f1';
                                        return (
                                            <button
                                                key={`${instrument.symbol}-${instrument.rankOrder}`}
                                                onClick={() => navigate(`/instrument/${instrument.symbol}`)}
                                                className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[12px] font-medium transition-colors"
                                                style={{
                                                    color,
                                                    background: `${color}14`,
                                                    borderColor: `${color}2d`,
                                                }}
                                            >
                                                {instrument.symbol}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="card-base space-y-3">
                            <div>
                                <h2 className="text-[15px] font-semibold text-foreground">Paylaşılabilir Bağlantı</h2>
                                <p className="text-meta mt-1">Detay sayfasına aynı haberle geri dönmek için</p>
                            </div>
                            <code className="block break-all rounded bg-background px-3 py-2 text-[12px] text-muted-foreground">
                                {window.location.origin}{buildNewsDetailPath(article.url)}
                            </code>
                        </div>
                    </aside>
                </div>
            </article>
        </div>
    );
};

export default NewsArticleDetailPage;
