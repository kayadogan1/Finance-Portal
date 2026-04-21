import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft,
    Star,
    TrendingUp,
    TrendingDown,
    Activity,
    Sparkles,
    Newspaper,
    ExternalLink,
    RefreshCw,
} from 'lucide-react';
import CandlestickChart from '../components/market/CandlestickChart';
import AIAnalysisCard from '../components/market/AIAnalysisCard';
import TradeWidget from '../components/trade/TradeWidget';
import NewsGrid from '../components/news/NewsGrid';
import { getMarketInstruments, type MarketInstrument } from '../services/marketService';
import { formatMarketPrice } from '../utils/currency';
import { useFavorites } from '../hooks/useFavorites';

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

/* ════════════════════════════════════════
   Instrument Detail Page
   ════════════════════════════════════════ */

const InstrumentDetailPage = () => {
    const { symbol } = useParams<{ symbol: string }>();
    const navigate = useNavigate();
    const { isFavorite, toggleFavorite } = useFavorites();

    const [instrument, setInstrument] = useState<MarketInstrument | null>(null);
    const [loading, setLoading] = useState(true);

    /* Fetch all instruments and find this one */
    const { data: allInstruments = [] } = useQuery({
        queryKey: ['market-instruments'],
        queryFn: getMarketInstruments,
        staleTime: 1000 * 60 * 5,
    });

    useEffect(() => {
        if (allInstruments.length > 0) {
            const found = allInstruments.find(i => i.symbol === symbol);
            setInstrument(found ?? null);
            setLoading(false);
        }
    }, [allInstruments, symbol]);

    if (!symbol) {
        navigate('/market');
        return null;
    }

    const isPositive = (instrument?.change24h ?? 0) >= 0;
    const changeColor = isPositive ? '#10b981' : '#ef4444';
    const ChangIcon = isPositive ? TrendingUp : TrendingDown;
    const fav = isFavorite(symbol);

    /* News topic from instrument type */
    const newsTopic = instrument ? typeToNewsTopic[instrument.type] ?? undefined : undefined;

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

            {/* ─── AI Analysis ─── */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Sparkles size={15} style={{ color: '#6366f1' }} />
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Yapay Zeka Analizi</span>
                </div>
                <AIAnalysisCard symbol={symbol} />
            </div>

            {/* ─── Related News ─── */}
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
                            {newsTopic}
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
                <NewsGrid
                    key={`news-${newsTopic ?? 'all'}`}
                    topic={newsTopic}
                    columns={3}
                    maxItems={6}
                    title=""
                />
            </div>
        </div>
    );
};

export default InstrumentDetailPage;
