import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    Clock,
    ExternalLink,
    Globe2,
    MapPin,
} from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { getMarketInstruments, type MarketInstrument } from '../services/marketService';
import { getNews, type FilteredArticleDto } from '../services/newsService';
import { formatMarketPrice, isTRCurrency, isUSCurrency } from '../utils/currency';
import SourceAvatar, { getSourceColor } from '../components/news/SourceAvatar';

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

/* ─── List Widget (Dense Table-like Card) ─── */
const ListWidget = ({
    title,
    items,
    onClick,
    actionLink,
    actionText,
    isLoading
}: {
    title: string;
    items: MarketInstrument[];
    onClick: (symbol: string) => void;
    actionLink?: string;
    actionText?: string;
    isLoading: boolean;
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.3px', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {title} <span style={{ color: '#475569', fontSize: 18 }} className="font-light">›</span>
                </h3>
                {actionLink && (
                    <NavLink to={actionLink} style={{ fontSize: 13, color: '#6366f1', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }} className="hover:text-indigo-400">
                        {actionText || 'Tümü'}
                    </NavLink>
                )}
            </div>

            {/* Table Header */}
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ flex: 1 }}>Sembol</div>
                <div style={{ textAlign: 'right', width: 90 }}>Fiyat</div>
                <div style={{ textAlign: 'right', width: 70 }}>Değişim</div>
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="animate-pulse" style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', gap: 12, alignItems: 'center' }}>
                            <div style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.05)' }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ height: 12, width: 80, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 4 }} />
                                <div style={{ height: 10, width: 40, background: 'rgba(255,255,255,0.03)', borderRadius: 4 }} />
                            </div>
                            <div style={{ height: 12, width: 60, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
                            <div style={{ height: 12, width: 45, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
                        </div>
                    ))
                ) : items.length === 0 ? (
                    <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: '#475569' }}>Veri bulunamadı</div>
                ) : (
                    items.map((inst, index) => {
                        const isPositive = (inst.change24h ?? 0) >= 0;
                        const changeColor = isPositive ? '#10b981' : '#ef4444';
                        return (
                            <div
                                key={inst.symbol}
                                onClick={() => onClick(inst.symbol)}
                                style={{
                                    display: 'flex', alignItems: 'center', padding: '12px 0',
                                    borderBottom: index < items.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                    cursor: 'pointer', transition: 'background 0.2s',
                                    gap: 12
                                }}
                                className="hover:bg-white/[0.02] -mx-3 px-3 rounded-lg"
                            >
                                {/* Icon / Avatar */}
                                <div style={{
                                    width: 30, height: 30, borderRadius: 15,
                                    background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 10, fontWeight: 800, color: changeColor, flexShrink: 0
                                }}>
                                    {inst.symbol.slice(0, 2)}
                                </div>
                                {/* Name info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {inst.name || inst.symbol}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: 4 }}>
                                            {inst.symbol}
                                        </span>
                                    </div>
                                </div>
                                {/* Price */}
                                <div style={{ textAlign: 'right', width: 90, flexShrink: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>
                                        {formatMarketPrice(inst.currentPrice ?? 0, inst.baseCurrency)}
                                    </div>
                                </div>
                                {/* Change */}
                                <div style={{ textAlign: 'right', width: 70, flexShrink: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: changeColor, fontVariantNumeric: 'tabular-nums' }}>
                                        {isPositive ? '+' : ''}{(inst.change24h ?? 0).toFixed(2)}%
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

    const sourceBadgeColor = getSourceColor;

    /* ─── Derived data ─── */
    const regionalInstruments = useMemo(() => {
        return instruments.filter(i => {
            if (i.type === 'CRYPTO') return true;
            if (region === 'TR') {
                // To display stocks in TR view, include items that are not explicitly US currency.
                if (isUSCurrency(i.baseCurrency)) return false;
                return true;
            }
            if (region === 'US') {
                // To display US items, include if it is US currency.
                if (isTRCurrency(i.baseCurrency)) return false;
                return true;
            }
            return true;
        });
    }, [instruments, region]);

    const stocks = useMemo(() => regionalInstruments.filter(i => i.type === 'STOCK').slice(0, 6), [regionalInstruments]);
    const cryptos = useMemo(() => regionalInstruments.filter(i => i.type === 'CRYPTO').slice(0, 6), [regionalInstruments]);
    const indices = useMemo(() => regionalInstruments.filter(i => i.type === 'INDEX').slice(0, 6), [regionalInstruments]);
    const commodities = useMemo(() => regionalInstruments.filter(i => i.type === 'COMMODITY' || i.type === 'FIAT' || i.type === 'FOREX').slice(0, 6), [regionalInstruments]);

    const topMovers = [...regionalInstruments]
        .sort((a, b) => Math.abs(b.change24h ?? 0) - Math.abs(a.change24h ?? 0))
        .slice(0, 6);

    const gainers = [...regionalInstruments]
        .filter(i => (i.change24h ?? 0) > 0)
        .sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0))
        .slice(0, 6);

    const losers = [...regionalInstruments]
        .filter(i => (i.change24h ?? 0) < 0)
        .sort((a, b) => (a.change24h ?? 0) - (b.change24h ?? 0))
        .slice(0, 6);

    const latestNews: FilteredArticleDto[] = Array.isArray(news) ? news.slice(0, 6) : [];

    const goToInstrument = (symbol: string) => navigate(`/instrument/${symbol}`);

            {/* ─── Header & Region Toggle ─── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-white/5">
                <div>
                    <h2 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-1.5px', color: '#f8fafc', lineHeight: 1 }}>
                        Genel Bakış
                    </h2>
                    <p className="text-meta mt-3 text-[14px]">
                        Piyasa sıralamaları, hacimli varlıklar ve finans dünyasından son gelişmeler.
                    </p>
                </div>

                {/* Region Toggle */}
                <div className="flex bg-[#111118] border border-border p-1 rounded-xl w-fit shrink-0 shadow-sm">
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

            {/* ════════════════════════════════════
                High-Density Matrix (TradingView Style)
                ════════════════════════════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', columnGap: 64, rowGap: 48 }}>
                <ListWidget title="Hisse Senetleri" items={stocks} isLoading={isLoading} onClick={goToInstrument} actionLink="/market" />
                <ListWidget title="Kripto Paralar" items={cryptos} isLoading={isLoading} onClick={goToInstrument} actionLink="/market" />
                
                <ListWidget title="En Çok Artanlar" items={gainers} isLoading={isLoading} onClick={goToInstrument} />
                <ListWidget title="En Çok Düşenler" items={losers} isLoading={isLoading} onClick={goToInstrument} />
                
                <ListWidget title="Endeksler" items={indices} isLoading={isLoading} onClick={goToInstrument} actionLink="/market" />
                <ListWidget title="Emtia ve Döviz" items={commodities} isLoading={isLoading} onClick={goToInstrument} actionLink="/market" />
            </div>

            {/* ─── News Feed (Grid layout to fit dense aesthetic) ─── */}
            <div style={{ marginTop: 40, paddingTop: 40, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.3px', margin: 0 }}>
                        Finans Haberleri
                    </h3>
                    <NavLink to="/news" style={{ fontSize: 13, color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
                        Tüm Haberler ›
                    </NavLink>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                    {newsLoading
                        ? Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="animate-pulse" style={{ background: '#111118', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.04)' }}>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ width: 64, height: 64, borderRadius: 8, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ height: 14, width: '90%', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
                                        <div style={{ height: 14, width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
                                        <div style={{ height: 10, width: 40, background: 'rgba(255,255,255,0.03)', borderRadius: 4, marginTop: 'auto' }} />
                                    </div>
                                </div>
                            </div>
                        ))
                        : latestNews.map((article, idx) => (
                            <a
                                key={`${article.url}-${idx}`}
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group"
                                style={{
                                    display: 'flex', gap: 16, background: '#111118', borderRadius: 12, padding: 16,
                                    border: '1px solid rgba(255,255,255,0.04)', transition: 'all 0.2s', textDecoration: 'none'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                {article.urlToImage && (
                                    <img
                                        src={article.urlToImage} alt=""
                                        style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, background: '#0a0a0f', flexShrink: 0 }}
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                )}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.4, marginBottom: 8 }} className="line-clamp-3">
                                        {article.title}
                                    </h4>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                                        {article.source?.name ? (
                                            <span style={{ fontSize: 10, fontWeight: 600, color: sourceBadgeColor(article.source.name), textTransform: 'uppercase' }}>
                                                {article.source.name}
                                            </span>
                                        ) : <span />}
                                        <span style={{ fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Clock size={10} />{timeAgo(article.publishedAt)}
                                        </span>
                                    </div>
                                </div>
                            </a>
                        ))}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
