import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
    Clock,
    Crosshair,
    Globe2,
    MapPin,
    Star,
    TrendingUp,
    TrendingDown,
} from 'lucide-react';
import { belongsToMarket, formatChangePercent, getMarketInstruments, hasChange, type MarketInstrument } from '../services/marketService';
import { buildNewsDetailPath, getNews, resolveNewsImage, ASSET_TYPE_COLORS, type FilteredArticleDto } from '../services/newsService';
import { formatMarketPrice } from '../utils/currency';
import { getSourceColor } from '../components/news/SourceAvatar';
import { useFavorites } from '../hooks/useFavorites';
import ComparisonChart from '../components/market/ComparisonChart';

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

const TOP_STOCK_LIMIT = 5;

const hasUsablePrice = (instrument: MarketInstrument) => {
    return instrument.hasPrice && Number.isFinite(instrument.currentPrice) && instrument.currentPrice > 0;
};

const sortByPriceDesc = (a: MarketInstrument, b: MarketInstrument) => {
    return (b.currentPrice ?? 0) - (a.currentPrice ?? 0);
};

const MarketSummaryStrip = ({
    instruments,
    onNavigate,
}: {
    instruments: MarketInstrument[];
    onNavigate: (symbol: string) => void;
}) => {
    const summaryItems = useMemo(() => {
        return [...instruments]
            .filter((instrument) => instrument.type === 'STOCK' && hasUsablePrice(instrument))
            .sort(sortByPriceDesc)
            .slice(0, TOP_STOCK_LIMIT);
    }, [instruments]);

    if (!summaryItems.length) return null;

    return (
        <div className="market-summary-strip">
            {summaryItems.map(inst => {
                const chg = inst.change24h ?? 0;
                const isPos = chg >= 0;
                const color = isPos ? '#10b981' : '#ef4444';
                return (
                    <button
                        key={inst.symbol}
                        type="button"
                        onClick={() => onNavigate(inst.symbol)}
                        className="market-summary-card text-left"
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                {inst.symbol}
                            </span>
                            <span style={{
                                fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 3,
                                background: isPos ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                color,
                            }}>
                                {formatChangePercent(chg)}
                            </span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--foreground))', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.3px' }}>
                            {formatMarketPrice(inst.currentPrice ?? 0, inst.baseCurrency)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                            {isPos
                                ? <TrendingUp size={10} style={{ color }} />
                                : <TrendingDown size={10} style={{ color }} />}
                            <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>{inst.name?.slice(0, 18)}</span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

/* ─── List Widget (Dense Table-like Card) ─── */
const ListWidget = ({
    title,
    items,
    onClick,
    actionLink,
    actionText,
    isLoading,
    isFavorite,
    onFavoriteToggle,
}: {
    title: string;
    items: MarketInstrument[];
    onClick: (symbol: string) => void;
    actionLink?: string;
    actionText?: string;
    isLoading: boolean;
    isFavorite?: (symbol: string) => boolean;
    onFavoriteToggle?: (symbol: string) => void;
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'hsl(var(--foreground))', letterSpacing: '-0.3px', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {title} <span style={{ color: 'hsl(var(--subtle-foreground))', fontSize: 18 }} className="font-light">›</span>
                </h3>
                {actionLink && (
                    <NavLink to={actionLink} style={{ fontSize: 13, color: 'hsl(var(--primary))', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }} className="hover:opacity-80">
                        {actionText || 'Tümü'}
                    </NavLink>
                )}
            </div>

            {/* Table Header */}
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 10, color: 'hsl(var(--muted-foreground))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, paddingBottom: 10, borderBottom: '1px solid hsl(var(--border))' }}>
                {onFavoriteToggle && <div style={{ width: 36, flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>Sembol</div>
                <div style={{ textAlign: 'right', width: 90 }}>Fiyat</div>
                <div style={{ textAlign: 'right', width: 70 }}>Değişim</div>
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="animate-pulse" style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid hsl(var(--background-subtle))', gap: 12, alignItems: 'center' }}>
                            <div style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.05)' }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ height: 12, width: 80, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 4 }} />
                                <div style={{ height: 10, width: 40, background: 'hsl(var(--background-subtle))', borderRadius: 4 }} />
                            </div>
                            <div style={{ height: 12, width: 60, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
                            <div style={{ height: 12, width: 45, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
                        </div>
                    ))
                ) : items.length === 0 ? (
                    <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: 'hsl(var(--subtle-foreground))' }}>Veri bulunamadı</div>
                ) : (
                    items.map((inst, index) => {
                        const hasChangeValue = hasChange(inst);
                        const isPositive = hasChangeValue && inst.change24h >= 0;
                        const changeColor = !hasChangeValue ? 'hsl(var(--muted-foreground))' : isPositive ? '#10b981' : '#ef4444';
                        const fav = isFavorite?.(inst.symbol) ?? false;
                        const flashClass = !hasChangeValue ? '' : isPositive ? 'price-flash-up' : 'price-flash-down';
                        return (
                            <div
                                key={inst.symbol}
                                onClick={() => onClick(inst.symbol)}
                                className={`hover:bg-white/[0.02] -mx-3 px-3 rounded-lg ${flashClass}`}
                                style={{
                                    display: 'flex', alignItems: 'center', padding: '12px 0',
                                    borderBottom: index < items.length - 1 ? '1px solid hsl(var(--background-subtle))' : 'none',
                                    cursor: 'pointer', transition: 'background 0.2s',
                                    gap: 12
                                }}
                            >
                                {onFavoriteToggle && (
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onFavoriteToggle(inst.symbol);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 24,
                                            height: 24,
                                            border: 'none',
                                            background: 'transparent',
                                            color: fav ? '#eab308' : 'hsl(var(--ghost-foreground))',
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                        }}
                                        title={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                                    >
                                        <Star size={14} fill={fav ? '#eab308' : 'none'} />
                                    </button>
                                )}
                                {/* Icon / Avatar */}
                                <div style={{
                                    width: 30, height: 30, borderRadius: 15,
                                    background: !hasChangeValue ? 'rgba(148,163,184,0.1)' : isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 10, fontWeight: 800, color: changeColor, flexShrink: 0
                                }}>
                                    {inst.symbol.slice(0, 2)}
                                </div>
                                {/* Name info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {inst.name || inst.symbol}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--border-subtle))', padding: '1px 6px', borderRadius: 4 }}>
                                            {inst.symbol}
                                        </span>
                                    </div>
                                </div>
                                {/* Price */}
                                <div style={{ textAlign: 'right', width: 90, flexShrink: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}>
                                        {formatMarketPrice(inst.currentPrice ?? 0, inst.baseCurrency)}
                                    </div>
                                </div>
                                {/* Change */}
                                <div style={{ textAlign: 'right', width: 70, flexShrink: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: changeColor, fontVariantNumeric: 'tabular-nums' }}>
                                        {formatChangePercent(inst.change24h)}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

/* ════════════════════════════════════════
   Dashboard Page
   ════════════════════════════════════════ */
const DashboardPage = () => {
    const navigate = useNavigate();
    const [region, setRegion] = useState<'TR' | 'US'>('TR');
    const { favorites, isFavorite, toggleFavorite } = useFavorites();

    /* Cache instruments globally — 5min staleTime prevents refetch on every page visit */
    const { data: instruments = [], isLoading } = useQuery({
        queryKey: ['market-instruments'],
        queryFn: getMarketInstruments,
        staleTime: 1000 * 60 * 15,
        gcTime: 1000 * 60 * 45,
    });

    const { data: news = [], isLoading: newsLoading } = useQuery({
        queryKey: ['news', 'all'],
        queryFn: () => getNews(),
        staleTime: 1000 * 60 * 3,
    });

    const sourceBadgeColor = getSourceColor;

    /* ─── Region filtering ─── */
    const regionalInstruments = useMemo(() => {
        return instruments.filter(i => belongsToMarket(i, region));
    }, [instruments, region]);

    const stocks = useMemo(() => regionalInstruments.filter(i => i.type === 'STOCK').sort(sortByPriceDesc).slice(0, 6), [regionalInstruments]);
    const cryptos = useMemo(() => regionalInstruments.filter(i => i.type === 'CRYPTO').slice(0, 6), [regionalInstruments]);
    const indices = useMemo(() => regionalInstruments.filter(i => i.type === 'INDEX').slice(0, 6), [regionalInstruments]);
    const commodities = useMemo(() => regionalInstruments.filter(i => i.type === 'COMMODITY' || i.type === 'FIAT' || i.type === 'FOREX').slice(0, 6), [regionalInstruments]);
    const favoriteInstruments = useMemo(() => {
        const favoriteSet = new Set(favorites);
        return instruments
            .filter((instrument) => favoriteSet.has(instrument.symbol) && belongsToMarket(instrument, region))
            .sort((a, b) => favorites.indexOf(a.symbol) - favorites.indexOf(b.symbol));
    }, [favorites, instruments, region]);

    const gainers = [...regionalInstruments]
        .filter(i => hasChange(i) && i.change24h > 0)
        .sort((a, b) => (b.change24h ?? Number.NEGATIVE_INFINITY) - (a.change24h ?? Number.NEGATIVE_INFINITY))
        .slice(0, 6);

    const losers = [...regionalInstruments]
        .filter(i => hasChange(i) && i.change24h < 0)
        .sort((a, b) => (a.change24h ?? Number.POSITIVE_INFINITY) - (b.change24h ?? Number.POSITIVE_INFINITY))
        .slice(0, 6);

    const latestNews: FilteredArticleDto[] = Array.isArray(news) ? news.slice(0, 6) : [];

    const goToInstrument = (symbol: string) => navigate(`/instrument/${symbol}`);

    return (
        <div className="space-y-10 mb-20">
            <div className="flex justify-end pb-2">
                <div className="flex bg-[hsl(var(--card))] border border-border p-1 rounded-xl w-fit shrink-0 shadow-sm">
                    <button
                        onClick={() => setRegion('TR')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                            region === 'TR' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                    >
                        <MapPin size={16} /> TR Piyasası
                    </button>
                    <button
                        onClick={() => setRegion('US')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                            region === 'US' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                    >
                        <Globe2 size={16} /> ABD Piyasası
                    </button>
                </div>
            </div>

            {/* ─── Market Summary Strip ─── */}
            <MarketSummaryStrip instruments={regionalInstruments} onNavigate={goToInstrument} />

            {/* ════════════════════════════════════
                High-Density Matrix (TradingView Style)
                ════════════════════════════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', columnGap: 64, rowGap: 48 }}>
                {favoriteInstruments.length > 0 && (
                    <ListWidget
                        title="Favorilerim"
                        items={favoriteInstruments}
                        isLoading={isLoading}
                        onClick={goToInstrument}
                        actionLink="/market"
                        actionText="Piyasalara Git"
                        isFavorite={isFavorite}
                        onFavoriteToggle={toggleFavorite}
                    />
                )}
                <ListWidget title="Hisse Senetleri" items={stocks} isLoading={isLoading} onClick={goToInstrument} actionLink="/market" isFavorite={isFavorite} onFavoriteToggle={toggleFavorite} />
                <ListWidget title="Kripto Paralar" items={cryptos} isLoading={isLoading} onClick={goToInstrument} actionLink="/market" isFavorite={isFavorite} onFavoriteToggle={toggleFavorite} />
                
                <ListWidget title="En Çok Artanlar" items={gainers} isLoading={isLoading} onClick={goToInstrument} isFavorite={isFavorite} onFavoriteToggle={toggleFavorite} />
                <ListWidget title="En Çok Düşenler" items={losers} isLoading={isLoading} onClick={goToInstrument} isFavorite={isFavorite} onFavoriteToggle={toggleFavorite} />
                
                <ListWidget title="Endeksler" items={indices} isLoading={isLoading} onClick={goToInstrument} actionLink="/market" isFavorite={isFavorite} onFavoriteToggle={toggleFavorite} />
                <ListWidget title="Emtia ve Döviz" items={commodities} isLoading={isLoading} onClick={goToInstrument} actionLink="/market" isFavorite={isFavorite} onFavoriteToggle={toggleFavorite} />
            </div>

            <div style={{ marginTop: 16 }}>
                <ComparisonChart />
            </div>

            {/* ─── News Feed (Grid layout to fit dense aesthetic) ─── */}
            <div style={{ marginTop: 40, paddingTop: 40, borderTop: '1px solid hsl(var(--border))' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: 'hsl(var(--foreground))', letterSpacing: '-0.3px', margin: 0 }}>
                        Finans Haberleri
                    </h3>
                    <NavLink to="/news" style={{ fontSize: 13, color: 'hsl(var(--primary))', textDecoration: 'none', fontWeight: 600 }}>
                        Tüm Haberler ›
                    </NavLink>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                    {newsLoading
                        ? Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="animate-pulse" style={{ background: 'hsl(var(--card))', borderRadius: 12, padding: 16, border: '1px solid hsl(var(--border-subtle))' }}>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ width: 64, height: 64, borderRadius: 8, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ height: 14, width: '90%', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
                                        <div style={{ height: 14, width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
                                        <div style={{ height: 10, width: 40, background: 'hsl(var(--background-subtle))', borderRadius: 4, marginTop: 'auto' }} />
                                    </div>
                                </div>
                            </div>
                        ))
                        : latestNews.map((article, idx) => {
                            const instruments = (article.instruments || []).slice(0, 3);
                            return (
                            <Link
                                key={`${article.url}-${idx}`}
                                to={buildNewsDetailPath(article.url)}
                                state={{ article }}
                                className="group"
                                style={{
                                    display: 'flex', gap: 16, background: 'hsl(var(--card))', borderRadius: 12, padding: 16,
                                    border: '1px solid hsl(var(--border-subtle))', transition: 'all 0.2s', textDecoration: 'none'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = 'hsl(var(--border))';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = 'hsl(var(--border-subtle))';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <img
                                    src={resolveNewsImage(article.urlToImage, article.source?.name, article.category)} alt={article.title}
                                    style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, background: 'hsl(var(--background))', flexShrink: 0 }}
                                    onError={e => { (e.target as HTMLImageElement).src = resolveNewsImage(undefined, article.source?.name, article.category); }}
                                />
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))', lineHeight: 1.4, marginBottom: 6 }} className="line-clamp-2">
                                        {article.title}
                                    </h4>

                                    {/* Enstrüman tag'leri */}
                                    {instruments.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                                            {instruments.map((inst) => {
                                                const color = ASSET_TYPE_COLORS[inst.assetType] || '#6366f1';
                                                return (
                                                    <button
                                                        key={`${inst.symbol}-${inst.rankOrder}`}
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/instrument/${inst.symbol}`); }}
                                                        style={{
                                                            padding: '1px 5px', fontSize: 9, fontWeight: 600, borderRadius: 3,
                                                            background: `${color}14`, color, border: `1px solid ${color}25`,
                                                            cursor: 'pointer', lineHeight: '16px', letterSpacing: '0.2px',
                                                            display: 'inline-flex', alignItems: 'center', gap: 3,
                                                        }}
                                                        title={`${inst.symbol} — ${inst.assetType}`}
                                                    >
                                                        {inst.primaryMatch && <Crosshair size={7} style={{ opacity: 0.7 }} />}
                                                        {inst.symbol}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                                        {article.source?.name ? (
                                            <span style={{ fontSize: 10, fontWeight: 600, color: sourceBadgeColor(article.source.name), textTransform: 'uppercase' }}>
                                                {article.source.name}
                                            </span>
                                        ) : <span />}
                                        <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Clock size={10} />{timeAgo(article.publishedAt)}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                            );
                        })}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
