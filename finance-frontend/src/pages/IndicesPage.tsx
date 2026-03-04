import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, TrendingUp, TrendingDown, CandlestickChart as CandlestickIcon } from 'lucide-react';
import { getMarketInstruments, getMarketHistory } from '../services/marketService';
import CandlestickChart from '../components/market/CandlestickChart';
import NewsGrid from '../components/news/NewsGrid';

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

const IndicesPage = () => {
    const [selectedSymbol, setSelectedSymbol] = useState('');

    const { data: instruments = [], isLoading: instsLoading } = useQuery({
        queryKey: ['market-instruments'],
        queryFn: getMarketInstruments,
        select: (data) => data.filter((i) => i.type === 'INDEX'),
    });

    // Auto-select first index if none selected
    const activeSymbol = selectedSymbol || (instruments.length > 0 ? instruments[0].symbol : '');

    const { data: ohlcData, isLoading: chartLoading } = useQuery({
        queryKey: ['market-history', activeSymbol],
        queryFn: () => getMarketHistory(activeSymbol),
        enabled: !!activeSymbol,
    });

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20">
                    <BarChart2 className="text-violet-400" size={28} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Endeksler</h2>
                    <p className="text-slate-400 text-sm">Küresel borsa endekslerini takip edin</p>
                </div>
            </div>

            {/* Index cards */}
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
                                      ${activeSymbol === inst.symbol
                                        ? 'border-violet-500/50 shadow-lg shadow-violet-500/5'
                                        : 'border-slate-700/50 hover:border-slate-600'
                                    }`}
                            >
                                <p className="text-xs text-slate-400 font-medium mb-1">{inst.name || inst.symbol}</p>
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

            {/* Chart — no trade buttons */}
            {activeSymbol && (
                <div className="bg-slate-800/50 backdrop-blur border border-slate-700/60 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center gap-2 mb-5">
                        <CandlestickIcon size={20} className="text-violet-400" />
                        <h3 className="text-lg font-semibold text-white">{activeSymbol} — Mum Grafik</h3>
                    </div>
                    {chartLoading && <ChartSkeleton />}
                    {ohlcData && <CandlestickChart data={ohlcData} />}
                </div>
            )}

            {/* Business news for indices */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/60 rounded-2xl p-6 shadow-lg">
                <NewsGrid topic="STOCK" title="Borsa Haberleri" columns={3} maxItems={9} />
            </div>
        </div>
    );
};

export default IndicesPage;
