import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';
import type { MarketInstrument } from '@/services/marketService';

/* ─── Sort types ─── */
type SortKey = 'symbol' | 'name' | 'currentPrice' | 'change24h';
type SortDir = 'asc' | 'desc';

/* ─── Skeleton Row ─── */
const SkeletonRow = () => (
    <tr>
        {Array.from({ length: 5 }).map((_, i) => (
            <td key={i} style={{ padding: '10px 12px' }}>
                <div
                    className="animate-pulse"
                    style={{
                        height: 14,
                        borderRadius: 6,
                        background: 'rgba(255,255,255,0.04)',
                        width: i === 0 ? 60 : i === 1 ? 120 : i === 4 ? 50 : 80,
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
}

export function InstrumentsTable({ instruments, onSelectSymbol, selectedSymbol, isLoading }: InstrumentsTableProps) {
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('symbol');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

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
                    cmp = (a.change24h ?? 0) - (b.change24h ?? 0);
                    break;
            }
            return sortDir === 'desc' ? -cmp : cmp;
        });

        return data;
    }, [instruments, search, sortKey, sortDir]);

    /* ─── Loading skeleton ─── */
    if (isLoading) {
        return (
            <div>
                {/* Search placeholder */}
                <div style={{ padding: '16px 0 12px' }}>
                    <div className="animate-pulse" style={{ height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.03)', maxWidth: 320 }} />
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
        return <div style={{ textAlign: 'center', padding: 48, fontSize: 13, color: '#64748b' }}>Bu kategoride enstrüman bulunamadı.</div>;
    }

    const thStyle = (align: 'left' | 'right' = 'left'): React.CSSProperties => ({
        padding: '10px 12px',
        fontSize: 11,
        fontWeight: 600,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        textAlign: align,
        cursor: 'pointer',
        userSelect: 'none',
        border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        whiteSpace: 'nowrap',
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
                            color: '#475569',
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
                            background: '#111118',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            color: '#f1f5f9',
                            outline: 'none',
                            transition: 'border-color 0.15s',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    />
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
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
                            const isPositive = (inst.change24h || 0) >= 0;
                            const isSelected = selectedSymbol === inst.symbol;
                            return (
                                <tr
                                    key={inst.symbol}
                                    onClick={() => onSelectSymbol?.(inst.symbol)}
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'background 0.15s',
                                        background: isSelected ? 'rgba(255,255,255,0.03)' : 'transparent',
                                        borderLeft: `3px solid ${isPositive ? '#10b981' : '#ef4444'}`,
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) e.currentTarget.style.background = '#1a1a24';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#f1f5f9', width: 100 }}>
                                        {inst.symbol}
                                    </td>
                                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#94a3b8', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {inst.name}
                                    </td>
                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#f1f5f9' }}>
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
                                                background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                color: isPositive ? '#10b981' : '#ef4444',
                                            }}
                                        >
                                            {isPositive ? '+' : ''}{(inst.change24h || 0).toFixed(2)}%
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
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background: 'transparent',
                                                color: '#94a3b8',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                                whiteSpace: 'nowrap',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
                                                e.currentTarget.style.color = '#f1f5f9';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                                e.currentTarget.style.color = '#94a3b8';
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

            {/* Row count */}
            <div style={{ textAlign: 'center', padding: '4px 0 8px', fontSize: 11, color: '#475569' }}>
                {processed.length} enstrüman
            </div>
        </div>
    );
}
