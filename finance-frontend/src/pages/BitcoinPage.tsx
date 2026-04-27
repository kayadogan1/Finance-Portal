import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatChangePercent, getMarketInstruments, hasChange } from '../services/marketService';
import { formatMarketPrice } from '../utils/currency';
import CandlestickChart from '../components/market/CandlestickChart';
import TradeWidget from '../components/trade/TradeWidget';
import NewsGrid from '../components/news/NewsGrid';

const BitcoinPage = () => {
    const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
    const { data: instruments = [], isLoading } = useQuery({
        queryKey: ['market-instruments'], queryFn: getMarketInstruments,
        select: d => d.filter(i => i.type === 'CRYPTO'),
    });
    const sel = useMemo(() => instruments.find(i => i.symbol === selectedSymbol), [instruments, selectedSymbol]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-[20px] font-semibold tracking-[-0.2px] text-foreground">Kripto Piyasalar</h2>
                <p className="text-meta">Kripto varlıkları takip edin</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {isLoading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded bg-white/[0.03] animate-pulse" />) :
                    instruments.slice(0, 8).map(inst => {
                        const hasChangeValue = hasChange(inst);
                        const pos = hasChangeValue && inst.change24h >= 0;
                        return (
                            <button key={inst.symbol} onClick={() => setSelectedSymbol(inst.symbol)}
                                className={`text-left card-base !p-3.5 transition-colors ${selectedSymbol === inst.symbol ? 'border-border/60' : ''}`}
                                style={{ borderLeft: `3px solid hsl(var(${pos ? '--positive' : '--negative'}))` }}>
                                <p className="text-[11px] font-medium text-subtle">{inst.symbol}</p>
                                <p className="text-data mt-0.5">{formatMarketPrice(inst.currentPrice ?? 0, inst.baseCurrency)}</p>
                                <span className={`text-[11px] mt-0.5 inline-block ${!hasChangeValue ? 'text-muted-foreground' : pos ? 'badge-positive' : 'badge-negative'}`}>{formatChangePercent(inst.change24h)}</span>
                            </button>
                        );
                    })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
                <div className="xl:col-span-3 card-base"><CandlestickChart symbol={selectedSymbol} defaultSlot="W1" baseCurrency={sel?.baseCurrency} /></div>
                <div className="xl:col-span-1"><div className="sticky top-14"><TradeWidget symbol={selectedSymbol} instrumentName={sel?.name} currentPrice={sel?.currentPrice ?? 0} /></div></div>
            </div>

            <div className="card-base"><NewsGrid topic="CRYPTO" title="Kripto Haberleri" columns={3} maxItems={9} /></div>
        </div>
    );
};

export default BitcoinPage;
