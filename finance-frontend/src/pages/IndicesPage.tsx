import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatChangePercent, getMarketInstruments, hasChange } from '../services/marketService';
import { formatMarketPrice } from '../utils/currency';
import CandlestickChart from '../components/market/CandlestickChart';
import TradeWidget from '../components/trade/TradeWidget';
import NewsGrid from '../components/news/NewsGrid';

const IndicesPage = () => {
    const [selectedSymbol, setSelectedSymbol] = useState('');
    const { data: instruments = [], isLoading } = useQuery({
        queryKey: ['market-instruments'], queryFn: getMarketInstruments,
        select: d => d.filter(i => i.type === 'INDEX'),
    });
    const sym = selectedSymbol || (instruments[0]?.symbol ?? '');
    const sel = useMemo(() => instruments.find(i => i.symbol === sym), [instruments, sym]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-[20px] font-semibold tracking-[-0.2px] text-foreground">Endeksler</h2>
                <p className="text-meta">Küresel borsa endekslerini takip edin</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {isLoading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded bg-white/[0.03] animate-pulse" />) :
                    instruments.slice(0, 8).map(inst => {
                        const hasChangeValue = hasChange(inst);
                        const pos = hasChangeValue && inst.change24h >= 0;
                        return (
                            <button key={inst.symbol} onClick={() => setSelectedSymbol(inst.symbol)}
                                className={`text-left card-base !p-3.5 transition-colors ${sym === inst.symbol ? 'border-border/60' : ''}`}
                                style={{ borderLeft: `3px solid hsl(var(${pos ? '--positive' : '--negative'}))` }}>
                                <p className="text-[11px] font-medium text-subtle">{inst.name || inst.symbol}</p>
                                <p className="text-data mt-0.5">{formatMarketPrice(inst.currentPrice ?? 0, inst.baseCurrency)}</p>
                                <span className={`text-[11px] mt-0.5 inline-block ${!hasChangeValue ? 'text-muted-foreground' : pos ? 'badge-positive' : 'badge-negative'}`}>{formatChangePercent(inst.change24h)}</span>
                            </button>
                        );
                    })}
            </div>

            {sym && (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
                    <div className="xl:col-span-3 card-base"><CandlestickChart symbol={sym} defaultSlot="W1" baseCurrency={sel?.baseCurrency} /></div>
                    <div className="xl:col-span-1"><div className="sticky top-14"><TradeWidget symbol={sym} instrumentName={sel?.name} currentPrice={sel?.currentPrice ?? 0} /></div></div>
                </div>
            )}

            <div className="card-base"><NewsGrid topic="STOCK" title="Borsa Haberleri" columns={3} maxItems={9} /></div>
        </div>
    );
};

export default IndicesPage;
