import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { formatChangePercent, hasChange, type MarketInstrument } from '@/services/marketService';
import { useFavorites } from '@/hooks/useFavorites';

/* ─── Sort types ─── */
type SortKey = 'symbol' | 'name' | 'currentPrice' | 'change24h';
type SortDir = 'asc' | 'desc';

/* ─── Skeleton Row ─── */
const SkeletonRow = () => (
    <tr>
        {Array.from({ length: 6 }).map((_, i) => (
            <td key={i} style={{ padding: '10px 12px' }}>
                <div
                    className="animate-pulse"
                    style={{
                        height: 14,
                        borderRadius: 6,
                        background: 'hsl(var(--border-subtle))',
                        width: i === 0 ? 28 : i === 1 ? 60 : i === 2 ? 120 : i === 5 ? 50 : 80,
                    }}
                />
            </td>
        ))}
    </tr>
);

/* ─── Sort Arrow ─── */
const SortArrow = ({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey; sortDir: SortDir }) => {
    if (column !== sortKey) {
        return <ChevronUp size={12} style={{ opacity: 0.2, marginLeft: 4 }} />;
    }
    return sortDir === 'asc'
        ? <ChevronUp size={12} style={{ color: '#818cf8', marginLeft: 4 }} />
        : <ChevronDown size={12} style={{ color: '#818cf8', marginLeft: 4 }} />;
};

/* ═══════════════════════════════════════════
   Instruments Table
   ═══════════════════════════════════════════ */

interface InstrumentsTableProps {
    instruments: MarketInstrument[];
    onSelectSymbol?: (symbol: string) => void;
    selectedSymbol?: string;
    isLoading?: boolean;
    /* ─── Pagination props (optional) ─── */
    page?: number;
    totalPages?: number;
    totalElements?: number;
    onPageChange?: (page: number) => void;
}

