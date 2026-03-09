import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    TrendingUp,
    TrendingDown,
    Bitcoin,
    DollarSign,
    Landmark,
    BarChart2,
    ArrowRight,
    Newspaper,
    ExternalLink,
    Clock,
} from 'lucide-react';
import { getMarketInstruments } from '../services/marketService';
import { getNews, type FilteredArticleDto } from '../services/newsService';

/* ─── Skeleton ─── */
const TickerSkeleton = () => (
    <div className="animate-pulse bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <div className="h-3 bg-slate-700/60 rounded w-16 mb-2" />
        <div className="h-6 bg-slate-700/40 rounded w-28 mb-1" />
        <div className="h-3 bg-slate-700/30 rounded w-14" />
    </div>
);

const NewsSkeleton = () => (
    <div className="animate-pulse flex gap-4 p-4 border-b border-slate-700/30 last:border-0">
        <div className="w-20 h-14 bg-slate-700/40 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
            <div className="h-3 bg-slate-700/60 rounded w-4/5" />
            <div className="h-3 bg-slate-700/40 rounded w-3/5" />
            <div className="h-2 bg-slate-700/30 rounded w-20" />
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
    const days = Math.floor(hours / 24);
    return `${days}g`;
}

/* ─── Explore cards ─── */
const EXPLORE_CARDS = [
    { to: '/bitcoin', label: 'Kripto', desc: 'BTC, ETH ve altcoin\'ler', icon: Bitcoin, color: 'orange' },
    { to: '/forex', label: 'Döviz', desc: 'EUR/USD, GBP/TRY...', icon: DollarSign, color: 'blue' },
    { to: '/bonds', label: 'Tahvil', desc: 'Makroekonomi haberleri', icon: Landmark, color: 'amber' },
    { to: '/indices', label: 'Endeksler', desc: 'S&P 500, BIST 100...', icon: BarChart2, color: 'violet' },
] as const;

const colorMap: Record<string, { bg: string; border: string; text: string; shadow: string }> = {
    orange: { bg: 'from-orange-600/10 to-orange-800/10', border: 'border-orange-500/20', text: 'text-orange-400', shadow: 'shadow-orange-500/5' },
    blue: { bg: 'from-blue-600/10 to-blue-800/10', border: 'border-blue-500/20', text: 'text-blue-400', shadow: 'shadow-blue-500/5' },
    amber: { bg: 'from-amber-600/10 to-amber-800/10', border: 'border-amber-500/20', text: 'text-amber-400', shadow: 'shadow-amber-500/5' },
    violet: { bg: 'from-violet-600/10 to-violet-800/10', border: 'border-violet-500/20', text: 'text-violet-400', shadow: 'shadow-violet-500/5' },
};

const DashboardPage = () => {
    // Concurrent fetching
    const { data: instruments = [], isLoading: instsLoading } = useQuery({
        queryKey: ['market-instruments'],
        queryFn: getMarketInstruments,
    });

    const { data: news = [], isLoading: newsLoading } = useQuery({
        queryKey: ['news', 'all'],
        queryFn: () => getNews(),
        staleTime: 1000 * 60 * 3,
    });

    // Top movers: sort by absolute change
    const topMovers = [...instruments]
        .sort((a, b) => Math.abs(b.change24h ?? 0) - Math.abs(a.change24h ?? 0))
        .slice(0, 4);

    const latestNews: FilteredArticleDto[] = news.slice(0, 5);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <LayoutDashboard className="text-emerald-400" size={28} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Dashboard</h2>
                    <p className="text-slate-400 text-sm">Piyasa özeti, haberler ve hızlı navigasyon</p>
                </div>
            </div>

            {/* Top Movers */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">En Hareketli Varlıklar</h3>
                    <NavLink to="/market" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                        Tüm Piyasalar <ArrowRight size={12} />
                    </NavLink>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {instsLoading
                        ? Array.from({ length: 4 }).map((_, i) => <TickerSkeleton key={i} />)
                        : topMovers.map((inst) => {
                            const isPositive = (inst.change24h ?? 0) >= 0;
                            return (
                                <div key={inst.symbol} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                                    <p className="text-xs text-slate-400 font-medium mb-1">{inst.symbol}</p>
                                    <p className="text-lg font-bold text-white">
                                        {inst.currentPrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) ?? '—'}
                                    </p>
                                    <span className={`flex items-center gap-1 text-xs font-medium mt-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                        {isPositive ? '+' : ''}{(inst.change24h ?? 0).toFixed(2)}%
                                    </span>
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* Explore + News grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Explore cards */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-lg font-semibold text-white">Keşfet</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                        {EXPLORE_CARDS.map(({ to, label, desc, icon: Icon, color }) => {
                            const c = colorMap[color];
                            return (
                                <NavLink
                                    key={to}
                                    to={to}
                                    className={`group bg-gradient-to-br ${c.bg} border ${c.border} rounded-xl p-4
                                                hover:shadow-lg ${c.shadow} transition-all hover:-translate-y-0.5`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon size={22} className={c.text} />
                                        <div>
                                            <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                                                {label}
                                            </p>
                                            <p className="text-[11px] text-slate-400">{desc}</p>
                                        </div>
                                        <ArrowRight size={14} className="ml-auto text-slate-600 group-hover:text-emerald-400 transition-colors" />
                                    </div>
                                </NavLink>
                            );
                        })}
                    </div>
                </div>

                {/* Latest news feed */}
                <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur border border-slate-700/60 rounded-2xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
                        <div className="flex items-center gap-2">
                            <Newspaper size={18} className="text-emerald-400" />
                            <h3 className="text-base font-semibold text-white">Son Haberler</h3>
                        </div>
                        <NavLink to="/news" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                            Tümünü Gör <ArrowRight size={12} />
                        </NavLink>
                    </div>

                    <div className="divide-y divide-slate-700/30">
                        {newsLoading
                            ? Array.from({ length: 5 }).map((_, i) => <NewsSkeleton key={i} />)
                            : latestNews.map((article, idx) => (
                                <a
                                    key={`${article.url}-${idx}`}
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex gap-4 p-4 hover:bg-slate-700/30 transition-colors"
                                >
                                    {article.urlToImage && (
                                        <img
                                            src={article.urlToImage}
                                            alt=""
                                            className="w-20 h-14 object-cover rounded-lg shrink-0 bg-slate-700"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-white leading-snug line-clamp-2 group-hover:text-emerald-400 transition-colors">
                                            {article.title}
                                        </h4>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            {article.source?.name && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                                                    {article.source.name}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                                <Clock size={10} />
                                                {timeAgo(article.publishedAt)}
                                            </span>
                                            <ExternalLink size={10} className="text-slate-600 ml-auto shrink-0" />
                                        </div>
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
