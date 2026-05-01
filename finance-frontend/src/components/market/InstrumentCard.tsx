import { formatChangePercent, hasChange, type MarketInstrument } from '@/services/marketService';

interface InstrumentCardProps {
    instrument: MarketInstrument;
    isSelected: boolean;
    onSelect: (symbol: string) => void;
    formatPrice: (price: number, baseCurrency: string) => string;
}

export function InstrumentCard({ instrument, isSelected, onSelect, formatPrice }: InstrumentCardProps) {
    const hasChangeValue = hasChange(instrument);
    const isPositive = hasChangeValue && instrument.change24h >= 0;

    return (
        <div
            onClick={() => onSelect(instrument.symbol)}
            style={{
                position: 'relative',
                background: isSelected ? 'hsl(var(--background-subtle))' : 'hsl(var(--card))',
                borderRadius: 12,
                padding: '16px',
                border: isSelected ? `1px solid rgba(99,102,241,0.5)` : '1px solid hsl(var(--border))',
                borderLeft: `3px solid ${!hasChangeValue ? 'hsl(var(--muted-foreground))' : isPositive ? '#10b981' : '#ef4444'}`,
                boxShadow: isSelected ? '0 4px 16px rgba(0,0,0,0.2)' : '0 0 0 1px hsl(var(--border))',
                transition: 'all 0.2s',
                cursor: 'pointer',
            }}
            className="hover:translate-y-[-2px]"
            onMouseEnter={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
                    e.currentTarget.style.borderColor = 'hsl(var(--border))';
                }
            }}
            onMouseLeave={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.boxShadow = '0 0 0 1px hsl(var(--border))';
                    e.currentTarget.style.borderColor = 'hsl(var(--border))';
                }
            }}
        >
            <div className="flex items-start justify-between">
                <div className="flex flex-col min-w-0 pr-4">
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'hsl(var(--foreground))' }}>{instrument.symbol}</span>
                    <span 
                        style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
                        title={instrument.name}
                    >
                        {instrument.name}
                    </span>
                </div>
            </div>
            
            <div className="mt-4 flex flex-col gap-1">
                <div style={{ fontSize: 20, fontWeight: 700, color: 'hsl(var(--foreground))', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.3px' }}>
                    {formatPrice(instrument.currentPrice ?? 0, instrument.baseCurrency)}
                </div>
                <div>
                    <span
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontVariantNumeric: 'tabular-nums',
                            background: !hasChangeValue ? 'rgba(148,163,184,0.1)' : isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            color: !hasChangeValue ? 'hsl(var(--muted-foreground))' : isPositive ? '#10b981' : '#ef4444',
                            display: 'inline-block'
                        }}
                    >
                        {formatChangePercent(instrument.change24h)}
                    </span>
                </div>
            </div>
        </div>
    );
}
