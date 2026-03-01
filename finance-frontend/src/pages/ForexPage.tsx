import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, TrendingDown, CandlestickChart as CandlestickIcon } from 'lucide-react';
import { getMarketInstruments, getMarketHistory } from '../services/marketService';
import CandlestickChart from '../components/market/CandlestickChart';
import NewsGrid from '../components/news/NewsGrid';
import { TradeModal } from '../components/trade/TradeModal';

const PriceSkeleton = () => (
    <div className="animate-pulse bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
        <div className="h-4 bg-slate-700/60 rounded w-24 mb-3" />
        <div className="h-7 bg-slate-700/40 rounded w-36 mb-2" />
        <div className="h-3 bg-slate-700/30 rounded w-20" />
    </div>
);

const ChartSkeleton = () => (
    <div className="animate-pulse space-y-4">
        <div className="h-5 w-48 bg-slate-700 rounded" />
        <div className="h-[380px] bg-slate-700/30 rounded-xl" />
    </div>
);

const ForexPage = () => {
    const [selectedSymbol, setSelectedSymbol] = useState('EURUSD');
    const [tradeOpen, setTradeOpen] = useState(false);
    const [tradeSide, setTradeSide] = useState<'BUY' | 'SELL'>('BUY');

    const { data: instruments = [], isLoading: instsLoading } = useQuery({
        queryKey: ['market-instruments'],
        queryFn: getMarketInstruments,
        select: (data) => data.filter((i) => i.type === 'FIAT'),
    });

    const { data: ohlcData, isLoading: chartLoading } = useQuery({
        queryKey: ['market-history', selectedSymbol],
        queryFn: () => getMarketHistory(selectedSymbol),
    });

    // Auto-select first forex pair
    const activePairs = instruments;
    if (activePairs.length > 0 && !activePairs.some((i) => i.symbol === selectedSymbol)) {
        // Will be caught on next render
    }

    const openTrade = (side: 'BUY' | 'SELL') => {
        setTradeSide(side);
        setTradeOpen(true);
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <DollarSign className="text-blue-400" size={28} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Döviz Piyasaları (Forex)</h2>
                    <p className="text-slate-400 text-sm">Küresel döviz çiftlerini takip edin</p>
                </div>
            </div>

            {/* Currency pair cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {instsLoading
                    ? Array.from({ length: 4 }).map((_, i) => <PriceSkeleton key={i} />)
                    : activePairs.slice(0, 8).map((inst) => {
                        const isPositive = (inst.change24h ?? 0) >= 0;
                        return (
                            <button
                                key={inst.symbol}
                                onClick={() => setSelectedSymbol(inst.symbol)}
                                className={`text-left bg-slate-800/60 border rounded-xl p-4 transition-all hover:-translate-y-0.5
                                      ${selectedSymbol === inst.symbol
                                        ? 'border-blue-500/50 shadow-lg shadow-blue-500/5'
                                        : 'border-slate-700/50 hover:border-slate-600'
                                    }`}
                            >
                                <p className="text-xs text-slate-400 font-medium mb-1">{inst.symbol}</p>
                                <p className="text-lg font-bold text-white">
                                    {inst.currentPrice?.toLocaleString('tr-TR', { minimumFractionDigits: 4 }) ?? '—'}
                                </p>
                                <span className={`flex items-center gap-1 text-xs font-medium mt-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    {isPositive ? '+' : ''}{(inst.change24h ?? 0).toFixed(2)}%
                                </span>
                            </button>
                        );
                    })}
            </div>

            {/* Chart */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/60 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <CandlestickIcon size={20} className="text-blue-400" />
                        <h3 className="text-lg font-semibold text-white">{selectedSymbol} — Mum Grafik</h3>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => openTrade('BUY')} className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors">
                            Al
                        </button>
                        <button onClick={() => openTrade('SELL')} className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
                            Sat
                        </button>
                    </div>
                </div>
                {chartLoading && <ChartSkeleton />}
                {ohlcData && <CandlestickChart data={ohlcData} />}
            </div>

            {/* Forex-specific news */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/60 rounded-2xl p-6 shadow-lg">
                <NewsGrid topic="FINANCE" title="Finans Haberleri" columns={3} maxItems={9} />
            </div>

            <TradeModal isOpen={tradeOpen} onClose={() => setTradeOpen(false)} symbol={selectedSymbol} side={tradeSide} />
        </div>
    );
};

export default ForexPage;
