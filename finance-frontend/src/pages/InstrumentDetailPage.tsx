import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft,
    Star,
    TrendingUp,
    TrendingDown,
    Activity,
    Newspaper,
    ExternalLink,
    RefreshCw,
    Clock,
} from 'lucide-react';
import CandlestickChart from '../components/market/CandlestickChart';
import TradeWidget from '../components/trade/TradeWidget';
import { getMarketInstruments, type MarketInstrument } from '../services/marketService';
import { getNews, TOPIC_LABELS, ASSET_TYPE_COLORS, type FilteredArticleDto } from '../services/newsService';
import { formatMarketPrice } from '../utils/currency';
import { useFavorites } from '../hooks/useFavorites';
import { getSourceColor } from '../components/news/SourceAvatar';

/* ─── Instrument type → news topic mapping ─── */
const typeToNewsTopic: Record<string, string> = {
    CRYPTO: 'CRYPTO',
    STOCK: 'STOCK',
    BOND: 'BOND',
    COMMODITY: 'COMMODITY',
    FIAT: 'FOREX',
    FOREX: 'FOREX',
    INDEX: 'STOCK',
};

/* ─── Skeletons ─── */
const HeaderSkeleton = () => (
    <div className="animate-pulse space-y-3">
        <div className="h-4 w-24 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="h-8 w-48 rounded" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="h-5 w-32 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
    </div>
);

/* ─── Stat Pill ─── */
const StatPill = ({ label, value, highlight }: { label: string; value: string; highlight?: string }) => (
    <div style={{
        background: '#111118',
        borderRadius: 10,
        padding: '12px 18px',
        border: '1px solid rgba(255,255,255,0.06)',
        minWidth: 110,
    }}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
            {label}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: highlight ?? '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>
            {value}
        </div>
    </div>
);

