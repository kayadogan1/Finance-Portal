import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    Activity,
    Newspaper,
    ExternalLink,
    RefreshCw,
    Clock,
    Calculator,
    Gauge,
    Sparkles,
} from 'lucide-react';
import CandlestickChart from '../components/market/CandlestickChart';
import TradeWidget from '../components/trade/TradeWidget';
import { formatChangePercent, getCandleData, getHypotheticalReturn, getInstrumentBySymbol, hasChange, normalizeInstrument, type MarketInstrument } from '../services/marketService';
import { articleMatchesInstrument, buildNewsDetailPath, getNews, normalizeNewsCategory, resolveNewsImage, TOPIC_LABELS, ASSET_TYPE_COLORS } from '../services/newsService';
import { formatMarketPrice } from '../utils/currency';
import { getSourceColor } from '../components/news/SourceAvatar';
import { calculateEMA, calculateRSI, calculateSMA } from '../utils/indicators';

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

const countryToNewsCountry = (market?: string) => {
    if (market === 'TR') return 'TR';
    if (market === 'US') return 'US';
    return undefined;
};

/* ─── Skeletons ─── */
const HeaderSkeleton = () => (
    <div className="animate-pulse space-y-3">
        <div className="h-4 w-24 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="h-8 w-48 rounded" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="h-5 w-32 rounded" style={{ background: 'hsl(var(--border-subtle))' }} />
    </div>
);

/* ─── Stat Pill ─── */
const StatPill = ({ label, value, highlight }: { label: string; value: string; highlight?: string }) => (
    <div style={{
        background: 'hsl(var(--card))',
        borderRadius: 10,
        padding: '12px 18px',
        border: '1px solid hsl(var(--border))',
        minWidth: 110,
    }}>
        <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 4, letterSpacing: 0.5, fontWeight: 600 }}>
            {label}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: highlight ?? 'hsl(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}>
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

const oneYearAgoIso = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().replace('Z', '').split('.')[0];
};

type TechnicalSignal = {
    label: 'Guclu Al' | 'Al' | 'Notr' | 'Sat' | 'Guclu Sat';
    color: string;
    score: number;
    meterPercent: number;
    summary: string;
    reasons: string[];
    rsi?: number;
    sma20?: number;
    sma50?: number;
    ema12?: number;
    ema26?: number;
};

const getLastValue = (values: { value: number }[]) => values.at(-1)?.value;

