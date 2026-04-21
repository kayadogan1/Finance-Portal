import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    Clock,
    ExternalLink,
    Star,
    TrendingUp,
    TrendingDown,
    Activity,
    Globe2,
    MapPin,
    ArrowUpRight,
} from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { getMarketInstruments, type MarketInstrument } from '../services/marketService';
import { getNews, type FilteredArticleDto } from '../services/newsService';
import { formatMarketPrice, isTRCurrency, isUSCurrency } from '../utils/currency';
import SourceAvatar, { getSourceColor } from '../components/news/SourceAvatar';

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

function findInstrument(instruments: MarketInstrument[], ...symbols: string[]): MarketInstrument | undefined {
    for (const sym of symbols) {
        const found = instruments.find(i => i.symbol.toUpperCase().includes(sym.toUpperCase()));
        if (found) return found;
    }
    return undefined;
}

/* ─── Sparkline ─── */
const MiniSparkline = ({ positive }: { positive: boolean }) => {
    const color = positive ? '#10b981' : '#ef4444';
    const bars = positive ? [30, 45, 35, 55, 50, 65, 60, 75] : [70, 60, 65, 50, 55, 40, 45, 30];
    return (
        <div style={{ display: 'flex', alignItems: 'end', gap: 2, height: 28 }}>
            {bars.map((h, i) => (
                <div key={i} style={{
                    width: 3, height: `${h}%`, background: color,
                    opacity: 0.25 + (i / bars.length) * 0.75, borderRadius: 1,
                }} />
            ))}
        </div>
    );
};

