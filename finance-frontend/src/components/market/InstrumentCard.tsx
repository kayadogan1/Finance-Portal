import { Star } from 'lucide-react';
import type { MarketInstrument } from '@/services/marketService';
import { useFavorites } from '@/hooks/useFavorites';

interface InstrumentCardProps {
    instrument: MarketInstrument;
    isSelected: boolean;
    onSelect: (symbol: string) => void;
    formatPrice: (price: number, symbol: string) => string;
}

export function InstrumentCard({ instrument, isSelected, onSelect, formatPrice }: InstrumentCardProps) {
    const { isFavorite, toggleFavorite } = useFavorites();
    const isPositive = (instrument.change24h || 0) >= 0;
    const fav = isFavorite(instrument.symbol);

    return (
        <div
            onClick={() => onSelect(instrument.symbol)}
            style={{
                position: 'relative',
                background: isSelected ? 'rgba(255,255,255,0.03)' : '#111118',
                borderRadius: 12,
                padding: '16px',
                border: isSelected ? `1px solid rgba(99,102,241,0.5)` : '1px solid rgba(255,255,255,0.06)',
                borderLeft: `3px solid ${isPositive ? '#10b981' : '#ef4444'}`,
                boxShadow: isSelected ? '0 4px 16px rgba(0,0,0,0.2)' : '0 0 0 1px rgba(255,255,255,0.06)',
                transition: 'all 0.2s',
                cursor: 'pointer',
            }}
            className="hover:translate-y-[-2px]"
            onMouseEnter={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                }
            }}
        >
            <div className="flex items-start justify-between">
                <div className="flex flex-col min-w-0 pr-4">
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{instrument.symbol}</span>
                    <span 
                        style={{ fontSize: 11, color: '#64748b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
                        title={instrument.name}
                    >
                        {instrument.name}
                    </span>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(instrument.symbol); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
                    title={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                >
                    <Star
                        size={14}
                        fill={fav ? '#eab308' : 'none'}
                        color={fav ? '#eab308' : '#475569'}
                        style={{ transition: 'all 0.15s' }}
                    />
                </button>
            </div>
            
            <div className="mt-4 flex flex-col gap-1">
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.3px' }}>
                    {formatPrice(instrument.currentPrice ?? 0, instrument.symbol)}
                </div>
                <div>
                    <span
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontVariantNumeric: 'tabular-nums',
                            background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            color: isPositive ? '#10b981' : '#ef4444',
                            display: 'inline-block'
                        }}
                    >
                        {isPositive ? '+' : ''}{(instrument.change24h || 0).toFixed(2)}%
                    </span>
                </div>
            </div>
        </div>
    );
}
