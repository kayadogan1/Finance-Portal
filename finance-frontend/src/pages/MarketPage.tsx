import { useState, useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MapPin, Globe2, Search, ChevronLeft, ChevronRight, Star, ArrowUpRight } from 'lucide-react';
import {
    belongsToMarket,
    formatChangePercent,
    getInstrumentBySymbol,
    getMarketInstrumentCatalog,
    hasChange,
    normalizeInstrument,
    type MarketInstrument,
} from '../services/marketService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMarketPrice } from '../utils/currency';
import { useFavorites } from '../hooks/useFavorites';

const PAGE_SIZE = 20;

type MarketTab = 'all' | 'stock' | 'crypto' | 'forex' | 'commodity' | 'indices' | 'bond' | 'gainers' | 'losers';

const MARKET_TABS: { key: MarketTab; label: string; tone?: 'up' | 'down' }[] = [
    { key: 'all', label: 'Tümü' },
    { key: 'stock', label: 'Hisse' },
    { key: 'crypto', label: 'Kripto' },
    { key: 'forex', label: 'Döviz' },
    { key: 'commodity', label: 'Emtia' },
    { key: 'indices', label: 'Endeks' },
    { key: 'bond', label: 'Tahvil' },
    { key: 'gainers', label: 'Artanlar', tone: 'up' },
    { key: 'losers', label: 'Düşenler', tone: 'down' },
];

const PINNED_US_SYMBOLS = ['AAPL', 'NVDA', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'TSLA', 'AMD', 'NFLX'];

const SEARCH_SYMBOL_ALIASES: Record<string, string> = {
    APPLE: 'AAPL',
    NVIDIA: 'NVDA',
    NVIDA: 'NVDA',
    MICROSOFT: 'MSFT',
    GOOGLE: 'GOOGL',
    ALPHABET: 'GOOGL',
    AMAZON: 'AMZN',
    META: 'META',
    FACEBOOK: 'META',
    TESLA: 'TSLA',
    NETFLIX: 'NFLX',
};