/* ─── timeAgo helper ─── */
function timeAgo(dateStr: string): string {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now.getTime() - then.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Az önce';
    if (mins < 60) return `${mins} dk önce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} gün önce`;
    return then.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

/* ════════════════════════════════════════
   Instrument Detail Page
   ════════════════════════════════════════ */

const InstrumentDetailPage = () => {
    const { symbol } = useParams<{ symbol: string }>();
    const navigate = useNavigate();
    const { isFavorite, toggleFavorite } = useFavorites();

    /* Use cached instruments — same queryKey as Dashboard/MarketPage */
    const { data: allInstruments = [], isLoading: loading } = useQuery({
        queryKey: ['market-instruments'],
        queryFn: getMarketInstruments,
        staleTime: 1000 * 60 * 5,
    });

    const instrument: MarketInstrument | null = useMemo(() => {
        return allInstruments.find(i => i.symbol === symbol) ?? null;
    }, [allInstruments, symbol]);

    /* News topic from instrument type */
    const newsTopic = instrument ? typeToNewsTopic[instrument.type] ?? undefined : undefined;

    /* Fetch all news (by topic) and filter by instrument symbol on frontend */
    const { data: allNews = [], isLoading: newsLoading } = useQuery({
        queryKey: ['news', newsTopic ?? 'all', 'all'],
        queryFn: () => getNews(newsTopic),
        staleTime: 1000 * 60 * 3,
        enabled: !!symbol,
    });

    /* Filter news: articles that mention this instrument symbol in their instruments list */
    const relatedNews = useMemo(() => {
        if (!symbol || allNews.length === 0) return [];

        /* Primary: articles that have this symbol in their AI-detected instruments */
        const byInstrument = allNews.filter(a =>
            a.instrumentSymbol === symbol ||
            (a.instruments && a.instruments.some(inst => inst.symbol === symbol))
        );

        /* If we have enough by direct match, use those */
        if (byInstrument.length >= 3) return byInstrument.slice(0, 9);

        /* Fallback: merge with topic-based news, deduplicate */
        const seen = new Set(byInstrument.map(a => a.url));
        const topicFallback = allNews
            .filter(a => !seen.has(a.url))
            .slice(0, 9 - byInstrument.length);

        return [...byInstrument, ...topicFallback];
    }, [allNews, symbol]);

    if (!symbol) {
        navigate('/market');
        return null;
    }

    const isPositive = (instrument?.change24h ?? 0) >= 0;
    const changeColor = isPositive ? '#10b981' : '#ef4444';
    const ChangIcon = isPositive ? TrendingUp : TrendingDown;
    const fav = isFavorite(symbol);

    return (
        <div className="space-y-6 pb-10">

            {/* ─── Breadcrumb & Back ─── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#64748b',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px 10px 6px 6px',
                        borderRadius: 8,
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'none'; }}
                >
                    <ArrowLeft size={15} /> Geri
                </button>
                <span style={{ color: '#334155', fontSize: 13 }}>/</span>
                <span style={{ fontSize: 13, color: '#64748b' }}>Piyasalar</span>
                <span style={{ color: '#334155', fontSize: 13 }}>/</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{symbol}</span>
            </div>

            {/* ─── Instrument Header ─── */}
            <div style={{
                background: '#111118',
                borderRadius: 16,
                padding: '28px 32px',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 4px 32px rgba(0,0,0,0.3)`,
            }}>
                {loading ? <HeaderSkeleton /> : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
                        {/* Left: Name + Price */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                {/* Symbol Badge */}
                                <div style={{
                                    width: 48, height: 48, borderRadius: 12,
                                    background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 13, fontWeight: 800, color: changeColor,
                                    flexShrink: 0,
                                }}>
                                    {symbol.slice(0, 3)}
                                </div>

                                <div>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px' }}>
                                        {symbol}
                                    </div>
                                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 1 }}>
                                        {instrument?.name ?? '—'}
                                    </div>
                                </div>

                                {/* Favorite star */}
                                <button
                                    onClick={() => toggleFavorite(symbol)}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        padding: '6px', borderRadius: 8,
                                        transition: 'all 0.15s',
                                    }}
                                    title={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                                >
                                    <Star
                                        size={18}
                                        fill={fav ? '#eab308' : 'none'}
                                        color={fav ? '#eab308' : '#475569'}
                                        style={{ transition: 'all 0.2s' }}
                                    />
                                </button>
                            </div>

                            {/* Price */}
                            <div style={{
                                fontSize: 36,
                                fontWeight: 800,
                                color: '#f1f5f9',
                                fontVariantNumeric: 'tabular-nums',
                                letterSpacing: '-1px',
                                lineHeight: 1,
                                marginBottom: 8,
                            }}>
                                {instrument
                                    ? formatMarketPrice(instrument.currentPrice ?? 0, instrument.baseCurrency)
                                    : '—'}
                            </div>

                            {/* Change badge */}
                            {instrument && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                        fontSize: 14, fontWeight: 700,
                                        padding: '4px 12px', borderRadius: 8,
                                        fontVariantNumeric: 'tabular-nums',
                                        background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                        color: changeColor,
                                    }}>
                                        <ChangIcon size={13} />
                                        {isPositive ? '+' : ''}{(instrument.change24h ?? 0).toFixed(2)}%
                                    </span>
                                    <span style={{ fontSize: 12, color: '#475569' }}>24 saatlik değişim</span>
                                </div>
                            )}
                        </div>

                        {/* Right: Stat pills */}
                        {instrument && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
                                <StatPill label="Tür" value={instrument.type} />
                                <StatPill label="Para Birimi" value={instrument.baseCurrency} />
                                <StatPill
                                    label="Durum"
                                    value={(instrument.change24h ?? 0) >= 0 ? 'Yükselişte' : 'Düşüşte'}
                                    highlight={changeColor}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ─── Chart + Trade Widget ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Chart */}
                <div
                    className="lg:col-span-3"
                    style={{
                        background: '#111118',
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.06)',
                        padding: 20,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <Activity size={14} style={{ color: '#6366f1' }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Fiyat Grafiği</span>
                        {loading && <RefreshCw size={12} style={{ color: '#475569', animation: 'spin 1s linear infinite' }} />}
                    </div>
                    <CandlestickChart symbol={symbol} defaultSlot="D1" defaultRange="1A" />
                </div>

                {/* Trade Widget */}
                <div className="lg:col-span-1">
                    <div style={{ position: 'sticky', top: 72 }}>
                        <TradeWidget
                            symbol={symbol}
                            instrumentName={instrument?.name}
                            currentPrice={instrument?.currentPrice ?? 0}
                        />
                    </div>
                </div>
            </div>

            {/* ─── Related News — filtered by instrument symbol ─── */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Newspaper size={15} style={{ color: '#6366f1' }} />
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>İlgili Haberler</span>
                    {newsTopic && (
                        <span style={{
                            fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                            letterSpacing: 0.5, padding: '2px 8px', borderRadius: 4,
                            background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                        }}>
                            {TOPIC_LABELS[newsTopic] || newsTopic}
                        </span>
                    )}
                    <a
                        href="/news"
                        style={{
                            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 12, fontWeight: 500, color: '#64748b', textDecoration: 'none',
                            transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#f1f5f9'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; }}
                    >
                        Tüm haberler <ExternalLink size={11} />
                    </a>
                </div>

                {/* News loading skeleton */}
                {newsLoading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="animate-pulse" style={{
                                background: '#111118', borderRadius: 12, padding: 16,
                                border: '1px solid rgba(255,255,255,0.04)',
                            }}>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ width: 64, height: 64, borderRadius: 8, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ height: 14, width: '90%', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
                                        <div style={{ height: 14, width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* No related news */}
                {!newsLoading && relatedNews.length === 0 && (
                    <div className="text-center py-10">
                        <Newspaper className="mx-auto mb-2 text-ghost" size={24} />
                        <p className="text-meta">Bu enstrümana ait haber bulunamadı.</p>
                    </div>
                )}

                {/* Related news grid */}
                {relatedNews.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                        {relatedNews.map((article, idx) => {
                            const articleInstruments = (article.instruments || []).slice(0, 3);
                            const sourceBadgeColor = article.source?.name ? getSourceColor(article.source.name) : '#64748b';
                            return (
                                <a
                                    key={`${article.url}-${idx}`}
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group"
                                    style={{
                                        display: 'flex', gap: 14, background: '#111118', borderRadius: 12, padding: 16,
                                        border: '1px solid rgba(255,255,255,0.04)', transition: 'all 0.2s', textDecoration: 'none',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    {article.urlToImage && (
                                        <img
                                            src={article.urlToImage} alt=""
                                            style={{ width: 68, height: 68, objectFit: 'cover', borderRadius: 8, background: '#0a0a0f', flexShrink: 0 }}
                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    )}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                        <h4 style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.4, marginBottom: 6 }} className="line-clamp-2">
                                            {article.title}
                                        </h4>

                                        {/* Instrument tags */}
                                        {articleInstruments.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
                                                {articleInstruments.map(inst => {
                                                    const color = ASSET_TYPE_COLORS[inst.assetType] || '#6366f1';
                                                    const isCurrentSymbol = inst.symbol === symbol;
                                                    return (
                                                        <span
                                                            key={`${inst.symbol}-${inst.rankOrder}`}
                                                            style={{
                                                                padding: '1px 5px', fontSize: 9, fontWeight: 600, borderRadius: 3,
                                                                background: isCurrentSymbol ? `${color}30` : `${color}14`,
                                                                color,
                                                                border: `1px solid ${isCurrentSymbol ? `${color}50` : `${color}25`}`,
                                                                lineHeight: '16px', letterSpacing: '0.2px',
                                                            }}
                                                        >
                                                            {inst.symbol}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                                            <span style={{ fontSize: 10, fontWeight: 600, color: sourceBadgeColor, textTransform: 'uppercase' }}>
                                                {article.source?.name || ''}
                                            </span>
                                            <span style={{ fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Clock size={10} />{timeAgo(article.publishedAt)}
                                            </span>
                                        </div>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InstrumentDetailPage;
