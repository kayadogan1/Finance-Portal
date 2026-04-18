import { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MarketInstrument } from '@/services/marketService';
import { InstrumentCard } from './InstrumentCard';

interface InstrumentsGridProps {
    instruments: MarketInstrument[];
    onSelectSymbol?: (symbol: string) => void;
    selectedSymbol?: string;
    isLoading?: boolean;
    page?: number;
    totalPages?: number;
    totalElements?: number;
    onPageChange?: (page: number) => void;
    formatPrice: (price: number, symbol: string) => string;
}

const SkeletonCard = () => (
    <div className="animate-pulse" style={{ background: '#111118', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.06)', height: 124 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
                <div style={{ height: 16, width: 60, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 12, width: 100, background: 'rgba(255,255,255,0.03)', borderRadius: 4 }} />
            </div>
        </div>
        <div style={{ marginTop: 20 }}>
            <div style={{ height: 20, width: 80, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 18, width: 50, background: 'rgba(255,255,255,0.03)', borderRadius: 4 }} />
        </div>
    </div>
);

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
            <div>
                <div style={{ padding: '16px 0 16px' }}>
                    <div className="animate-pulse" style={{ height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.03)', maxWidth: 320 }} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            </div>
        );
    }

    if (!instruments.length) {
        return <div style={{ textAlign: 'center', padding: 48, fontSize: 13, color: '#64748b' }}>Bu kategoride enstrüman bulunamadı.</div>;
    }

    const paginationBtnStyle = (active: boolean, disabled?: boolean): React.CSSProperties => ({
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 32, height: 32, padding: '0 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
        border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
        background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
        color: disabled ? '#334155' : active ? '#818cf8' : '#94a3b8',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', pointerEvents: disabled ? 'none' : 'auto',
    });

    return (
        <div>
            {/* Search */}
            <div style={{ padding: '16px 0 16px' }}>
                <div style={{ position: 'relative', maxWidth: 320 }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Sembol veya isim ara..."
                        style={{
                            width: '100%', height: 40, paddingLeft: 36, paddingRight: 12, fontSize: 13, fontWeight: 500,
                            background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
                            color: '#f1f5f9', outline: 'none', transition: 'border-color 0.15s',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {processed.map((inst) => (
                    <InstrumentCard
                        key={inst.symbol}
                        instrument={inst}
                        isSelected={selectedSymbol === inst.symbol}
                        onSelect={onSelectSymbol || (() => {})}
                        formatPrice={formatPrice}
                    />
                ))}
            </div>

            {/* Pagination / Row count */}
            {hasPagination ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0 8px', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
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
                        {pageNumbers.map((n) => (
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
            ) : (
                <div style={{ textAlign: 'center', padding: '16px 0 8px', fontSize: 11, color: '#475569' }}>
                    {processed.length} enstrüman
                </div>
            )}
        </div>
    );
}
