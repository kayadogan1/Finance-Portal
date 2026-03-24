import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign } from 'lucide-react';
import { getMarketInstruments } from '../services/marketService';
import CandlestickChart from '../components/market/CandlestickChart';
import TradeWidget from '../components/trade/TradeWidget';
import NewsGrid from '../components/news/NewsGrid';

const ForexPage = () => {
    const [selectedSymbol, setSelectedSymbol] = useState('EURUSD');
    const { data: instruments = [], isLoading } = useQuery({
        queryKey: ['market-instruments'], queryFn: getMarketInstruments,
        select: d => d.filter(i => i.type === 'FIAT'),
    });
    const sel = useMemo(() => instruments.find(i => i.symbol === selectedSymbol), [instruments, selectedSymbol]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2.5">
                <DollarSign size={20} className="text-[#3B82F6]" />
                <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.2px] text-foreground">Döviz Piyasaları</h2>
                    <p className="text-meta">Küresel döviz çiftlerini takip edin</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {isLoading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded bg-white/[0.03] animate-pulse" />) :
                    instruments.slice(0, 8).map(inst => {
                        const pos = (inst.change24h ?? 0) >= 0;
                        return (
                            <button key={inst.symbol} onClick={() => setSelectedSymbol(inst.symbol)}
                                className={`text-left card-base !p-3.5 transition-colors ${selectedSymbol === inst.symbol ? 'border-border/60' : ''}`}
                                style={{ borderLeft: `3px solid hsl(var(${pos ? '--positive' : '--negative'}))` }}>
                                <p className="text-[11px] font-medium text-subtle">{inst.symbol}</p>
                                <p className="text-data mt-0.5">{inst.currentPrice?.toLocaleString('tr-TR', { minimumFractionDigits: 4 }) ?? '—'}</p>
                                <span className={`text-[11px] mt-0.5 inline-block ${pos ? 'badge-positive' : 'badge-negative'}`}>{pos ? '+' : ''}{(inst.change24h ?? 0).toFixed(2)}%</span>
                            </button>
                        );
                    })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
                <div className="xl:col-span-3 card-base"><CandlestickChart symbol={selectedSymbol} defaultSlot="W1" /></div>
                <div className="xl:col-span-1"><div className="sticky top-14"><TradeWidget symbol={selectedSymbol} instrumentName={sel?.name} currentPrice={sel?.currentPrice ?? 0} /></div></div>
            </div>

            <div className="card-base"><NewsGrid topic="FOREX" title="Döviz Haberleri" columns={3} maxItems={9} /></div>
        </div>
    );
};

export default ForexPage;