/* ─── Skeleton row ─── */
const SkeletonRow = () => (
    <div className="animate-pulse flex items-center gap-3 px-4" style={{ height: 44, borderBottom: '1px solid hsl(var(--border-subtle))' }}>
        <div style={{ width: 14 }} />
        <div style={{ height: 12, width: 52, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }} />
        <div style={{ flex: 1 }} />
        <div style={{ height: 12, width: 72, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }} />
        <div style={{ height: 12, width: 56, background: 'hsl(var(--background-subtle))', borderRadius: 3 }} />
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
    const hasChangeValue = hasChange(inst);
    const isPositive = hasChangeValue && inst.change24h >= 0;
    const fav = isFavorite(inst.symbol);

    return (
        <div
            onClick={() => onNavigate(inst.symbol)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                height: 46,
                padding: '0 12px',
                borderBottom: '1px solid hsl(var(--border-subtle))',
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
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px 0 0', display: 'flex', alignItems: 'center' }}
            >
                <Star size={12} fill={fav ? '#eab308' : 'none'} color={fav ? '#eab308' : 'hsl(var(--ghost-foreground))'} style={{ transition: 'all 0.15s' }} />
            </button>

            {/* Symbol + change indicator */}
            <div style={{ width: 68, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                    width: 3, height: 14, borderRadius: 1, flexShrink: 0,
                    background: !hasChangeValue ? 'hsl(var(--muted-foreground))' : isPositive ? '#10b981' : '#ef4444',
                }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--foreground))', letterSpacing: '-0.2px' }}>
                    {inst.symbol}
                </span>
            </div>

            {/* Name */}
            <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <span style={{
                    fontSize: 12, color: 'hsl(var(--muted-foreground))',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block',
                }}>
                    {inst.name}
                </span>
            </div>

            {/* Type badge */}
            <div style={{ width: 42, flexShrink: 0, textAlign: 'center' }}>
                <span style={{
                    fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
                    padding: '2px 6px', borderRadius: 3,
                    background: 'hsl(var(--border-subtle))', color: 'hsl(var(--subtle-foreground))',
                    display: 'inline-block', maxWidth: 40, overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle',
                }}>
                    {inst.type}
                </span>
            </div>

            {/* Price */}
            <div style={{ width: 70, flexShrink: 0, textAlign: 'right' }}>
                <span style={{
                    fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))',
                    fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.2px',
                }}>
                    {inst.hasPrice ? formatPrice(inst.currentPrice, inst.baseCurrency) : '—'}
                </span>
            </div>

            {/* Change % */}
            <div style={{ width: 64, flexShrink: 0, textAlign: 'right' }}>
                <span style={{
                    fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                    padding: '2px 4px', borderRadius: 4,
                    background: !hasChangeValue ? 'rgba(148,163,184,0.08)' : isPositive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    color: !hasChangeValue ? 'hsl(var(--muted-foreground))' : isPositive ? '#10b981' : '#ef4444',
                }}>
                    {formatChangePercent(inst.change24h)}
                </span>
            </div>

            {/* Arrow hint */}
            <div style={{ width: 0, flexShrink: 0, textAlign: 'right', overflow: 'hidden' }}>
                <ArrowUpRight size={12} style={{ color: 'hsl(var(--ghost-foreground))' }} />
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
    const hasPagination = totalPages !== undefined && totalPages > 1 && onPageChange !== undefined;
    const processed = instruments;

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
        border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid hsl(var(--border))',
        background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
        color: disabled ? 'hsl(var(--ghost-foreground))' : active ? '#818cf8' : 'hsl(var(--muted-foreground))',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', pointerEvents: disabled ? 'none' : 'auto',
    });

    if (isLoading) {
        return (
            <div style={{ background: 'hsl(var(--card))', borderRadius: 12, border: '1px solid hsl(var(--border))', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid hsl(var(--border))' }}>
                    <div className="animate-pulse" style={{ height: 32, borderRadius: 6, background: 'hsl(var(--background-subtle))', maxWidth: 280 }} />
                </div>
                {Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
        );
    }

    if (!instruments.length) {
        return (
            <div style={{
                textAlign: 'center',
                padding: 48,
                fontSize: 13,
                color: 'hsl(var(--muted-foreground))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 6,
                background: 'hsl(var(--card))',
            }}>
                Bu filtrelerle eşleşen enstrüman bulunamadı.
            </div>
        );
    }

    return (
        <div style={{ background: 'hsl(var(--card))', borderRadius: 6, border: '1px solid hsl(var(--border))', overflow: 'hidden' }}>
            {/* Search + count */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 16px', borderBottom: '1px solid hsl(var(--border))', minHeight: 42 }}>
                <span style={{ fontSize: 11, color: 'hsl(var(--subtle-foreground))' }}>
                    {processed.length} enstrüman — Detaylar için tıklayın
                </span>
            </div>

            {/* Table header */}
            <div style={{
                display: 'flex', alignItems: 'center', height: 32, padding: '0 12px',
                borderBottom: '1px solid hsl(var(--border))',
                background: 'rgba(255,255,255,0.015)',
            }}>
                <div style={{ width: 16 }} />
                <div style={{ width: 68, fontSize: 10, fontWeight: 600, color: 'hsl(var(--subtle-foreground))', textTransform: 'uppercase', letterSpacing: 0.5 }}>Sembol</div>
                <div style={{ flex: 1, fontSize: 10, fontWeight: 600, color: 'hsl(var(--subtle-foreground))', textTransform: 'uppercase', letterSpacing: 0.5 }}>Ad</div>
                <div style={{ width: 42, fontSize: 10, fontWeight: 600, color: 'hsl(var(--subtle-foreground))', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>Tip</div>
                <div style={{ width: 70, fontSize: 10, fontWeight: 600, color: 'hsl(var(--subtle-foreground))', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Fiyat</div>
                <div style={{ width: 64, fontSize: 10, fontWeight: 600, color: 'hsl(var(--subtle-foreground))', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Değişim</div>
                <div style={{ width: 0 }} />
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid hsl(var(--border))', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                        Toplam {totalElements ?? 0} enstrüman
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button style={paginationBtnStyle(false, page === 0)} onClick={() => page !== undefined && page > 0 && onPageChange!(page - 1)}>
                            <ChevronLeft size={14} />
                        </button>
                        {pageNumbers[0] > 0 && (
                            <>
                                <button style={paginationBtnStyle(page === 0)} onClick={() => onPageChange!(0)}>1</button>
                                {pageNumbers[0] > 1 && <span style={{ color: 'hsl(var(--subtle-foreground))', fontSize: 12, padding: '0 4px' }}>…</span>}
                            </>
                        )}
                        {pageNumbers.map(n => (
                            <button key={n} style={paginationBtnStyle(n === page)} onClick={() => onPageChange!(n)}>{n + 1}</button>
                        ))}
                        {pageNumbers[pageNumbers.length - 1] < totalPages! - 1 && (
                            <>
                                {pageNumbers[pageNumbers.length - 1] < totalPages! - 2 && <span style={{ color: 'hsl(var(--subtle-foreground))', fontSize: 12, padding: '0 4px' }}>…</span>}
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
    const [activeTab, setActiveTab] = useState<MarketTab>('all');
    const [page, setPage] = useState(0);
    const [region, setRegion] = useState<'TR' | 'US'>('TR');
    const [search, setSearch] = useState('');

    const { data: allInstruments = [], isLoading: allLoading } = useQuery({
        queryKey: ['market-instrument-catalog'],
        queryFn: getMarketInstrumentCatalog,
        staleTime: 1000 * 60 * 30,
        gcTime: 1000 * 60 * 60,
    });

    const pinnedQueries = useQueries({
        queries: PINNED_US_SYMBOLS.map((symbol) => ({
            queryKey: ['instrument-detail', symbol],
            queryFn: () => getInstrumentBySymbol(symbol),
            staleTime: 1000 * 60 * 30,
            gcTime: 1000 * 60 * 60,
            retry: false,
        })),
    });

    const exactSearchSymbol = useMemo(() => {
        const value = search.trim().toUpperCase().replace(/\s+/g, '');
        const alias = SEARCH_SYMBOL_ALIASES[value];
        if (alias) return alias;
        return /^[A-Z0-9._-]{1,12}$/.test(value) ? value : '';
    }, [search]);

    const { data: searchedInstrument } = useQuery({
        queryKey: ['instrument-search-symbol', exactSearchSymbol],
        queryFn: () => getInstrumentBySymbol(exactSearchSymbol),
        enabled: exactSearchSymbol.length > 0,
        staleTime: 1000 * 60 * 10,
        gcTime: 1000 * 60 * 30,
        retry: false,
    });

    const directSearchInstrument = useMemo(() => {
        return searchedInstrument ? normalizeInstrument(searchedInstrument) : null;
    }, [searchedInstrument]);

    const catalog = useMemo(() => {
        const bySymbol = new Map<string, MarketInstrument>();
        for (const inst of allInstruments) bySymbol.set(inst.symbol, inst);
        for (const result of pinnedQueries) {
            if (result.data) {
                const normalized = normalizeInstrument(result.data);
                bySymbol.set(normalized.symbol, normalized);
            }
        }
        if (directSearchInstrument) {
            bySymbol.set(directSearchInstrument.symbol, directSearchInstrument);
        }
        return [...bySymbol.values()];
    }, [allInstruments, pinnedQueries, directSearchInstrument]);

    const isLoading = allLoading;

    const formatPrice = (price: number, baseCurrency: string) => formatMarketPrice(price, baseCurrency);

    const searchFiltered = useMemo(() => {
        const query = search.trim().toLocaleLowerCase('tr-TR');
        if (!query) return catalog;
        const filtered = catalog.filter((inst) => {
            const haystack = [
                inst.symbol,
                inst.name,
                inst.type,
                inst.exchange,
                inst.baseCurrency,
                inst.country,
                inst.market,
            ].join(' ').toLocaleLowerCase('tr-TR');
            return haystack.includes(query);
        });
        if (directSearchInstrument && !filtered.some((inst) => inst.symbol === directSearchInstrument.symbol)) {
            return [directSearchInstrument, ...filtered];
        }
        return filtered;
    }, [catalog, directSearchInstrument, search]);

    const grouped = useMemo<Record<MarketTab, MarketInstrument[]>>(() => {
        const hasSearch = search.trim().length > 0;
        const regional = hasSearch ? searchFiltered : searchFiltered.filter(i => belongsToMarket(i, region));
        return {
            all: regional,
            crypto: regional.filter(i => i.type === 'CRYPTO'),
            forex: regional.filter(i => i.type === 'FIAT' || i.type === 'FOREX'),
            commodity: regional.filter(i => i.type === 'COMMODITY'),
            indices: regional.filter(i => i.type === 'INDEX'),
            stock: regional.filter(i => i.type === 'STOCK' || i.type === 'VIOP'),
            bond: regional.filter(i => i.type === 'BOND' || i.type === 'FUND'),
            gainers: [...regional]
                .filter(i => hasChange(i) && i.change24h > 0)
                .sort((a, b) => (b.change24h ?? Number.NEGATIVE_INFINITY) - (a.change24h ?? Number.NEGATIVE_INFINITY))
                .slice(0, 20),
            losers: [...regional]
                .filter(i => hasChange(i) && i.change24h < 0)
                .sort((a, b) => (a.change24h ?? Number.POSITIVE_INFINITY) - (b.change24h ?? Number.POSITIVE_INFINITY))
                .slice(0, 20),
        };
    }, [searchFiltered, region, search]);

    const allPage = useMemo(() => {
        const start = page * PAGE_SIZE;
        return grouped.all.slice(start, start + PAGE_SIZE);
    }, [grouped.all, page]);

    const totalPages = Math.max(1, Math.ceil(grouped.all.length / PAGE_SIZE));

    const handleNavigate = (symbol: string) => {
        navigate(`/instrument/${symbol}`);
    };

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
                <div className="flex bg-[hsl(var(--card))] border border-border p-0.5 rounded-lg w-fit">
                    <button
                        onClick={() => { setRegion('TR'); setPage(0); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                            region === 'TR' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                    >
                        <MapPin size={12} /> TR
                    </button>
                    <button
                        onClick={() => { setRegion('US'); setPage(0); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                            region === 'US' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                    >
                        <Globe2 size={12} /> US
                    </button>
                </div>
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: 12,
                border: '1px solid hsl(var(--border))',
                borderRadius: 6,
                background: 'hsl(var(--card))',
            }}>
                <div style={{ position: 'relative', width: 'min(100%, 420px)' }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--subtle-foreground))', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); }}
                        placeholder="Sembol, enstrüman adı, tür veya piyasa ara..."
                        style={{
                            width: '100%',
                            height: 38,
                            paddingLeft: 36,
                            paddingRight: 12,
                            fontSize: 13,
                            fontWeight: 500,
                            background: 'hsl(var(--background-subtle))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 4,
                            color: 'hsl(var(--foreground))',
                            outline: 'none',
                        }}
                    />
                </div>
                <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap' }}>
                    {searchFiltered.length} sonuç
                </span>
            </div>

            {/* Tabs + Table */}
            <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value as MarketTab); setPage(0); }} className="w-full">
                <div style={{ overflowX: 'auto', border: '1px solid hsl(var(--border))', borderRadius: 6, background: 'hsl(var(--card))' }}>
                    <TabsList className="bg-transparent p-0 h-auto rounded-none" style={{ flexWrap: 'nowrap', minWidth: 'max-content', display: 'flex' }}>
                        {MARKET_TABS.map((tab) => (
                            <TabsTrigger
                                key={tab.key}
                                value={tab.key}
                                className="rounded-none border-r border-border px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:bg-[hsl(var(--background-subtle))] data-[state=active]:text-foreground data-[state=active]:shadow-none"
                                style={{
                                    color: tab.tone === 'up' && !allLoading ? '#10b981' : tab.tone === 'down' && !allLoading ? '#ef4444' : undefined,
                                }}
                            >
                                <span>{tab.label}</span>
                                <span style={{ marginLeft: 8, fontSize: 11, color: 'hsl(var(--subtle-foreground))' }}>
                                    {grouped[tab.key]?.length ?? 0}
                                </span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                {/* "Tümü" tab */}
                <TabsContent value="all" className="mt-0 outline-none pt-0">
                    <InstrumentList
                        instruments={allPage}
                        isLoading={isLoading}
                        page={page}
                        totalPages={totalPages}
                        totalElements={grouped.all.length}
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
