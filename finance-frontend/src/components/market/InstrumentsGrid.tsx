import { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatChangePercent, hasChange, type MarketInstrument } from '@/services/marketService';

interface InstrumentsGridProps {
    instruments: MarketInstrument[];
    onSelectSymbol?: (symbol: string) => void;
    selectedSymbol?: string;
    isLoading?: boolean;
    page?: number;
    totalPages?: number;
    totalElements?: number;
    onPageChange?: (page: number) => void;
    formatPrice: (price: number, baseCurrency: string) => string;
}

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

/* ─── Table row ─── */
const InstrumentRow = ({
    inst, isSelected, onSelect, formatPrice
}: {
    inst: MarketInstrument;
    isSelected: boolean;
    onSelect: (s: string) => void;
    formatPrice: (price: number, baseCurrency: string) => string;
}) => {
    const hasChangeValue = hasChange(inst);
    const isPositive = hasChangeValue && inst.change24h >= 0;

    return (
        <div
            onClick={() => onSelect(inst.symbol)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                height: 44,
                padding: '0 16px',
                borderBottom: '1px solid hsl(var(--border-subtle))',
                background: isSelected ? 'rgba(99,102,241,0.06)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = 'hsl(var(--card-hover))';
            }}
            onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.background = 'transparent';
            }}
        >
            {/* Symbol + change indicator */}
            <div style={{ width: 96, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                    width: 3, height: 14, borderRadius: 1, flexShrink: 0,
                    background: !hasChangeValue ? 'hsl(var(--muted-foreground))' : isPositive ? '#10b981' : '#ef4444',
                }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--foreground))', letterSpacing: '-0.2px' }}>
                    {inst.symbol}
                </span>
            </div>

            {/* Name */}
            <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                <span style={{
                    fontSize: 12, color: 'hsl(var(--muted-foreground))',
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
                    background: 'hsl(var(--border-subtle))', color: 'hsl(var(--subtle-foreground))',
                }}>
                    {inst.type}
                </span>
            </div>

            {/* Price */}
            <div style={{ width: 120, flexShrink: 0, textAlign: 'right' }}>
                <span style={{
                    fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))',
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
                    background: !hasChangeValue ? 'rgba(148,163,184,0.08)' : isPositive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    color: !hasChangeValue ? 'hsl(var(--muted-foreground))' : isPositive ? '#10b981' : '#ef4444',
                }}>
                    {formatChangePercent(inst.change24h)}
                </span>
            </div>
        </div>
    );
};


export function InstrumentsGrid({
    instruments, onSelectSymbol, selectedSymbol, isLoading,
    page, totalPages, totalElements, onPageChange, formatPrice
}: InstrumentsGridProps) {
    const [search, setSearch] = useState('');
    const hasPagination = totalPages !== undefined && totalPages > 1 && onPageChange !== undefined;

    const processed = useMemo(() => {
        let data = [...instruments];
        if (search.trim()) {
            const q = search.toLowerCase();
            data = data.filter(i => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q));
        }
        return data;
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
        return <div style={{ textAlign: 'center', padding: 48, fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>Bu kategoride enstrüman bulunamadı.</div>;
    }

    const paginationBtnStyle = (active: boolean, disabled?: boolean): React.CSSProperties => ({
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 32, height: 32, padding: '0 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
        border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid hsl(var(--border))',
        background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
        color: disabled ? 'hsl(var(--ghost-foreground))' : active ? '#818cf8' : 'hsl(var(--muted-foreground))',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', pointerEvents: disabled ? 'none' : 'auto',
    });

    return (
        <div style={{ background: 'hsl(var(--card))', borderRadius: 12, border: '1px solid hsl(var(--border))', overflow: 'hidden' }}>
            {/* Search + header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid hsl(var(--border))' }}>
                <div style={{ position: 'relative', width: 280 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--subtle-foreground))', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Sembol veya isim ara..."
                        style={{
                            width: '100%', height: 32, paddingLeft: 32, paddingRight: 10, fontSize: 12, fontWeight: 500,
                            background: 'hsl(var(--background-subtle))', border: '1px solid hsl(var(--border))', borderRadius: 6,
                            color: 'hsl(var(--foreground))', outline: 'none', transition: 'border-color 0.15s',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; }}
                    />
                </div>
                <span style={{ fontSize: 11, color: 'hsl(var(--subtle-foreground))' }}>
                    {processed.length} enstrüman
                </span>
            </div>

            {/* Table header */}
            <div style={{
                display: 'flex', alignItems: 'center', height: 32, padding: '0 16px',
                borderBottom: '1px solid hsl(var(--border))',
                background: 'rgba(255,255,255,0.015)',
            }}>
                <div style={{ width: 96, fontSize: 10, fontWeight: 600, color: 'hsl(var(--subtle-foreground))', textTransform: 'uppercase', letterSpacing: 0.5 }}>Sembol</div>
                <div style={{ flex: 1, fontSize: 10, fontWeight: 600, color: 'hsl(var(--subtle-foreground))', textTransform: 'uppercase', letterSpacing: 0.5 }}>Ad</div>
                <div style={{ width: 64, fontSize: 10, fontWeight: 600, color: 'hsl(var(--subtle-foreground))', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>Tip</div>
                <div style={{ width: 120, fontSize: 10, fontWeight: 600, color: 'hsl(var(--subtle-foreground))', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Fiyat</div>
                <div style={{ width: 80, fontSize: 10, fontWeight: 600, color: 'hsl(var(--subtle-foreground))', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Değişim</div>
            </div>

            {/* Rows */}
            <div>
                {processed.map((inst) => (
                    <InstrumentRow
                        key={inst.symbol}
                        inst={inst}
                        isSelected={selectedSymbol === inst.symbol}
                        onSelect={onSelectSymbol || (() => {})}
                        formatPrice={formatPrice}
                    />
                ))}
            </div>

            {/* Pagination / Row count */}
            {hasPagination ? (
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
                        {pageNumbers.map((n) => (
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
            ) : null}
        </div>
    );
}
