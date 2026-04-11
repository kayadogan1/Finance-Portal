import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, TrendingUp, BarChart2 } from 'lucide-react';
import { getMarketInstruments, type MarketInstrument } from '../services/marketService';
import './LandingPage.css';

/* ─── Ticker Strip ─── */
const TickerStrip = ({ instruments }: { instruments: MarketInstrument[] }) => {
    if (!instruments.length) return null;

    // Duplicate for seamless infinite scroll
    const doubled = [...instruments, ...instruments];

    return (
        <div className="ticker-strip">
            <div className="ticker-track">
                {doubled.map((inst, idx) => {
                    const isPositive = (inst.change24h ?? 0) >= 0;
                    return (
                        <div key={`${inst.symbol}-${idx}`} className="ticker-item">
                            <span className="ticker-symbol">{inst.symbol}</span>
                            <span className="ticker-price">
                                {(inst.currentPrice ?? 0).toLocaleString('tr-TR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                            <span className={`ticker-change ${isPositive ? 'positive' : 'negative'}`}>
                                {isPositive ? '+' : ''}
                                {(inst.change24h ?? 0).toFixed(2)}%
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
        desc: 'Kripto, döviz, emtia ve endeksleri anlık izle',
    },
    {
        name: 'Yapay Zeka Analizi',
        desc: 'Yapay zeka destekli piyasa içgörüleri',
    },
    {
        name: 'Finansal Haberler',
        desc: 'Küresel piyasa haberlerini takip et',
    },
] as const;

const STATS = [
    { value: '50+', label: 'Varlık' },
    { value: 'Gerçek Zamanlı', label: 'Fiyatlar' },
    { value: 'Yapay Zeka', label: 'Analiz' },
] as const;

/* ─── Landing Page ─── */
const LandingPage = () => {
    const { data: instruments = [] } = useQuery({
        queryKey: ['market-instruments'],
        queryFn: getMarketInstruments,
    });

    return (
        <div className="landing-hero">
            <div className="landing-content">
                {/* ─── Nav ─── */}
                <nav className="landing-nav">
                    <Link to="/" className="landing-logo">
                        <Activity size={28} />
                        <span>Finans Portalı</span>
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
                        <span className="gradient-text">Akıllıca Karar Ver.</span>
                    </h1>
                    <p className="hero-sub">
                        Kripto, hisse, döviz ve emtiayı tek platformda gerçek zamanlı izle.
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
                    {STATS.map((s) => (
                        <div key={s.label} className="stat-item">
                            <span className="stat-value">{s.value}</span>
                            <span className="stat-label">{s.label}</span>
                        </div>
                    ))}
                </div>

                {/* ─── Features ─── */}
                <section className="features-section">
                    <p className="features-title">Neden Finans Portalı?</p>
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

                {/* ─── Footer ─── */}
                <div className="bottom-footer">
                    Yahoo Finance ve Binance API üzerinden Spring Boot ile sunulmaktadır
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
