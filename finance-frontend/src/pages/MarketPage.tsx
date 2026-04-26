import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MapPin, Globe2, Search, ChevronLeft, ChevronRight, Star, ArrowUpRight } from 'lucide-react';
import { getMarketInstruments, getMarketInstrumentsPaged, type MarketInstrument } from '../services/marketService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMarketPrice, isTRCurrency, isUSCurrency } from '../utils/currency';
import { useFavorites } from '../hooks/useFavorites';

/* ─── Region filtering ─── */
const belongsToRegion = (inst: MarketInstrument, region: 'TR' | 'US'): boolean => {
    /* Crypto is global — show in both regions */
    if (inst.type === 'CRYPTO') return true;

    /* Turkish assets: TRY currency OR BIST symbols (.IS suffix, XU prefix) */
    const isTurkish = isTRCurrency(inst.baseCurrency) ||
        inst.symbol.endsWith('.IS') ||
        inst.symbol.startsWith('XU');

    /* US/Global assets: USD-based that are NOT Turkish */
    const isUS = !isTurkish && (isUSCurrency(inst.baseCurrency) || inst.symbol === 'DXY');

    if (region === 'TR') return isTurkish;
    if (region === 'US') return isUS;
    return true;
};

const PAGE_SIZE = 20;

/* ─── Skeleton row ─── */
const SkeletonRow = () => (
    <div className="animate-pulse flex items-center gap-3 px-4" style={{ height: 44, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ width: 14 }} />
        <div style={{ height: 12, width: 52, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }} />
        <div style={{ flex: 1 }} />
        <div style={{ height: 12, width: 72, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }} />
        <div style={{ height: 12, width: 56, background: 'rgba(255,255,255,0.03)', borderRadius: 3 }} />
    </div>
);

