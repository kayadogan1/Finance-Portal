import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import {
    ArrowRight,
    Clock,
    ExternalLink,
} from 'lucide-react';
import { getMarketInstruments, type MarketInstrument } from '../services/marketService';
import { getNews, type FilteredArticleDto } from '../services/newsService';

/* ─── Helpers ─── */

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

/** Find instrument by symbol prefix — flexible matching */
function findInstrument(instruments: MarketInstrument[], ...symbols: string[]): MarketInstrument | undefined {
    for (const sym of symbols) {
        const found = instruments.find(
            (i) => i.symbol.toUpperCase().includes(sym.toUpperCase())
        );
        if (found) return found;
    }
    return undefined;
}

/* ─── Skeletons ─── */

const OverviewSkeleton = () => (
    <div className="animate-pulse rounded-xl p-5" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="h-3 rounded w-12 mb-3" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="h-6 rounded w-24 mb-2" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="h-3 rounded w-16" style={{ background: 'rgba(255,255,255,0.03)' }} />
    </div>
);

const TickerSkeleton = () => (
    <div className="animate-pulse rounded-xl p-5" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="h-3 rounded w-16 mb-2" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="h-5 rounded w-28 mb-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="h-3 rounded w-14" style={{ background: 'rgba(255,255,255,0.03)' }} />
    </div>
);

const NewsSkeleton = () => (
    <div className="animate-pulse flex gap-3 py-4 px-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex-1 space-y-2">
            <div className="h-3 rounded w-4/5" style={{ background: 'rgba(255,255,255,0.05)' }} />
            <div className="h-3 rounded w-3/5" style={{ background: 'rgba(255,255,255,0.03)' }} />
        </div>
    </div>
);

/* ─── Mini Sparkline (CSS-only) ─── */

const MiniSparkline = ({ positive }: { positive: boolean }) => {
    const color = positive ? '#10b981' : '#ef4444';
    const bars = positive ? [30, 45, 35, 55, 50, 65, 60, 75] : [70, 60, 65, 50, 55, 40, 45, 30];
    return (
        <div style={{ display: 'flex', alignItems: 'end', gap: 2, height: 24 }}>
            {bars.map((h, i) => (
                <div
                    key={i}
                    style={{
                        width: 3,
                        height: `${h}%`,
                        background: color,
                        opacity: 0.3 + (i / bars.length) * 0.7,
                        borderRadius: 1,
                    }}
                />
            ))}
        </div>
    );
};

/* ─── Mover Row Component ─── */

const MoverRow = ({ inst, rank }: { inst: MarketInstrument; rank: number }) => {
    const isPositive = (inst.change24h ?? 0) >= 0;
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                background: '#111118',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'all 0.2s',
            }}
            className="hover:translate-y-[-1px]"
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', width: 18, textAlign: 'center' }}>
                {rank}
            </span>
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: isPositive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    fontSize: 12,
                    fontWeight: 700,
                    color: isPositive ? '#10b981' : '#ef4444',
                    flexShrink: 0,
                }}
            >
                {inst.symbol.slice(0, 3)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{inst.symbol}</div>
                <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {inst.name}
                </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>
                    {(inst.currentPrice ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>
            <span
                style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 6,
                    fontVariantNumeric: 'tabular-nums',
                    background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: isPositive ? '#10b981' : '#ef4444',
                    flexShrink: 0,
                }}
            >
                {isPositive ? '+' : ''}{(inst.change24h ?? 0).toFixed(2)}%
            </span>
        </div>
    );
};