/* ─── SVG Sparkline line ─── */
const SparklineSVG = ({ positive }: { positive: boolean }) => {
    const color = positive ? '#10b981' : '#ef4444';
    const pts = positive
        ? [0,60, 12,50, 24,55, 36,40, 48,45, 60,30, 72,35, 84,20, 96,15, 108,10]
        : [0,10, 12,20, 24,15, 36,30, 48,25, 60,40, 72,35, 84,50, 96,55, 108,60];
    const pathD = pts.reduce((acc, v, i) => {
        const x = i % 2 === 0 ? v : undefined;
        const y = i % 2 !== 0 ? v : undefined;
        if (x !== undefined) return acc;
        const px = pts[i - 1];
        return acc + (i === 1 ? `M${px},${v}` : ` L${px},${v}`);
    }, '');
    return (
        <svg width="108" height="60" viewBox="0 0 108 60" style={{ display: 'block' }}>
            <defs>
                <linearGradient id={`sg-${positive}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={pathD + ` L108,60 L0,60 Z`} fill={`url(#sg-${positive})`} />
            <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

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

/* ─── Clickable Instrument Card ─── */
const InstrumentCard = ({
    inst, onClick, variant = 'default'
}: {
    inst: MarketInstrument;
    onClick: () => void;
    variant?: 'default' | 'hero' | 'index';
}) => {
    const isPositive = (inst.change24h ?? 0) >= 0;
    const changeColor = isPositive ? '#10b981' : '#ef4444';

    if (variant === 'hero') {
        return (
            <div
                onClick={onClick}
                style={{
                    background: 'linear-gradient(135deg, #111118 0%, #0d0d14 100%)',
                    borderRadius: 16,
                    padding: '24px 28px 20px',
                    border: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: `0 4px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.borderColor = `${changeColor}30`;
                    e.currentTarget.style.boxShadow = `0 8px 48px rgba(0,0,0,0.5), 0 0 0 1px ${changeColor}20`;
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                    e.currentTarget.style.boxShadow = '0 4px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)';
                }}
            >
                {/* Glow */}
                <div style={{
                    position: 'absolute', top: 0, right: 0, width: 200, height: 200,
                    background: `radial-gradient(circle, ${changeColor}08 0%, transparent 70%)`,
                    pointerEvents: 'none',
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 10,
                                background: isPositive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 800, color: changeColor,
                            }}>
                                {inst.symbol.slice(0, 3)}
                            </div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{inst.symbol}</div>
                                <div style={{ fontSize: 11, color: '#475569' }}>{inst.name}</div>
                            </div>
                            <ArrowUpRight size={14} style={{ color: '#334155', marginLeft: 'auto' }} />
                        </div>

                        <div style={{ fontSize: 32, fontWeight: 800, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px', lineHeight: 1, marginBottom: 10 }}>
                            {formatMarketPrice(inst.currentPrice ?? 0, inst.baseCurrency)}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 13, fontWeight: 700, color: changeColor,
                                padding: '3px 10px', borderRadius: 6,
                                background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                fontVariantNumeric: 'tabular-nums',
                            }}>
                                {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                {isPositive ? '+' : ''}{(inst.change24h ?? 0).toFixed(2)}%
                            </span>
                            <span style={{ fontSize: 11, color: '#475569' }}>24s değişim</span>
                        </div>
                    </div>

                    <div style={{ paddingLeft: 16 }}>
                        <SparklineSVG positive={isPositive} />
                    </div>
                </div>
            </div>
        );
    }

    if (variant === 'index') {
        return (
            <div
                onClick={onClick}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: isPositive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 800, color: changeColor, flexShrink: 0,
                    }}>
                        {inst.symbol.slice(0, 3)}
                    </div>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{inst.symbol}</div>
                        <div style={{ fontSize: 10, color: '#64748b', maxWidth: 100, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.name}</div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>
                        {formatMarketPrice(inst.currentPrice ?? 0, inst.baseCurrency)}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: changeColor, fontVariantNumeric: 'tabular-nums' }}>
                        {isPositive ? '+' : ''}{(inst.change24h ?? 0).toFixed(2)}%
                    </div>
                </div>
            </div>
        );
    }

    // default
    return (
        <div
            onClick={onClick}
            style={{
                background: '#111118',
                borderRadius: 12,
                padding: '18px 20px',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.04)',
                transition: 'all 0.2s',
                cursor: 'pointer',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 6px 24px rgba(0,0,0,0.3), 0 0 0 1px ${changeColor}25`;
                e.currentTarget.style.borderColor = `${changeColor}20`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {inst.symbol}
                </span>
                <MiniSparkline positive={isPositive} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px', marginBottom: 6 }}>
                {formatMarketPrice(inst.currentPrice ?? 0, inst.baseCurrency)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: changeColor, fontVariantNumeric: 'tabular-nums' }}>
                    {isPositive ? '+' : ''}{(inst.change24h ?? 0).toFixed(2)}%
                </span>
                <span style={{ fontSize: 10, color: '#475569' }}>24s</span>
            </div>
        </div>
    );
};

/* ─── Mover Row ─── */
const MoverRow = ({ inst, rank, onClick }: { inst: MarketInstrument; rank: number; onClick: () => void }) => {
    const isPositive = (inst.change24h ?? 0) >= 0;
    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px',
                background: '#111118', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'all 0.2s', cursor: 'pointer',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
                e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', width: 18, textAlign: 'center' }}>{rank}</span>
            <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 8,
                background: isPositive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                fontSize: 12, fontWeight: 700, color: isPositive ? '#10b981' : '#ef4444', flexShrink: 0,
            }}>
                {inst.symbol.slice(0, 3)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{inst.symbol}</div>
                <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.name}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>
                    {formatMarketPrice(inst.currentPrice ?? 0, inst.baseCurrency)}
                </div>
            </div>
            <span style={{
                fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
                fontVariantNumeric: 'tabular-nums',
                background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: isPositive ? '#10b981' : '#ef4444', flexShrink: 0,
            }}>
                {isPositive ? '+' : ''}{(inst.change24h ?? 0).toFixed(2)}%
            </span>
        </div>
    );
};

/* ════════════════════════════════════════
   Dashboard Page
   ════════════════════════════════════════ */
const DashboardPage = () => {
    const navigate = useNavigate();
    const [instruments, setInstruments] = useState<MarketInstrument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [region, setRegion] = useState<'TR' | 'US'>('TR');

    useEffect(() => {
        getMarketInstruments().then(data => {
            setInstruments(data);
            setIsLoading(false);
        });
    }, []);

    const { data: news = [], isLoading: newsLoading } = useQuery({
        queryKey: ['news', 'all'],
        queryFn: () => getNews(),
        staleTime: 1000 * 60 * 3,
    });

    const { favorites } = useFavorites();
    const sourceBadgeColor = getSourceColor;

    /* ─── Derived data ─── */
    const regionalInstruments = useMemo(() => {
        return instruments.filter(i => {
            if (i.type === 'CRYPTO') return true;
            if (region === 'TR') return isTRCurrency(i.baseCurrency);
            if (region === 'US') return isUSCurrency(i.baseCurrency);
            return true;
        });
    }, [instruments, region]);

    const favoriteInstruments = favorites
        .map(sym => instruments.find(i => i.symbol === sym))
        .filter(Boolean) as MarketInstrument[];

    /* Hero asset — main index/asset for this region */
    const heroAsset = useMemo(() => {
        const trTarget = ['XU100', 'BIST100', 'BTC'];
        const usTarget = ['SPX', 'SP500', 'NDX', 'BTC'];
        const targets = region === 'TR' ? trTarget : usTarget;
        return findInstrument(regionalInstruments, ...targets);
    }, [regionalInstruments, region]);

    /* Overview strip assets */
    const overviewAssets = useMemo(() => {
        const usTargets = ['BTC', 'SPX', 'GOLD', 'EURUSD'];
        const trTargets = ['BTC', 'XU100', 'ALTIN', 'USDTRY'];
        const targets = region === 'US' ? usTargets : trTargets;
        return targets.map(sym => findInstrument(regionalInstruments, sym)).filter(Boolean) as MarketInstrument[];
    }, [regionalInstruments, region]);

    /* Major indices sidebar */
    const majorIndices = useMemo(() => {
        const targets = region === 'TR'
            ? ['XU100', 'XU030', 'ALTIN', 'USDTRY', 'EURTRY', 'BTC', 'ETH']
            : ['NDX', 'SPX', 'DJI', 'GOLD', 'EURUSD', 'BTC', 'ETH'];
        return targets.map(sym => findInstrument(regionalInstruments, sym)).filter(Boolean) as MarketInstrument[];
    }, [regionalInstruments, region]);

    /* Macro cards — bottom row like TradingView */
    const macroCards = useMemo(() => {
        const targets = region === 'TR'
            ? ['BTC', 'ALTIN', 'USDTRY']
            : ['BTC', 'GOLD', 'DXY'];
        return targets.map(sym => findInstrument(regionalInstruments, sym)).filter(Boolean) as MarketInstrument[];
    }, [regionalInstruments, region]);

    const topMovers = [...regionalInstruments]
        .sort((a, b) => Math.abs(b.change24h ?? 0) - Math.abs(a.change24h ?? 0))
        .slice(0, 4);

    const gainers = [...regionalInstruments]
        .filter(i => (i.change24h ?? 0) > 0)
        .sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0))
        .slice(0, 3);

    const losers = [...regionalInstruments]
        .filter(i => (i.change24h ?? 0) < 0)
        .sort((a, b) => (a.change24h ?? 0) - (b.change24h ?? 0))
        .slice(0, 3);

    const latestNews: FilteredArticleDto[] = Array.isArray(news) ? news.slice(0, 5) : [];

    const goToInstrument = (symbol: string) => navigate(`/instrument/${symbol}`);

    return (
        <div className="space-y-8">
            {/* ─── Header Strip ─── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-1px', color: 'hsl(var(--foreground))' }}>
                        Genel Bakış
                    </h2>
                    <p className="text-meta mt-1">Piyasa özeti ve güncel gelişmeler — enstrümana tıklayarak detaya gidin</p>
                </div>

                {/* Region Toggle */}
                <div className="flex bg-[#111118] border border-border p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setRegion('TR')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                            region === 'TR' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                    >
                        <MapPin size={16} /> TR Piyasası
                    </button>
                    <button
                        onClick={() => setRegion('US')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                            region === 'US' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                    >
                        <Globe2 size={16} /> US Piyasası
                    </button>
                </div>
            </div>

            {/* ════════════════════════════════════
                TradingView-style Hero + Major Indices
                ════════════════════════════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }} className="!grid-cols-1 lg:!grid-cols-[1fr_340px]">
                {/* Left: Hero card + Overview strip */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Hero asset */}
                    {isLoading ? (
                        <div className="animate-pulse rounded-2xl" style={{ height: 160, background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }} />
                    ) : heroAsset ? (
                        <InstrumentCard inst={heroAsset} onClick={() => goToInstrument(heroAsset.symbol)} variant="hero" />
                    ) : null}

                    {/* Market Overview Strip */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span className="text-label">Piyasa Özeti</span>
                            <NavLink to="/market" className="text-[12px] font-medium text-subtle hover:text-foreground flex items-center gap-1 transition-colors">
                                Tüm Piyasalar <ArrowRight size={11} />
                            </NavLink>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }} className="md:!grid-cols-4">
                            {isLoading
                                ? Array.from({ length: 4 }).map((_, i) => <OverviewSkeleton key={i} />)
                                : overviewAssets.map(inst => (
                                    <InstrumentCard
                                        key={inst.symbol}
                                        inst={inst}
                                        onClick={() => goToInstrument(inst.symbol)}
                                        variant="default"
                                    />
                                ))}
                        </div>
                    </div>
                </div>

                {/* Right: Major Indices list */}
                <div style={{
                    background: '#111118',
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '14px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>
                        <Activity size={13} style={{ color: '#6366f1' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>
                            {region === 'TR' ? 'Türkiye Piyasası' : 'ABD Piyasası'}
                        </span>
                        <NavLink to="/market" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569', textDecoration: 'none' }}>
                            Tümünü Gör <ArrowRight size={10} />
                        </NavLink>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {isLoading
                            ? Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="animate-pulse" style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ height: 12, width: 60, background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginBottom: 6 }} />
                                        <div style={{ height: 10, width: 90, background: 'rgba(255,255,255,0.03)', borderRadius: 3 }} />
                                    </div>
                                    <div style={{ height: 12, width: 60, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }} />
                                </div>
                            ))
                            : majorIndices.map(inst => (
                                <InstrumentCard
                                    key={inst.symbol}
                                    inst={inst}
                                    onClick={() => goToInstrument(inst.symbol)}
                                    variant="index"
                                />
                            ))}
                    </div>
                </div>
            </div>

            {/* ─── Macro Cards (TradingView alt satır) ─── */}
            {macroCards.length > 0 && !isLoading && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="!grid-cols-1 sm:!grid-cols-3">
                    {macroCards.map(inst => {
                        const isPositive = (inst.change24h ?? 0) >= 0;
                        const changeColor = isPositive ? '#10b981' : '#ef4444';
                        return (
                            <div
                                key={inst.symbol}
                                onClick={() => goToInstrument(inst.symbol)}
                                style={{
                                    background: '#111118',
                                    borderRadius: 12,
                                    padding: '16px 20px',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = `${changeColor}25`;
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                                        {inst.symbol}
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
                                        {formatMarketPrice(inst.currentPrice ?? 0, inst.baseCurrency)}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <SparklineSVG positive={isPositive} />
                                    <div style={{ fontSize: 12, fontWeight: 700, color: changeColor, fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>
                                        {isPositive ? '+' : ''}{(inst.change24h ?? 0).toFixed(2)}%
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─── Favorites ─── */}
            {favoriteInstruments.length > 0 && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Star size={14} style={{ color: '#eab308', fill: 'rgba(234,179,8,0.2)' }} />
                            <span className="text-label">Favorilerim</span>
                        </div>
                        <NavLink to="/profile" className="text-[12px] font-medium text-subtle hover:text-foreground flex items-center gap-1 transition-colors">
                            Yönet <ArrowRight size={11} />
                        </NavLink>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }} className="md:!grid-cols-4">
                        {favoriteInstruments.map(inst => (
                            <InstrumentCard
                                key={inst.symbol}
                                inst={inst}
                                onClick={() => goToInstrument(inst.symbol)}
                                variant="default"
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Top Movers ─── */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span className="text-label">En Hareketli Varlıklar</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }} className="md:!grid-cols-4">
                    {isLoading
                        ? Array.from({ length: 4 }).map((_, i) => <TickerSkeleton key={i} />)
                        : topMovers.map(inst => (
                            <InstrumentCard
                                key={inst.symbol}
                                inst={inst}
                                onClick={() => goToInstrument(inst.symbol)}
                                variant="default"
                            />
                        ))}
                </div>
            </div>

            {/* ─── Gainers & Losers ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="!grid-cols-1 lg:!grid-cols-2">
                {/* Gainers */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <TrendingUp size={13} style={{ color: '#10b981' }} />
                        <span className="text-label" style={{ color: '#10b981' }}>En Çok Artanlar</span>
                    </div>
                    <div className="space-y-2">
                        {isLoading
                            ? Array.from({ length: 3 }).map((_, i) => <TickerSkeleton key={i} />)
                            : gainers.map((inst, idx) => (
                                <MoverRow key={inst.symbol} inst={inst} rank={idx + 1} onClick={() => goToInstrument(inst.symbol)} />
                            ))}
                        {!isLoading && gainers.length === 0 && (
                            <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: 24 }}>Veri bulunamadı</p>
                        )}
                    </div>
                </div>

                {/* Losers */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <TrendingDown size={13} style={{ color: '#ef4444' }} />
                        <span className="text-label" style={{ color: '#ef4444' }}>En Çok Düşenler</span>
                    </div>
                    <div className="space-y-2">
                        {isLoading
                            ? Array.from({ length: 3 }).map((_, i) => <TickerSkeleton key={i} />)
                            : losers.map((inst, idx) => (
                                <MoverRow key={inst.symbol} inst={inst} rank={idx + 1} onClick={() => goToInstrument(inst.symbol)} />
                            ))}
                        {!isLoading && losers.length === 0 && (
                            <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: 24 }}>Veri bulunamadı</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── News Feed ─── */}
            <div style={{
                background: '#111118', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.04)',
                overflow: 'hidden',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                {article.urlToImage && (
                                    <img
                                        src={article.urlToImage} alt=""
                                        className="w-12 h-12 object-cover rounded-lg shrink-0"
                                        style={{ background: '#0a0a0f' }}
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <h4 style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.5 }} className="line-clamp-2">
                                        {article.title}
                                    </h4>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                        {article.source?.name && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                                                letterSpacing: 0.5, padding: '2px 8px 2px 3px', borderRadius: 999,
                                                background: `${sourceBadgeColor(article.source.name)}15`,
                                                color: sourceBadgeColor(article.source.name),
                                            }}>
                                                <SourceAvatar name={article.source.name} size="sm" />
                                                {article.source.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, paddingTop: 2 }}>
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