/* ─── Instrument Row ─── */
const InstrumentRow = ({
    inst, onNavigate, formatPrice
}: {
    inst: MarketInstrument;
    onNavigate: (symbol: string) => void;
    formatPrice: (price: number, baseCurrency: string) => string;
}) => {
    const { isFavorite, toggleFavorite } = useFavorites();
    const isPositive = (inst.change24h ?? 0) >= 0;
    const fav = isFavorite(inst.symbol);

    return (
        <div
            onClick={() => onNavigate(inst.symbol)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                height: 46,
                padding: '0 16px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
            {/* Fav star */}
            <button
                onClick={e => { e.stopPropagation(); toggleFavorite(inst.symbol); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px 0 0', display: 'flex', alignItems: 'center' }}
            >
                <Star size={12} fill={fav ? '#eab308' : 'none'} color={fav ? '#eab308' : '#334155'} style={{ transition: 'all 0.15s' }} />
            </button>

            {/* Symbol + change indicator */}
            <div style={{ width: 96, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                    width: 3, height: 14, borderRadius: 1, flexShrink: 0,
                    background: isPositive ? '#10b981' : '#ef4444',
                }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.2px' }}>
                    {inst.symbol}
                </span>
            </div>

            {/* Name */}
            <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                <span style={{
                    fontSize: 12, color: '#64748b',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block',
                }}>
                    {inst.name}
                </span>
            </div>

            {/* Type badge */}
            <div style={{ width: 64, flexShrink: 0, textAlign: 'center' }}>
                <span style={{
                    fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
                    padding: '2px 6px', borderRadius: 3,
                    background: 'rgba(255,255,255,0.04)', color: '#475569',
                }}>
                    {inst.type}
                </span>
            </div>

            {/* Price */}
            <div style={{ width: 120, flexShrink: 0, textAlign: 'right' }}>
                <span style={{
                    fontSize: 13, fontWeight: 600, color: '#f1f5f9',
                    fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.2px',
                }}>
                    {formatPrice(inst.currentPrice ?? 0, inst.baseCurrency)}
                </span>
            </div>

            {/* Change % */}
            <div style={{ width: 80, flexShrink: 0, textAlign: 'right' }}>
                <span style={{
                    fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                    padding: '2px 8px', borderRadius: 4,
                    background: isPositive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    color: isPositive ? '#10b981' : '#ef4444',
                }}>
                    {isPositive ? '+' : ''}{(inst.change24h ?? 0).toFixed(2)}%
                </span>
            </div>

            {/* Arrow hint */}
            <div style={{ width: 28, flexShrink: 0, textAlign: 'right', paddingLeft: 8 }}>
                <ArrowUpRight size={12} style={{ color: '#334155' }} />
            </div>
        </div>
    );
};

/* ─── Instrument List Panel ─── */
function InstrumentList({
    instruments, isLoading, page, totalPages, totalElements, onPageChange, formatPrice, onNavigate,
}: {
    instruments: MarketInstrument[];
    isLoading: boolean;
    page?: number;
    totalPages?: number;
    totalElements?: number;
    onPageChange?: (p: number) => void;
    formatPrice: (price: number, cur: string) => string;
    onNavigate: (symbol: string) => void;
}) {
    const [search, setSearch] = useState('');
    const hasPagination = totalPages !== undefined && totalPages > 1 && onPageChange !== undefined;

    const processed = useMemo(() => {
        if (!search.trim()) return instruments;
        const q = search.toLowerCase();
        return instruments.filter(i => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q));
    }, [instruments, search]);

    const pageNumbers = useMemo(() => {
        if (!hasPagination || totalPages === undefined || page === undefined) return [];
        const pages: number[] = [];
        const maxVisible = 5;
        let start = Math.max(0, page - Math.floor(maxVisible / 2));
        const end = Math.min(totalPages, start + maxVisible);
        if (end - start < maxVisible) start = Math.max(0, end - maxVisible);
        for (let i = start; i < end; i++) pages.push(i);
        return pages;
    }, [page, totalPages, hasPagination]);

    const paginationBtnStyle = (active: boolean, disabled?: boolean): React.CSSProperties => ({
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 32, height: 32, padding: '0 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
        border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
        background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
        color: disabled ? '#334155' : active ? '#818cf8' : '#94a3b8',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', pointerEvents: disabled ? 'none' : 'auto',
    });

    if (isLoading) {
        return (
            <div style={{ background: '#111118', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="animate-pulse" style={{ height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.03)', maxWidth: 280 }} />
                </div>
                {Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
        );
    }

    if (!instruments.length) {
        return <div style={{ textAlign: 'center', padding: 48, fontSize: 13, color: '#64748b' }}>Bu kategoride enstrüman bulunamadı.</div>;
    }

    return (
        <div style={{ background: '#111118', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            {/* Search + count */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ position: 'relative', width: 280 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Sembol veya isim ara..."
                        style={{
                            width: '100%', height: 32, paddingLeft: 32, paddingRight: 10, fontSize: 12, fontWeight: 500,
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6,
                            color: '#f1f5f9', outline: 'none', transition: 'border-color 0.15s',
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    />
                </div>
                <span style={{ fontSize: 11, color: '#475569' }}>
                    {processed.length} enstrüman — Detaylar için tıklayın
                </span>
            </div>

            {/* Table header */}
            <div style={{
                display: 'flex', alignItems: 'center', height: 32, padding: '0 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.015)',
            }}>
                <div style={{ width: 20 }} />
                <div style={{ width: 96, fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Sembol</div>
                <div style={{ flex: 1, fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Ad</div>
                <div style={{ width: 64, fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>Tip</div>
                <div style={{ width: 120, fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Fiyat</div>
                <div style={{ width: 80, fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Değişim</div>
                <div style={{ width: 28 }} />
            </div>

            {/* Rows */}
            <div>
                {processed.map(inst => (
                    <InstrumentRow
                        key={inst.symbol}
                        inst={inst}
                        onNavigate={onNavigate}
                        formatPrice={formatPrice}
                    />
                ))}
            </div>

            {/* Pagination */}
            {hasPagination && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                        Toplam {totalElements ?? 0} enstrüman
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button style={paginationBtnStyle(false, page === 0)} onClick={() => page !== undefined && page > 0 && onPageChange!(page - 1)}>
                            <ChevronLeft size={14} />
                        </button>
                        {pageNumbers[0] > 0 && (
                            <>
                                <button style={paginationBtnStyle(page === 0)} onClick={() => onPageChange!(0)}>1</button>
                                {pageNumbers[0] > 1 && <span style={{ color: '#475569', fontSize: 12, padding: '0 4px' }}>…</span>}
                            </>
                        )}
                        {pageNumbers.map(n => (
                            <button key={n} style={paginationBtnStyle(n === page)} onClick={() => onPageChange!(n)}>{n + 1}</button>
                        ))}
                        {pageNumbers[pageNumbers.length - 1] < totalPages! - 1 && (
                            <>
                                {pageNumbers[pageNumbers.length - 1] < totalPages! - 2 && <span style={{ color: '#475569', fontSize: 12, padding: '0 4px' }}>…</span>}
                                <button style={paginationBtnStyle(page === totalPages! - 1)} onClick={() => onPageChange!(totalPages! - 1)}>{totalPages}</button>
                            </>
                        )}
                        <button style={paginationBtnStyle(false, page === totalPages! - 1)} onClick={() => page !== undefined && onPageChange!(page + 1)}>
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ════════════════════════════════════════
   Market Page
   ════════════════════════════════════════ */
const MarketPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('all');
    const [page, setPage] = useState(0);
    const [region, setRegion] = useState<'TR' | 'US'>('TR');

    const { data: pagedData, isLoading: pagedLoading } = useQuery({
        queryKey: ['market-instruments-paged', page],
        queryFn: () => getMarketInstrumentsPaged(page, PAGE_SIZE),
        enabled: activeTab === 'all',
        staleTime: 1000 * 60 * 5,
    });

    const { data: allInstruments = [], isLoading: allLoading } = useQuery({
        queryKey: ['market-instruments'],
        queryFn: getMarketInstruments,
        enabled: activeTab !== 'all',
        staleTime: 1000 * 60 * 5,
    });

    const isLoading = activeTab === 'all' ? pagedLoading : allLoading;

    // Reset page on tab change
    useEffect(() => { setPage(0); }, [activeTab]);

    const formatPrice = (price: number, baseCurrency: string) => formatMarketPrice(price, baseCurrency);

    const grouped = useMemo(() => {
        const regional = allInstruments.filter(i => belongsToRegion(i, region));
        return {
            crypto: regional.filter(i => i.type === 'CRYPTO'),
            forex: regional.filter(i => i.type === 'FIAT' || i.type === 'FOREX'),
            commodity: regional.filter(i => i.type === 'COMMODITY'),
            indices: regional.filter(i => i.type === 'INDEX'),
            stock: regional.filter(i => i.type === 'STOCK'),
            bond: regional.filter(i => i.type === 'BOND'),
            gainers: [...regional]
                .filter(i => (i.change24h ?? 0) > 0)
                .sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0))
                .slice(0, 20),
            losers: [...regional]
                .filter(i => (i.change24h ?? 0) < 0)
                .sort((a, b) => (a.change24h ?? 0) - (b.change24h ?? 0))
                .slice(0, 20),
        };
    }, [allInstruments, region]);

    const handleNavigate = (symbol: string) => {
        navigate(`/instrument/${symbol}`);
    };

    const tabCls = 'text-label pb-2 border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground';

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: 'hsl(var(--foreground))' }}>
                        Piyasalar
                    </h2>
                    <p className="text-meta mt-0.5">
                        Küresel piyasaları keşfedin — enstrüman detayları için satıra tıklayın ({region === 'TR' ? 'Türkiye' : 'ABD'})
                    </p>
                </div>

                {/* Region Toggle */}
                <div className="flex bg-[#111118] border border-border p-0.5 rounded-lg w-fit">
                    <button
                        onClick={() => setRegion('TR')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                            region === 'TR' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                    >
                        <MapPin size={12} /> TR
                    </button>
                    <button
                        onClick={() => setRegion('US')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                            region === 'US' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                    >
                        <Globe2 size={12} /> US
                    </button>
                </div>
            </div>

            {/* Tabs + Table */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="border-b border-border pb-0 mb-0" style={{ overflowX: 'auto' }}>
                    <TabsList className="bg-transparent p-0 h-auto gap-4 rounded-none" style={{ flexWrap: 'nowrap', minWidth: 'max-content' }}>
                        <TabsTrigger value="all" className={tabCls}>Tümü</TabsTrigger>
                        <TabsTrigger value="stock" className={tabCls}>Hisse</TabsTrigger>
                        <TabsTrigger value="crypto" className={tabCls}>Kripto</TabsTrigger>
                        <TabsTrigger value="forex" className={tabCls}>Döviz</TabsTrigger>
                        <TabsTrigger value="commodity" className={tabCls}>Emtia</TabsTrigger>
                        <TabsTrigger value="indices" className={tabCls}>Endeks</TabsTrigger>
                        <TabsTrigger value="bond" className={tabCls}>Tahvil</TabsTrigger>
                        <TabsTrigger value="gainers" className={tabCls} style={{ color: allLoading ? undefined : '#10b981' }}>
                            Artanlar
                        </TabsTrigger>
                        <TabsTrigger value="losers" className={tabCls} style={{ color: allLoading ? undefined : '#ef4444' }}>
                            Düşenler
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* "Tümü" tab */}
                <TabsContent value="all" className="mt-0 outline-none pt-0">
                    <InstrumentList
                        instruments={pagedData?.content ?? []}
                        isLoading={pagedLoading}
                        page={page}
                        totalPages={pagedData?.totalPages ?? 0}
                        totalElements={pagedData?.totalElements ?? 0}
                        onPageChange={setPage}
                        formatPrice={formatPrice}
                        onNavigate={handleNavigate}
                    />
                </TabsContent>

                {/* Category tabs */}
                {(['stock', 'crypto', 'forex', 'commodity', 'indices', 'bond', 'gainers', 'losers'] as const).map(key => (
                    <TabsContent key={key} value={key} className="mt-0 outline-none pt-0">
                        <InstrumentList
                            instruments={grouped[key]}
                            isLoading={allLoading}
                            formatPrice={formatPrice}
                            onNavigate={handleNavigate}
                        />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
};

export default MarketPage;