/* ═══════════════════════════════════════════
   Dashboard Page
   ═══════════════════════════════════════════ */

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

    /* ─── Derived data ─── */

    // Market overview — specific assets
    const overviewAssets = [
        findInstrument(instruments, 'BTC', 'BITCOIN'),
        findInstrument(instruments, 'SPX', 'SP500', 'BIST', 'XU100'),
        findInstrument(instruments, 'GOLD', 'XAU', 'ALTIN'),
        findInstrument(instruments, 'EURUSD', 'EUR'),
    ].filter(Boolean) as MarketInstrument[];

    // Top movers by absolute change
    const topMovers = [...instruments]
        .sort((a, b) => Math.abs(b.change24h ?? 0) - Math.abs(a.change24h ?? 0))
        .slice(0, 4);

    // Gainers and losers
    const gainers = [...instruments]
        .filter((i) => (i.change24h ?? 0) > 0)
        .sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0))
        .slice(0, 3);

    const losers = [...instruments]
        .filter((i) => (i.change24h ?? 0) < 0)
        .sort((a, b) => (a.change24h ?? 0) - (b.change24h ?? 0))
        .slice(0, 3);

    const latestNews: FilteredArticleDto[] = Array.isArray(news) ? news.slice(0, 5) : [];

    /* ─── SOURCE badge colors ─── */
    const sourceBadgeColor = (name: string): string => {
        const colors: Record<string, string> = {
            Bloomberg: '#f97316',
            Reuters: '#3b82f6',
            CNBC: '#10b981',
            CoinDesk: '#8b5cf6',
        };
        return colors[name] || '#6366f1';
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px', color: 'hsl(var(--foreground))' }}>
                    Genel Bakış
                </h2>
                <p className="text-meta mt-1">Piyasa özeti ve güncel gelişmeler</p>
            </div>

            {/* ─── Market Overview Strip ─── */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <span className="text-label">Piyasa Özeti</span>
                    <NavLink to="/market" className="text-[12px] font-medium text-subtle hover:text-foreground flex items-center gap-1 transition-colors">
                        Tüm Piyasalar <ArrowRight size={11} />
                    </NavLink>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {instsLoading
                        ? Array.from({ length: 4 }).map((_, i) => <OverviewSkeleton key={i} />)
                        : overviewAssets.map((inst) => {
                            const isPositive = (inst.change24h ?? 0) >= 0;
                            return (
                                <div
                                    key={inst.symbol}
                                    style={{
                                        background: '#111118',
                                        borderRadius: 12,
                                        padding: '20px',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
                                        transition: 'all 0.2s',
                                        cursor: 'default',
                                    }}
                                    className="hover:translate-y-[-2px]"
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px ${isPositive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.06)';
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            {inst.symbol}
                                        </span>
                                        <MiniSparkline positive={isPositive} />
                                    </div>
                                    <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
                                        {(inst.currentPrice ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: isPositive ? '#10b981' : '#ef4444',
                                                fontVariantNumeric: 'tabular-nums',
                                            }}
                                        >
                                            {isPositive ? '+' : ''}{(inst.change24h ?? 0).toFixed(2)}%
                                        </span>
                                        <span style={{ fontSize: 11, color: '#475569' }}>24s</span>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* ─── Top Movers ─── */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <span className="text-label">En Hareketli Varlıklar</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {instsLoading
                        ? Array.from({ length: 4 }).map((_, i) => <TickerSkeleton key={i} />)
                        : topMovers.map((inst) => {
                            const isPositive = (inst.change24h ?? 0) >= 0;
                            return (
                                <div
                                    key={inst.symbol}
                                    style={{
                                        background: '#111118',
                                        borderRadius: 12,
                                        padding: '20px',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        borderLeft: `3px solid ${isPositive ? '#10b981' : '#ef4444'}`,
                                        boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
                                        transition: 'all 0.2s',
                                    }}
                                    className="hover:translate-y-[-2px]"
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.06)';
                                    }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{inst.symbol}</span>
                                            <p style={{ fontSize: 11, color: '#64748b', marginTop: 2, maxWidth: 100, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {inst.name}
                                            </p>
                                        </div>
                                        <span
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                padding: '3px 10px',
                                                borderRadius: 6,
                                                fontVariantNumeric: 'tabular-nums',
                                                background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                color: isPositive ? '#10b981' : '#ef4444',
                                            }}
                                        >
                                            {isPositive ? '+' : ''}{(inst.change24h ?? 0).toFixed(2)}%
                                        </span>
                                    </div>
                                    <p style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums', marginTop: 12, letterSpacing: '-0.3px' }}>
                                        {(inst.currentPrice ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* ─── Gainers & Losers ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Gainers */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-label" style={{ color: '#10b981' }}>En Çok Artanlar</span>
                    </div>
                    <div className="space-y-2">
                        {instsLoading
                            ? Array.from({ length: 3 }).map((_, i) => <TickerSkeleton key={i} />)
                            : gainers.map((inst, idx) => (
                                <MoverRow key={inst.symbol} inst={inst} rank={idx + 1} />
                            ))}
                        {!instsLoading && gainers.length === 0 && (
                            <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: 24 }}>Veri bulunamadı</p>
                        )}
                    </div>
                </div>

                {/* Losers */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-label" style={{ color: '#ef4444' }}>En Çok Düşenler</span>
                    </div>
                    <div className="space-y-2">
                        {instsLoading
                            ? Array.from({ length: 3 }).map((_, i) => <TickerSkeleton key={i} />)
                            : losers.map((inst, idx) => (
                                <MoverRow key={inst.symbol} inst={inst} rank={idx + 1} />
                            ))}
                        {!instsLoading && losers.length === 0 && (
                            <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: 24 }}>Veri bulunamadı</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── News Feed ─── */}
            <div
                style={{
                    background: '#111118',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                }}
            >
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-label">Son Haberler</span>
                    <NavLink to="/news" className="text-[12px] font-medium text-subtle hover:text-foreground flex items-center gap-1 transition-colors">
                        Tümünü Gör <ArrowRight size={11} />
                    </NavLink>
                </div>
                <div>
                    {newsLoading
                        ? Array.from({ length: 5 }).map((_, i) => <NewsSkeleton key={i} />)
                        : latestNews.map((article, idx) => (
                            <a
                                key={`${article.url}-${idx}`}
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-start gap-3 px-5 py-4 transition-all"
                                style={{
                                    borderBottom: idx < latestNews.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                {article.urlToImage && (
                                    <img
                                        src={article.urlToImage}
                                        alt=""
                                        className="w-12 h-12 object-cover rounded-lg shrink-0"
                                        style={{ background: '#0a0a0f' }}
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <h4 style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.5 }} className="line-clamp-2">
                                        {article.title}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        {article.source?.name && (
                                            <span
                                                style={{
                                                    fontSize: 10,
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: 0.5,
                                                    padding: '2px 8px',
                                                    borderRadius: 4,
                                                    background: `${sourceBadgeColor(article.source.name)}15`,
                                                    color: sourceBadgeColor(article.source.name),
                                                }}
                                            >
                                                {article.source.name}
                                            </span>
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
    );
};

export default DashboardPage;
