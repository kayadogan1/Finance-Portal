import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CandlestickChart as CandlestickIcon, TrendingUp } from 'lucide-react';
import { getMarketHistory } from '../services/marketService';
import CandlestickChart from '../components/market/CandlestickChart';
import AIAnalysisCard from '../components/market/AIAnalysisCard';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'THYAO', 'ASELS'] as const;

/* ─── Skeleton ─── */
const ChartSkeleton = () => (
    <div className="animate-pulse space-y-4">
        <div className="h-5 w-48 bg-slate-700 rounded" />
        <div className="h-[420px] bg-slate-700/30 rounded-xl" />
        <div className="flex gap-3">
            <div className="h-4 bg-slate-700/40 rounded w-24" />
            <div className="h-4 bg-slate-700/30 rounded w-32" />
            <div className="h-4 bg-slate-700/20 rounded w-20" />
        </div>
    </div>
);

/* ─── Card wrapper (consistent with PortfolioPage) ─── */
const Card = ({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) => (
    <div
        className={`bg-slate-800/50 backdrop-blur border border-slate-700/60 rounded-2xl p-6 shadow-lg ${className}`}
    >
        {children}
    </div>
);

/* ─── Page ─── */
const MarketPage = () => {
    const [selectedSymbol, setSelectedSymbol] = useState<string>(SYMBOLS[0]);

    const {
        data: ohlcData,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['market-history', selectedSymbol],
        queryFn: () => getMarketHistory(selectedSymbol),
    });

    return (
        <div className="space-y-8">
            {/* Page header */}
            <div>
                <h2 className="text-2xl font-bold text-white">Piyasalar</h2>
                <p className="text-slate-400 mt-1">
                    Seçtiğiniz sembolün 30 günlük mum grafiği ve AI analizi
                </p>
            </div>

            {/* Symbol selector */}
            <div className="flex flex-wrap gap-2">
                {SYMBOLS.map((sym) => (
                    <button
                        key={sym}
                        onClick={() => setSelectedSymbol(sym)}
                        className={`
                            flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm
                            transition-all duration-200 border
                            ${sym === selectedSymbol
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10'
                                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                            }
                        `}
                    >
                        <TrendingUp size={16} />
                        {sym}
                    </button>
                ))}
            </div>

            {/* Chart + AI Insight grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Chart card — spans 2 cols on xl */}
                <Card className="xl:col-span-2">
                    <div className="flex items-center gap-2 mb-5">
                        <CandlestickIcon size={20} className="text-emerald-400" />
                        <h3 className="text-lg font-semibold text-white">
                            {selectedSymbol} — Mum Grafik
                        </h3>
                    </div>

                    {isLoading && <ChartSkeleton />}

                    {isError && (
                        <p className="text-red-400 text-sm">
                            Piyasa verileri yüklenemedi. Lütfen tekrar deneyin.
                        </p>
                    )}

                    {ohlcData && <CandlestickChart data={ohlcData} />}
                </Card>

                {/* AI Insight card — 1 col on xl, full-width on smaller */}
                <AIAnalysisCard symbol={selectedSymbol} />
            </div>
        </div>
    );
};

export default MarketPage;
