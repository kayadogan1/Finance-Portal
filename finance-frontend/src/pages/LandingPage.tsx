import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, TrendingUp, BarChart2 } from 'lucide-react';
import { formatChangePercent, getMarketInstruments, hasChange, type MarketInstrument } from '../services/marketService';
import { formatMarketPrice } from '../utils/currency';
import './LandingPage.css';

/* ─── Ticker Strip ─── */
const TickerStrip = ({ instruments }: { instruments: MarketInstrument[] }) => {
    if (!instruments.length) return null;

    // Duplicate for seamless infinite scroll
    const doubled = [...instruments, ...instruments];
    const tickerStyle = {
        '--ticker-duration': `${Math.max(360, instruments.length * 6)}s`,
    } as CSSProperties;

    return (
        <div className="ticker-strip">
            <div className="ticker-track" style={tickerStyle}>
                {doubled.map((inst, idx) => {
                    const hasChangeValue = hasChange(inst);
                    const isPositive = hasChangeValue && inst.change24h >= 0;
                    return (
                        <div key={`${inst.symbol}-${idx}`} className="ticker-item">
                            <span className="ticker-symbol">{inst.symbol}</span>
                            <span className="ticker-price">
                                {formatMarketPrice(inst.currentPrice ?? 0, inst.baseCurrency)}
                            </span>
                            <span className={`ticker-change ${!hasChangeValue ? 'neutral' : isPositive ? 'positive' : 'negative'}`}>
                                {formatChangePercent(inst.change24h)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/* ─── Feature data ─── */
const FEATURES = [
    {
        name: 'Piyasa Takibi',
        desc: 'NASDAQ, NYSE, BIST, VİOP, fon, tahvil ve diğer piyasa enstrümanlarını takip edin.',
    },
    {
        name: 'Geniş Enstrüman Kapsamı',
        desc: 'Döviz, emtia, kripto, endeks ve hisse verilerini tek ekranda karşılaştırın.',
    },
    {
        name: 'Finansal Haberler',
        desc: 'Türkiye ve ABD piyasalarına ait haberlere kategori ve enstrüman bazında ulaşın.',
    },
] as const;

/* ─── Landing Page ─── */
const LandingPage = () => {
    const { data: instruments = [] } = useQuery({
        queryKey: ['market-instruments'],
        queryFn: getMarketInstruments,
    });

    const stats = [
        { value: instruments.length ? instruments.length.toLocaleString('tr-TR') : 'Çoklu', label: 'Enstrüman' },
        { value: 'TR & ABD', label: 'Piyasa Ayrımı' },
        { value: 'TRY / USD', label: 'Para Birimi' },
    ] as const;

    return (
        <div className="landing-hero">
            <div className="landing-content">
                {/* ─── Nav ─── */}
                <nav className="landing-nav">
                    <Link to="/" className="landing-logo">
                        <Activity size={28} />
                        <span>TradeChart</span>
                    </Link>
                    <div className="landing-nav-actions">
                        <Link to="/market" className="btn-landing-secondary" style={{ height: 38, padding: '0 18px', fontSize: 13 }}>
                            <TrendingUp size={14} />
                            Piyasalar
                        </Link>
                        <Link to="/dashboard" className="btn-landing-primary" style={{ height: 38, padding: '0 18px', fontSize: 13 }}>
                            <BarChart2 size={14} />
                            Genel Bakış
                        </Link>
                    </div>
                </nav>

                {/* ─── Hero ─── */}
                <div className="hero-center">
                    <div className="hero-badge">
                        <span className="badge-dot" />
                        Piyasalar Canlı
                    </div>
                    <h1 className="hero-title">
                        Piyasaları Takip Et.{' '}
                        <span className="gradient-text">Piyasayı Net Gör.</span>
                    </h1>
                    <p className="hero-sub">
                        NASDAQ, NYSE ve diğer ABD piyasaları ile BIST, VİOP, fon, tahvil ve Türkiye piyasalarındaki enstrümanları tek platformda izleyin.
                    </p>
                    <div className="hero-actions">
                        <Link to="/market" className="btn-landing-primary">
                            Piyasalara Git
                            <ArrowRight size={16} />
                        </Link>
                        <Link to="/dashboard" className="btn-landing-secondary">
                            Genel Bakışa Git
                        </Link>
                    </div>
                </div>

                {/* ─── Ticker ─── */}
                <TickerStrip instruments={instruments} />

                {/* ─── Stats ─── */}
                <div className="stats-row">
                    {stats.map((s) => (
                        <div key={s.label} className="stat-item">
                            <span className="stat-value">{s.value}</span>
                            <span className="stat-label">{s.label}</span>
                        </div>
                    ))}
                </div>

                {/* ─── Features ─── */}
                <section className="features-section">
                    <p className="features-title">Neden TradeChart?</p>
                    <div className="features-grid">
                        {FEATURES.map((f) => (
                            <div key={f.name} className="feature-card">

                                <h3 className="feature-name">{f.name}</h3>
                                <p className="feature-desc">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ─── Bottom CTA ─── */}
                <div className="bottom-cta">
                    <h2 className="bottom-cta-title">Hemen Başla</h2>
                    <Link to="/dashboard" className="btn-landing-primary">
                        Genel Bakışa Git
                        <ArrowRight size={16} />
                    </Link>
                </div>

            </div>
        </div>
    );
};

export default LandingPage;