const buildTechnicalSignal = (
    closePrice: number | undefined,
    candles: Array<{ time: number; open: number; high: number; low: number; close: number }>,
): TechnicalSignal | null => {
    if (!Number.isFinite(closePrice) || candles.length < 60) return null;

    const sma20 = getLastValue(calculateSMA(candles, 20));
    const sma50 = getLastValue(calculateSMA(candles, 50));
    const ema12 = getLastValue(calculateEMA(candles, 12));
    const ema26 = getLastValue(calculateEMA(candles, 26));
    const rsi = getLastValue(calculateRSI(candles, 14));

    if (![sma20, sma50, ema12, ema26, rsi].every(Number.isFinite)) return null;

    const reasons: string[] = [];
    let score = 0;

    if (sma20! > sma50!) {
        score += 1;
        reasons.push('SMA20, SMA50 ustunde; orta vadeli trend pozitif.');
    } else {
        score -= 1;
        reasons.push('SMA20, SMA50 altinda; orta vadeli trend zayif.');
    }

    if (ema12! > ema26!) {
        score += 1;
        reasons.push('EMA12, EMA26 ustunde; kisa vadeli momentum destekliyor.');
    } else {
        score -= 1;
        reasons.push('EMA12, EMA26 altinda; kisa vadeli momentum baskili.');
    }

    if (closePrice! > sma20!) {
        score += 1;
        reasons.push('Fiyat, SMA20 ustunde kapaniyor.');
    } else {
        score -= 1;
        reasons.push('Fiyat, SMA20 altinda kaliyor.');
    }

    if (closePrice! > ema12!) {
        score += 1;
        reasons.push('Fiyat, EMA12 ustunde; alicilar halen aktif.');
    } else {
        score -= 1;
        reasons.push('Fiyat, EMA12 altinda; satis baskisi daha guclu.');
    }

    if (rsi! >= 70) {
        score -= 1;
        reasons.push(`RSI ${rsi!.toFixed(1)} ile asiri alima yakin.`);
    } else if (rsi! >= 55) {
        score += 1;
        reasons.push(`RSI ${rsi!.toFixed(1)} ile momentum pozitif bolgede.`);
    } else if (rsi! <= 30) {
        score += 1;
        reasons.push(`RSI ${rsi!.toFixed(1)} ile asiri satimdan tepki potansiyeli var.`);
    } else if (rsi! <= 45) {
        score -= 1;
        reasons.push(`RSI ${rsi!.toFixed(1)} ile momentum zayif tarafta.`);
    } else {
        reasons.push(`RSI ${rsi!.toFixed(1)} ile notr bolgede.`);
    }

    let label: TechnicalSignal['label'] = 'Notr';
    let color = '#94a3b8';
    let summary = 'Teknik gorunum dengeli, net bir yon teyidi yok.';

    if (score >= 4) {
        label = 'Guclu Al';
        color = '#10b981';
        summary = 'Trend ve momentum ayni yone bakiyor; teknik gorunum guclu.';
    } else if (score >= 2) {
        label = 'Al';
        color = '#22c55e';
        summary = 'Trend lehine sinyaller agir basiyor ama teyit halen onemli.';
    } else if (score <= -4) {
        label = 'Guclu Sat';
        color = '#ef4444';
        summary = 'Momentum ve ortalamalar belirgin sekilde negatif tarafta.';
    } else if (score <= -2) {
        label = 'Sat';
        color = '#f97316';
        summary = 'Teknik gorunum zayif, yukari donus teyidi beklemek daha saglikli.';
    }

    const meterPercent = Math.max(0, Math.min(100, ((score + 5) / 10) * 100));

    return {
        label,
        color,
        score,
        meterPercent,
        summary,
        reasons: reasons.slice(0, 4),
        rsi,
        sma20,
        sma50,
        ema12,
        ema26,
    };
};

const SignalGauge = ({ percent, color }: { percent: number; color: string }) => {
    const angle = -90 + (180 * percent) / 100;
    return (
        <div style={{ width: 200, margin: '0 auto' }}>
            <div style={{ position: 'relative', width: 200, height: 110, overflow: 'hidden' }}>
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '200px 200px 0 0',
                        background: 'conic-gradient(from 180deg, #dc2626 0deg, #f97316 40deg, #facc15 75deg, #86efac 120deg, #16a34a 180deg)',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        left: 22,
                        right: 22,
                        top: 22,
                        bottom: -58,
                        borderRadius: '999px',
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        left: '50%',
                        bottom: 12,
                        width: 3,
                        height: 74,
                        borderRadius: 999,
                        background: color,
                        transformOrigin: 'bottom center',
                        transform: `translateX(-50%) rotate(${angle}deg)`,
                        boxShadow: `0 0 16px ${color}55`,
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        left: '50%',
                        bottom: 6,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: 'hsl(var(--foreground))',
                        transform: 'translateX(-50%)',
                    }}
                />
            </div>
        </div>
    );
};

/* ════════════════════════════════════════
   Instrument Detail Page
   ════════════════════════════════════════ */