export function InstrumentsTable({
    instruments, onSelectSymbol, selectedSymbol, isLoading,
    page, totalPages, totalElements, onPageChange,
}: InstrumentsTableProps) {
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('symbol');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const { isFavorite, toggleFavorite } = useFavorites();

    const hasPagination = totalPages !== undefined && totalPages > 1 && onPageChange !== undefined;

    /* ─── Sort handler ─── */
    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    /* ─── Filtered + Sorted data ─── */
    const processed = useMemo(() => {
        let data = [...instruments];

        // Search filter
        if (search.trim()) {
            const q = search.toLowerCase();
            data = data.filter(
                (i) =>
                    i.symbol.toLowerCase().includes(q) ||
                    i.name.toLowerCase().includes(q)
            );
        }

        // Sort
        data.sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case 'symbol':
                    cmp = a.symbol.localeCompare(b.symbol);
                    break;
                case 'name':
                    cmp = a.name.localeCompare(b.name);
                    break;
                case 'currentPrice':
                    cmp = (a.currentPrice ?? 0) - (b.currentPrice ?? 0);
                    break;
                case 'change24h':
                    cmp = (a.change24h ?? Number.NEGATIVE_INFINITY) - (b.change24h ?? Number.NEGATIVE_INFINITY);
                    break;
            }
            return sortDir === 'desc' ? -cmp : cmp;
        });

        return data;
    }, [instruments, search, sortKey, sortDir]);

    /* ─── Page numbers to show ─── */
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

    /* ─── Loading skeleton ─── */
    if (isLoading) {
        return (
            <div>
                {/* Search placeholder */}
                <div style={{ padding: '16px 0 12px' }}>
                    <div className="animate-pulse" style={{ height: 40, borderRadius: 8, background: 'hsl(var(--background-subtle))', maxWidth: 320 }} />
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <SkeletonRow key={i} />
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (!instruments.length) {
        return <div style={{ textAlign: 'center', padding: 48, fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>Bu kategoride enstrüman bulunamadı.</div>;
    }

    const thStyle = (align: 'left' | 'right' = 'left'): React.CSSProperties => ({
        padding: '10px 12px',
        fontSize: 11,
        fontWeight: 600,
        color: 'hsl(var(--muted-foreground))',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        textAlign: align,
        cursor: 'pointer',
        userSelect: 'none',
        border: 'none',
        borderBottom: '1px solid hsl(var(--border))',
        whiteSpace: 'nowrap',
    });

    const paginationBtnStyle = (active: boolean, disabled?: boolean): React.CSSProperties => ({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 32,
        height: 32,
        padding: '0 8px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid hsl(var(--border))',
        background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
        color: disabled ? 'hsl(var(--ghost-foreground))' : active ? '#818cf8' : 'hsl(var(--muted-foreground))',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
        pointerEvents: disabled ? 'none' : 'auto',
    });

    return (
        <div>
            {/* Search */}
            <div style={{ padding: '16px 0 12px' }}>
                <div style={{ position: 'relative', maxWidth: 320 }}>
                    <Search
                        size={15}
                        style={{
                            position: 'absolute',
                            left: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'hsl(var(--subtle-foreground))',
                            pointerEvents: 'none',
                        }}
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); }}
                        placeholder="Sembol veya isim ara..."
                        style={{
                            width: '100%',
                            height: 40,
                            paddingLeft: 36,
                            paddingRight: 12,
                            fontSize: 13,
                            fontWeight: 500,
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 8,
                            color: 'hsl(var(--foreground))',
                            outline: 'none',
                            transition: 'border-color 0.15s',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; }}
                    />
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ ...thStyle('left'), cursor: 'default', width: 40, padding: '10px 8px 10px 12px' }}>
                                {/* Fav column header — empty */}
                            </th>
                            <th style={thStyle('left')} onClick={() => handleSort('symbol')}>
                                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    Sembol <SortArrow column="symbol" sortKey={sortKey} sortDir={sortDir} />
                                </span>
                            </th>
                            <th style={thStyle('left')} onClick={() => handleSort('name')}>
                                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    İsim <SortArrow column="name" sortKey={sortKey} sortDir={sortDir} />
                                </span>
                            </th>
                            <th style={thStyle('right')} onClick={() => handleSort('currentPrice')}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                    Fiyat <SortArrow column="currentPrice" sortKey={sortKey} sortDir={sortDir} />
                                </span>
                            </th>
                            <th style={thStyle('right')} onClick={() => handleSort('change24h')}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                    24s Değişim <SortArrow column="change24h" sortKey={sortKey} sortDir={sortDir} />
                                </span>
                            </th>
                            <th style={{ ...thStyle('right'), cursor: 'default', width: 80 }}>
                                Detay
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {processed.map((inst) => {
                            const hasChangeValue = hasChange(inst);
                            const isPositive = hasChangeValue && inst.change24h >= 0;
                            const isSelected = selectedSymbol === inst.symbol;
                            const fav = isFavorite(inst.symbol);
                            return (
                                <tr
                                    key={inst.symbol}
                                    onClick={() => onSelectSymbol?.(inst.symbol)}
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'background 0.15s',
                                        background: isSelected ? 'hsl(var(--background-subtle))' : 'transparent',
                                        borderLeft: `3px solid ${!hasChangeValue ? 'hsl(var(--muted-foreground))' : isPositive ? '#10b981' : '#ef4444'}`,
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) e.currentTarget.style.background = '#1a1a24';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    {/* Favorite star */}
                                    <td style={{ padding: '10px 4px 10px 12px', width: 40 }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleFavorite(inst.symbol); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
                                            title={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                                        >
                                            <Star
                                                size={14}
                                                fill={fav ? '#eab308' : 'none'}
                                                color={fav ? '#eab308' : 'hsl(var(--subtle-foreground))'}
                                                style={{ transition: 'all 0.15s' }}
                                            />
                                        </button>
                                    </td>
                                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))', width: 100 }}>
                                        {inst.symbol}
                                    </td>
                                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'hsl(var(--muted-foreground))', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {inst.name}
                                    </td>
                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'hsl(var(--foreground))' }}>
                                        {(inst.currentPrice || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                                    </td>
                                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                fontVariantNumeric: 'tabular-nums',
                                                padding: '3px 10px',
                                                borderRadius: 6,
                                                background: !hasChangeValue ? 'rgba(148,163,184,0.1)' : isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                color: !hasChangeValue ? 'hsl(var(--muted-foreground))' : isPositive ? '#10b981' : '#ef4444',
                                            }}
                                        >
                                            {formatChangePercent(inst.change24h)}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onSelectSymbol?.(inst.symbol); }}
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                padding: '4px 12px',
                                                borderRadius: 6,
                                                border: '1px solid hsl(var(--border))',
                                                background: 'transparent',
                                                color: 'hsl(var(--muted-foreground))',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                                whiteSpace: 'nowrap',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
                                                e.currentTarget.style.color = 'hsl(var(--foreground))';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = 'hsl(var(--border))';
                                                e.currentTarget.style.color = 'hsl(var(--muted-foreground))';
                                            }}
                                        >
                                            Detay →
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination / Row count */}
            {hasPagination ? (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 0 8px', flexWrap: 'wrap', gap: 8,
                }}>
                    <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                        Toplam {totalElements ?? 0} enstrüman
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {/* Prev */}
                        <button
                            style={paginationBtnStyle(false, page === 0)}
                            onClick={() => page !== undefined && page > 0 && onPageChange!(page - 1)}
                        >
                            <ChevronLeft size={14} />
                        </button>

                        {/* Page numbers */}
                        {pageNumbers[0] > 0 && (
                            <>
                                <button style={paginationBtnStyle(page === 0)} onClick={() => onPageChange!(0)}>1</button>
                                {pageNumbers[0] > 1 && <span style={{ color: 'hsl(var(--subtle-foreground))', fontSize: 12, padding: '0 4px' }}>…</span>}
                            </>
                        )}
                        {pageNumbers.map((n) => (
                            <button
                                key={n}
                                style={paginationBtnStyle(n === page)}
                                onClick={() => onPageChange!(n)}
                            >
                                {n + 1}
                            </button>
                        ))}
                        {pageNumbers[pageNumbers.length - 1] < totalPages! - 1 && (
                            <>
                                {pageNumbers[pageNumbers.length - 1] < totalPages! - 2 && (
                                    <span style={{ color: 'hsl(var(--subtle-foreground))', fontSize: 12, padding: '0 4px' }}>…</span>
                                )}
                                <button
                                    style={paginationBtnStyle(page === totalPages! - 1)}
                                    onClick={() => onPageChange!(totalPages! - 1)}
                                >
                                    {totalPages}
                                </button>
                            </>
                        )}

                        {/* Next */}
                        <button
                            style={paginationBtnStyle(false, page === totalPages! - 1)}
                            onClick={() => page !== undefined && onPageChange!(page + 1)}
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '4px 0 8px', fontSize: 11, color: 'hsl(var(--subtle-foreground))' }}>
                    {processed.length} enstrüman
                </div>
            )}
        </div>
    );
}
