import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bitcoin, TrendingUp, TrendingDown } from 'lucide-react';
import { getMarketInstruments } from '../services/marketService';
import CandlestickChart from '../components/market/CandlestickChart';
import TradeWidget from '../components/trade/TradeWidget';
import NewsGrid from '../components/news/NewsGrid';

const PriceSkeleton = () => (
    <div className="animate-pulse bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
        <div className="h-4 bg-slate-700/60 rounded w-24 mb-3" />
        <div className="h-7 bg-slate-700/40 rounded w-36 mb-2" />
        <div className="h-3 bg-slate-700/30 rounded w-20" />
    </div>
);


const BitcoinPage = () => {
    const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');

    const { data: instruments = [], isLoading: instsLoading } = useQuery({
        queryKey: ['market-instruments'],
        queryFn: getMarketInstruments,
        select: (data) => data.filter((i) => i.type === 'CRYPTO'),
    });

    const selectedInst = useMemo(() => instruments.find(i => i.symbol === selectedSymbol), [instruments, selectedSymbol]);
    const currentPrice = selectedInst?.currentPrice ?? 0;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/20">
                    <Bitcoin className="text-orange-400" size={28} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Kripto Piyasalar</h2>
                    <p className="text-slate-400 text-sm">Kripto varlıkları takip edin</p>
                </div>
            </div>

            {/* Price ticker cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {instsLoading
                    ? Array.from({ length: 4 }).map((_, i) => <PriceSkeleton key={i} />)
                    : instruments.slice(0, 8).map((inst) => {
                        const isPositive = (inst.change24h ?? 0) >= 0;
                        return (
                            <button
                                key={inst.symbol}
                                onClick={() => setSelectedSymbol(inst.symbol)}
                                className={`text-left bg-slate-800/60 border rounded-xl p-4 transition-all hover:-translate-y-0.5
                                      ${selectedSymbol === inst.symbol
                                        ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                                        : 'border-slate-700/50 hover:border-slate-600'
                                    }`}
                            >
                                <p className="text-xs text-slate-400 font-medium mb-1">{inst.symbol}</p>
                                <p className="text-lg font-bold text-white font-mono">
                                    {inst.currentPrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) ?? '—'}
                                </p>
                                <span className={`flex items-center gap-1 text-xs font-medium font-mono mt-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    {isPositive ? '+' : ''}{(inst.change24h ?? 0).toFixed(2)}%
                                </span>
                            </button>
                        );
                    })}
            </div>

            {/* Chart + Trade Widget */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <div className="xl:col-span-3 bg-slate-800/50 backdrop-blur border border-slate-700/60 rounded-2xl p-6 shadow-lg">
                    <CandlestickChart symbol={selectedSymbol} defaultSlot="W1" />
                </div>
                <div className="xl:col-span-1">
                    <div className="sticky top-6">
                        <TradeWidget symbol={selectedSymbol} instrumentName={selectedInst?.name} currentPrice={currentPrice} />
                    </div>
                </div>
            </div>

            {/* Context-Aware News */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/60 rounded-2xl p-6 shadow-lg">
                <NewsGrid topic="CRYPTO" title="Kripto Haberleri" columns={3} maxItems={9} />
            </div>
        </div>
    );
};

export default BitcoinPage;