const InstrumentDetailPage = () => {
    const { symbol } = useParams<{ symbol: string }>();
    const navigate = useNavigate();
    const [purchaseDate, setPurchaseDate] = useState(() => {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() - 30);
        return defaultDate.toISOString().slice(0, 10);
    });
    const [quantity, setQuantity] = useState('1');
    const [displayCurrency, setDisplayCurrency] = useState('');

    const { data: fetchedInstrument, isLoading: loading } = useQuery({
        queryKey: ['instrument-detail', symbol],
        queryFn: () => getInstrumentBySymbol(symbol!),
        enabled: !!symbol,
        staleTime: 1000 * 60 * 15,
        gcTime: 1000 * 60 * 45,
    });

    const instrument: MarketInstrument | null = useMemo(() => {
        return fetchedInstrument ? normalizeInstrument(fetchedInstrument) : null;
    }, [fetchedInstrument]);
    const selectedDisplayCurrency = displayCurrency || instrument?.baseCurrency || 'USD';

    /* News topic from instrument type */
    const newsTopic = instrument ? typeToNewsTopic[instrument.type] ?? undefined : undefined;
    const newsCountry = instrument ? countryToNewsCountry(instrument.market) : undefined;

    const parsedQuantity = Number(quantity);

    const {
        data: hypotheticalReturn,
        isLoading: hypotheticalLoading,
        isError: hypotheticalError,
    } = useQuery({
        queryKey: ['hypothetical-return', symbol, purchaseDate, quantity, selectedDisplayCurrency],
        queryFn: () => getHypotheticalReturn(symbol!, purchaseDate, parsedQuantity, selectedDisplayCurrency),
        enabled: !!symbol && !!purchaseDate && Number.isFinite(parsedQuantity) && parsedQuantity > 0,
        staleTime: 0,
    });

    const { data: technicalCandles = [], isLoading: technicalLoading } = useQuery({
        queryKey: ['instrument-technical-signal', symbol],
        queryFn: () => getCandleData(symbol!, 'D1', oneYearAgoIso()),
        enabled: !!symbol,
        staleTime: 1000 * 60 * 10,
    });

    /* Fetch all news (by topic) and filter by instrument symbol on frontend */
    const { data: allNews = [], isLoading: newsLoading } = useQuery({
        queryKey: ['news', newsTopic ?? 'all', newsCountry ?? 'all'],
        queryFn: () => getNews(newsTopic, newsCountry),
        staleTime: 1000 * 60 * 3,
        enabled: !!symbol,
    });

    /* Prefer exact instrument matches; fall back to same country/category news. */
    const { relatedNews, hasExactNews } = useMemo(() => {
        if (!symbol || allNews.length === 0) return { relatedNews: [], hasExactNews: false };

        const target = instrument ?? { symbol };
        const exact = allNews
            .filter(article => articleMatchesInstrument(article, target))
            .slice(0, 9);
        if (exact.length > 0) return { relatedNews: exact, hasExactNews: true };

        return { relatedNews: allNews.slice(0, 9), hasExactNews: false };
    }, [allNews, instrument, symbol]);

    const technicalSignal = useMemo(
        () => buildTechnicalSignal(instrument?.currentPrice, technicalCandles),
        [instrument?.currentPrice, technicalCandles],
    );

    if (!symbol) {
        navigate('/market');
        return null;
    }

    const hasChangeValue = instrument ? hasChange(instrument) : false;
    const isPositive = hasChangeValue && (instrument?.change24h ?? 0) >= 0;
    const changeColor = !hasChangeValue ? 'hsl(var(--muted-foreground))' : isPositive ? '#10b981' : '#ef4444';
    const ChangIcon = isPositive ? TrendingUp : TrendingDown;
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
                        color: 'hsl(var(--muted-foreground))',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px 10px 6px 6px',
                        borderRadius: 8,
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--foreground))'; e.currentTarget.style.background = 'hsl(var(--border-subtle))'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--muted-foreground))'; e.currentTarget.style.background = 'none'; }}
                >
                    <ArrowLeft size={15} /> Geri
                </button>
                <span style={{ color: 'hsl(var(--ghost-foreground))', fontSize: 13 }}>/</span>
                <span style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>Piyasalar</span>
                <span style={{ color: 'hsl(var(--ghost-foreground))', fontSize: 13 }}>/</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))' }}>{symbol}</span>
            </div>

            {/* ─── Instrument Header ─── */}
            <div style={{
                background: 'hsl(var(--card))',
                borderRadius: 16,
                padding: '28px 32px',
                border: '1px solid hsl(var(--border))',
                boxShadow: `0 0 0 1px hsl(var(--border-subtle)), 0 4px 32px rgba(0,0,0,0.3)`,
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
                                    <div style={{ fontSize: 22, fontWeight: 800, color: 'hsl(var(--foreground))', letterSpacing: '-0.5px' }}>
                                        {symbol}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginTop: 1 }}>
                                        {instrument?.name ?? '—'}
                                    </div>
                                </div>

                            </div>

                            {/* Price */}
                            <div style={{
                                fontSize: 36,
                                fontWeight: 800,
                                color: 'hsl(var(--foreground))',
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
                                        background: !hasChangeValue ? 'rgba(148,163,184,0.1)' : isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                        color: changeColor,
                                    }}>
                                        <ChangIcon size={13} />
                                        {formatChangePercent(instrument.change24h)}
                                    </span>
                                    <span style={{ fontSize: 12, color: 'hsl(var(--subtle-foreground))' }}>24 saatlik değişim</span>
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
                                    value={!hasChangeValue ? 'Veri yok' : isPositive ? 'Yükselişte' : 'Düşüşte'}
                                    highlight={changeColor}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div
                style={{
                    background: 'hsl(var(--card))',
                    borderRadius: 14,
                    border: '1px solid hsl(var(--border))',
                    padding: 20,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Gauge size={14} style={{ color: '#6366f1' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--foreground))' }}>
                        Teknik Sinyal
                    </span>
                    {technicalLoading && <RefreshCw size={12} style={{ color: 'hsl(var(--subtle-foreground))', animation: 'spin 1s linear infinite' }} />}
                </div>

                {!technicalLoading && !technicalSignal && (
                    <div className="rounded-md border border-border bg-background/60 px-4 py-5 text-[13px] text-meta">
                        Bu sinyal icin yeterli mum verisi bulunamadi. En azindan son 50-60 kapanis kaydina ihtiyacimiz var.
                    </div>
                )}

                {technicalSignal && (
                    <div className="grid grid-cols-1 xl:grid-cols-[240px,1fr,260px] gap-6 items-center">
                        <div style={{ textAlign: 'center' }}>
                            <SignalGauge percent={technicalSignal.meterPercent} color={technicalSignal.color} />
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '6px 12px',
                                    borderRadius: 999,
                                    background: `${technicalSignal.color}18`,
                                    color: technicalSignal.color,
                                    fontSize: 18,
                                    fontWeight: 800,
                                    marginTop: 6,
                                }}
                            >
                                <Sparkles size={16} />
                                {technicalSignal.label}
                            </div>
                            <p style={{ marginTop: 8, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                                Skor {technicalSignal.score > 0 ? '+' : ''}{technicalSignal.score} / 5
                            </p>
                        </div>

                        <div>
                            <p style={{ fontSize: 15, fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: 6 }}>
                                {technicalSignal.summary}
                            </p>
                            <div style={{ display: 'grid', gap: 8 }}>
                                {technicalSignal.reasons.map((reason) => (
                                    <div
                                        key={reason}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 8,
                                            fontSize: 13,
                                            color: 'hsl(var(--muted-foreground))',
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: 7,
                                                height: 7,
                                                borderRadius: '50%',
                                                background: technicalSignal.color,
                                                marginTop: 6,
                                                flexShrink: 0,
                                            }}
                                        />
                                        <span>{reason}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                            <StatPill label="RSI 14" value={technicalSignal.rsi?.toFixed(1) ?? '—'} highlight={technicalSignal.color} />
                            <StatPill label="SMA 20" value={technicalSignal.sma20 ? formatMarketPrice(technicalSignal.sma20, instrument?.baseCurrency) : '—'} />
                            <StatPill label="SMA 50" value={technicalSignal.sma50 ? formatMarketPrice(technicalSignal.sma50, instrument?.baseCurrency) : '—'} />
                            <StatPill label="EMA 12" value={technicalSignal.ema12 ? formatMarketPrice(technicalSignal.ema12, instrument?.baseCurrency) : '—'} />
                            <StatPill label="EMA 26" value={technicalSignal.ema26 ? formatMarketPrice(technicalSignal.ema26, instrument?.baseCurrency) : '—'} />
                            <StatPill label="Baz" value="SMA / EMA / RSI" />
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Chart + Trade Widget ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Chart */}
                <div
                    className="lg:col-span-3"
                    style={{
                        background: 'hsl(var(--card))',
                        borderRadius: 14,
                        border: '1px solid hsl(var(--border))',
                        padding: 20,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <Activity size={14} style={{ color: '#6366f1' }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--foreground))' }}>Fiyat Grafiği</span>
                        {loading && <RefreshCw size={12} style={{ color: 'hsl(var(--subtle-foreground))', animation: 'spin 1s linear infinite' }} />}
                    </div>
                    <CandlestickChart symbol={symbol} defaultSlot="D1" defaultRange="1A" baseCurrency={instrument?.baseCurrency} />
                </div>

                {/* Trade Widget */}
                <div className="lg:col-span-1">
                    <div style={{ position: 'sticky', top: 72 }}>
                        <TradeWidget
                            symbol={symbol}
                            instrumentName={instrument?.name}
                            currentPrice={instrument?.currentPrice ?? 0}
                            baseCurrency={instrument?.baseCurrency}
                        />
                    </div>
                </div>
            </div>

            <div
                style={{
                    background: 'hsl(var(--card))',
                    borderRadius: 14,
                    border: '1px solid hsl(var(--border))',
                    padding: 20,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Calculator size={14} style={{ color: '#6366f1' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--foreground))' }}>
                        Tarihe Gore Getiri Analizi
                    </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>Alim Tarihi</span>
                        <input
                            type="date"
                            value={purchaseDate}
                            onChange={(event) => setPurchaseDate(event.target.value)}
                            max={new Date().toISOString().slice(0, 10)}
                            className="h-10 bg-background border border-border rounded px-3 text-[13px] text-foreground"
                        />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>Miktar</span>
                        <input
                            type="number"
                            min="0.0001"
                            step="0.0001"
                            value={quantity}
                            onChange={(event) => setQuantity(event.target.value)}
                            className="h-10 bg-background border border-border rounded px-3 text-[13px] text-foreground"
                        />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>Gosterim Para Birimi</span>
                        <select
                            value={selectedDisplayCurrency}
                            onChange={(event) => setDisplayCurrency(event.target.value)}
                            className="h-10 bg-background border border-border rounded px-3 text-[13px] text-foreground"
                        >
                            {Array.from(new Set([instrument?.baseCurrency || 'USD', 'TRY', 'USD'])).map((currency) => (
                                <option key={currency} value={currency}>{currency}</option>
                            ))}
                        </select>
                    </label>
                </div>

                {hypotheticalLoading && (
                    <div className="flex items-center justify-center h-28 text-meta">
                        <RefreshCw size={14} className="animate-spin mr-2 text-primary" />
                        Hesaplaniyor...
                    </div>
                )}

                {!hypotheticalLoading && hypotheticalError && (
                    <div className="rounded-md border border-border bg-background/60 px-4 py-5 text-[13px] text-meta">
                        Secilen tarih icin yeterli veri bulunamadi. Bir sonraki islem gununu deneyebilir veya daha yeni bir tarih secebilirsin.
                    </div>
                )}

                {!hypotheticalLoading && !hypotheticalError && hypotheticalReturn && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                            <StatPill label="Alim Fiyati" value={formatMarketPrice(hypotheticalReturn.purchasePrice, hypotheticalReturn.displayCurrency)} />
                            <StatPill label="Guncel Fiyat" value={formatMarketPrice(hypotheticalReturn.currentPrice, hypotheticalReturn.displayCurrency)} />
                            <StatPill label="Maliyet" value={formatMarketPrice(hypotheticalReturn.costValue, hypotheticalReturn.displayCurrency)} />
                            <StatPill label="Guncel Deger" value={formatMarketPrice(hypotheticalReturn.currentValue, hypotheticalReturn.displayCurrency)} />
                            <StatPill
                                label="Kar / Zarar"
                                value={formatMarketPrice(hypotheticalReturn.profitLoss, hypotheticalReturn.displayCurrency)}
                                highlight={(hypotheticalReturn.profitLoss ?? 0) >= 0 ? '#10b981' : '#ef4444'}
                            />
                            <StatPill
                                label="Getiri"
                                value={hypotheticalReturn.profitLossPercent == null ? '—' : formatChangePercent(hypotheticalReturn.profitLossPercent)}
                                highlight={(hypotheticalReturn.profitLossPercent ?? 0) >= 0 ? '#10b981' : '#ef4444'}
                            />
                        </div>

                        <p style={{ marginTop: 16, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                            Secilen tarih icin ilk uygun fiyat kaydi{' '}
                            <strong style={{ color: 'hsl(var(--foreground))' }}>
                                {new Date(hypotheticalReturn.executedAt).toLocaleString('tr-TR')}
                            </strong>{' '}
                            zamanindan alindi.
                        </p>
                    </>
                )}
            </div>

            {/* ─── Related News — filtered by instrument symbol ─── */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Newspaper size={15} style={{ color: '#6366f1' }} />
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'hsl(var(--foreground))' }}>İlgili Haberler</span>
                    {newsTopic && (
                        <span style={{
                            fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                            letterSpacing: 0.5, padding: '2px 8px', borderRadius: 4,
                            background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                        }}>
                            {TOPIC_LABELS[newsTopic] || newsTopic}
                        </span>
                    )}
                    {!newsLoading && relatedNews.length > 0 && !hasExactNews && (
                        <span style={{
                            fontSize: 10, fontWeight: 600,
                            letterSpacing: 0.2, padding: '2px 8px', borderRadius: 4,
                            background: 'hsl(var(--background-subtle))', color: 'hsl(var(--muted-foreground))',
                        }}>
                            Piyasa haberleri
                        </span>
                    )}
                    <a
                        href="/news"
                        style={{
                            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 12, fontWeight: 500, color: 'hsl(var(--muted-foreground))', textDecoration: 'none',
                            transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--foreground))'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--muted-foreground))'; }}
                    >
                        Tüm haberler <ExternalLink size={11} />
                    </a>
                </div>

                {/* News loading skeleton */}
                {newsLoading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="animate-pulse" style={{
                                background: 'hsl(var(--card))', borderRadius: 12, padding: 16,
                                border: '1px solid hsl(var(--border-subtle))',
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
                            const category = normalizeNewsCategory(article);
                            const sourceBadgeColor = article.source?.name ? getSourceColor(article.source.name) : 'hsl(var(--muted-foreground))';
                            return (
                                <Link
                                    key={`${article.url}-${idx}`}
                                    to={buildNewsDetailPath(article.url)}
                                    state={{ article }}
                                    className="group"
                                    style={{
                                        display: 'flex', gap: 14, background: 'hsl(var(--card))', borderRadius: 12, padding: 16,
                                        border: '1px solid hsl(var(--border-subtle))', transition: 'all 0.2s', textDecoration: 'none',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = 'hsl(var(--border))';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = 'hsl(var(--border-subtle))';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <img
                                        src={resolveNewsImage(article.urlToImage, article.source?.name, article.category)} alt={article.title}
                                        style={{ width: 68, height: 68, objectFit: 'cover', borderRadius: 8, background: 'hsl(var(--background))', flexShrink: 0 }}
                                        onError={e => { (e.target as HTMLImageElement).src = resolveNewsImage(undefined, article.source?.name, article.category); }}
                                    />
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                        <h4 style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))', lineHeight: 1.4, marginBottom: 6 }} className="line-clamp-2">
                                            {article.title}
                                        </h4>

                                        {/* Instrument tags */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
                                            <span
                                                style={{
                                                    padding: '1px 5px', fontSize: 9, fontWeight: 600, borderRadius: 3,
                                                    background: 'rgba(99,102,241,0.12)',
                                                    color: '#818cf8',
                                                    border: '1px solid rgba(99,102,241,0.2)',
                                                    lineHeight: '16px', letterSpacing: '0.2px',
                                                }}
                                            >
                                                {TOPIC_LABELS[category] || category}
                                            </span>
                                            {articleInstruments.length > 0 && (
                                                <>
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
                                                </>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                                            <span style={{ fontSize: 10, fontWeight: 600, color: sourceBadgeColor, textTransform: 'uppercase' }}>
                                                {article.source?.name || ''}
                                            </span>
                                            <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Clock size={10} />{timeAgo(article.publishedAt)}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InstrumentDetailPage;
