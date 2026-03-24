import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import {
    Bitcoin,
    DollarSign,
    Landmark,
    BarChart2,
    ArrowRight,
    Clock,
    ExternalLink,
} from 'lucide-react';
import { getMarketInstruments } from '../services/marketService';
import { getNews, type FilteredArticleDto } from '../services/newsService';

/* ─── Skeletons ─── */
const TickerSkeleton = () => (
    <div className="animate-pulse card-base">
        <div className="h-3 rounded w-16 mb-2 bg-white/5" />
        <div className="h-5 rounded w-28 mb-1 bg-white/5" />
        <div className="h-3 rounded w-14 bg-white/[0.03]" />
    </div>
);

const NewsSkeleton = () => (
    <div className="animate-pulse flex gap-3 py-3 border-b border-border/50">
        <div className="flex-1 space-y-2">
            <div className="h-3 rounded w-4/5 bg-white/5" />
            <div className="h-3 rounded w-3/5 bg-white/[0.03]" />
        </div>
    </div>
);

function timeAgo(dateStr: string): string {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now.getTime() - then.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Az önce';
    if (mins < 60) return `${mins} dk`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}s`;
    return `${Math.floor(hours / 24)}g`;
}

const EXPLORE_CARDS = [
    { to: '/bitcoin', label: 'Kripto', desc: 'BTC, ETH ve altcoin\'ler', icon: Bitcoin },
    { to: '/forex', label: 'Döviz', desc: 'EUR/USD, GBP/TRY...', icon: DollarSign },
    { to: '/bonds', label: 'Tahvil', desc: 'Makroekonomi haberleri', icon: Landmark },
    { to: '/indices', label: 'Endeksler', desc: 'S&P 500, BIST 100...', icon: BarChart2 },
] as const;

const DashboardPage = () => {
    const { data: instruments = [], isLoading: instsLoading } = useQuery({
        queryKey: ['market-instruments'],
        queryFn: getMarketInstruments,
    });

    const { data: news = [], isLoading: newsLoading } = useQuery({
        queryKey: ['news', 'all'],
        queryFn: () => getNews(),
        staleTime: 1000 * 60 * 3,
    });

    const topMovers = [...instruments]
        .sort((a, b) => Math.abs(b.change24h ?? 0) - Math.abs(a.change24h ?? 0))
        .slice(0, 4);

    const latestNews: FilteredArticleDto[] = Array.isArray(news) ? news.slice(0, 5) : [];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-[20px] font-semibold tracking-[-0.2px] text-foreground">Dashboard</h2>
                <p className="text-meta mt-1">Piyasa özeti, haberler ve hızlı navigasyon</p>
            </div>

            {/* ─── Top Movers ─── */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <span className="text-label">En Hareketli Varlıklar</span>
                    <NavLink to="/market" className="text-[12px] font-medium text-subtle hover:text-foreground flex items-center gap-1 transition-colors">
                        Tüm Piyasalar <ArrowRight size={11} />
                    </NavLink>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {instsLoading
                        ? Array.from({ length: 4 }).map((_, i) => <TickerSkeleton key={i} />)
                        : topMovers.map((inst) => {
                            const isPositive = (inst.change24h ?? 0) >= 0;
                            return (
                                <div
                                    key={inst.symbol}
                                    className="card-base"
                                    style={{ borderLeft: `3px solid hsl(var(${isPositive ? '--positive' : '--negative'}))` }}
                                >
                                    <div className="flex items-start justify-between">
                                        <span className="text-[15px] font-semibold text-foreground">{inst.symbol}</span>
                                        <span className={isPositive ? 'badge-positive' : 'badge-negative'}>
                                            {isPositive ? '+' : ''}{(inst.change24h ?? 0).toFixed(2)}%
                                        </span>
                                    </div>
                                    <p className="text-data mt-1.5">
                                        {inst.currentPrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) ?? '—'}
                                    </p>
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* ─── Explore + News ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Explore */}
                <div className="lg:col-span-1 space-y-3">
                    <span className="text-label">Keşfet</span>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 mt-2">
                        {EXPLORE_CARDS.map(({ to, label, desc, icon: Icon }) => (
                            <NavLink key={to} to={to} className="group card-base flex items-center gap-3 !p-3">
                                <Icon size={16} className="text-subtle group-hover:text-primary transition-colors shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[13px] font-medium text-foreground">{label}</p>
                                    <p className="text-[11px] text-subtle truncate">{desc}</p>
                                </div>
                                <ArrowRight size={12} className="ml-auto shrink-0 text-ghost opacity-0 group-hover:opacity-100 transition-opacity" />
                            </NavLink>
                        ))}
                    </div>
                </div>

                {/* News feed — flat list */}
                <div className="lg:col-span-2 card-base !p-0 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                        <span className="text-label">Son Haberler</span>
                        <NavLink to="/news" className="text-[12px] font-medium text-subtle hover:text-foreground flex items-center gap-1 transition-colors">
                            Tümünü Gör <ArrowRight size={11} />
                        </NavLink>
                    </div>
                    <div>
                        {newsLoading
                            ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="px-5"><NewsSkeleton /></div>)
                            : latestNews.map((article, idx) => (
                                <a
                                    key={`${article.url}-${idx}`}
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-start gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                                    style={{ borderBottom: idx < latestNews.length - 1 ? '1px solid hsl(var(--border) / 0.5)' : 'none' }}
                                >
                                    {article.urlToImage && (
                                        <img
                                            src={article.urlToImage}
                                            alt=""
                                            className="w-10 h-10 object-cover rounded-sm shrink-0 bg-card"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">{article.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            {article.source?.name && (
                                                <span className="text-[10px] font-medium uppercase tracking-wider text-primary">{article.source.name}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5">
                                        <span className="text-meta flex items-center gap-1"><Clock size={10} />{timeAgo(article.publishedAt)}</span>
                                        <ExternalLink size={10} className="text-ghost opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </a>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
