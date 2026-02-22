import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CandlestickChart as CandlestickIcon, Activity } from 'lucide-react';
import { getMarketHistory, getMarketInstruments } from '../services/marketService';
import CandlestickChart from '../components/market/CandlestickChart';
import AIAnalysisCard from '../components/market/AIAnalysisCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InstrumentsTable } from '../components/market/InstrumentsTable';
import { TradeModal } from '../components/trade/TradeModal';
import ComparisonChart from '../components/market/ComparisonChart';

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

/* ─── Card wrapper ─── */
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
    const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDT');
    const [tradeModalOpen, setTradeModalOpen] = useState(false);
    const [tradeSymbol, setTradeSymbol] = useState<string | null>(null);
    const [tradeSide, setTradeSide] = useState<"BUY" | "SELL" | null>(null);

    // Fetch market instruments
    const { data: instruments = [], isLoading: instrumentsLoading } = useQuery({
        queryKey: ['market-instruments'],
        queryFn: getMarketInstruments,
    });

    // Auto-select first symbol if instruments exist and nothing is selected
    useEffect(() => {
        if (instruments.length > 0 && selectedSymbol === 'BTCUSDT' && !instruments.some(i => i.symbol === 'BTCUSDT')) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedSymbol(instruments[0].symbol);
        }
    }, [instruments, selectedSymbol]);

    // Grouping
    const grouped = useMemo(() => {
        return {
            all: instruments,
            crypto: instruments.filter(i => i.type === 'CRYPTO'),
            forex: instruments.filter(i => i.type === 'FIAT'),
            commodity: instruments.filter(i => i.type === 'COMMODITY'),
            indices: instruments.filter(i => i.type === 'INDEX'),
        };
    }, [instruments]);

    const {
        data: ohlcData,
        isLoading: chartLoading,
        isError: chartError,
    } = useQuery({
        queryKey: ['market-history', selectedSymbol],
        queryFn: () => getMarketHistory(selectedSymbol),
    });

    const openTradeModal = (symbol: string, side: "BUY" | "SELL") => {
        setTradeSymbol(symbol);
        setTradeSide(side);
        setTradeModalOpen(true);
    };

    return (
        <div className="space-y-8">
            {/* Page header */}
            <div>
                <h2 className="text-2xl font-bold text-white">Piyasalar</h2>
                <p className="text-slate-400 mt-1">
                    Küresel piyasaları takip edin, işlem yapın ve AI ile analiz edin.
                </p>
            </div>

            {/* Main Content Grid: Dashboard on left, Analysis on right */}
            {/* Split layout: Top part is for the tabs & list, Bottom part for chart. Or side-by-side depending on requirements. */}

            <Card className="p-1 sm:p-6 overflow-hidden">
                <div className="flex items-center gap-2 mb-6 px-4 sm:px-0">
                    <Activity size={24} className="text-emerald-400" />
                    <h3 className="text-xl font-semibold text-white">
                        Piyasa Özeti (Market Dashboard)
                    </h3>
                </div>

                <Tabs defaultValue="all" className="w-full">
                    <div className="px-4 sm:px-0 mb-6 overflow-x-auto custom-scrollbar">
                        <TabsList className="bg-slate-800/80 border border-slate-700/50 p-1 min-w-max flex">
                            <TabsTrigger value="all" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">Tümü (All)</TabsTrigger>
                            <TabsTrigger value="crypto" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">Kripto (Crypto)</TabsTrigger>
                            <TabsTrigger value="forex" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">Döviz (Forex)</TabsTrigger>
                            <TabsTrigger value="commodity" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">Emtia (Commodity)</TabsTrigger>
                            <TabsTrigger value="indices" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">Endeks (Indices)</TabsTrigger>
                        </TabsList>
                    </div>

                    {instrumentsLoading ? (
                        <div className="animate-pulse space-y-4 px-4 sm:px-0">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-14 bg-slate-700/30 rounded-xl" />
                            ))}
                        </div>
                    ) : (
                        <>
                            <TabsContent value="all" className="mt-0 outline-none">
                                <InstrumentsTable instruments={grouped.all} selectedSymbol={selectedSymbol} onSelectSymbol={setSelectedSymbol} onTrade={openTradeModal} />
                            </TabsContent>
                            <TabsContent value="crypto" className="mt-0 outline-none">
                                <InstrumentsTable instruments={grouped.crypto} selectedSymbol={selectedSymbol} onSelectSymbol={setSelectedSymbol} onTrade={openTradeModal} />
                            </TabsContent>
                            <TabsContent value="forex" className="mt-0 outline-none">
                                <InstrumentsTable instruments={grouped.forex} selectedSymbol={selectedSymbol} onSelectSymbol={setSelectedSymbol} onTrade={openTradeModal} />
                            </TabsContent>
                            <TabsContent value="commodity" className="mt-0 outline-none">
                                <InstrumentsTable instruments={grouped.commodity} selectedSymbol={selectedSymbol} onSelectSymbol={setSelectedSymbol} onTrade={openTradeModal} />
                            </TabsContent>
                            <TabsContent value="indices" className="mt-0 outline-none">
                                <InstrumentsTable instruments={grouped.indices} selectedSymbol={selectedSymbol} onSelectSymbol={setSelectedSymbol} onTrade={openTradeModal} />
                            </TabsContent>
                        </>
                    )}
                </Tabs>
            </Card>

            {/* Chart + AI Insight grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Chart card — spans 2 cols on xl */}
                <Card className="xl:col-span-2">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <CandlestickIcon size={20} className="text-emerald-400" />
                            <h3 className="text-lg font-semibold text-white">
                                {selectedSymbol} — Mum Grafik
                            </h3>
                        </div>
                        <button
                            onClick={() => openTradeModal(selectedSymbol, "BUY")}
                            className="text-sm px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-lg shadow-emerald-900/20 transition-all font-medium"
                        >
                            Hızlı Al
                        </button>
                    </div>

                    {chartLoading && <ChartSkeleton />}

                    {chartError && (
                        <p className="text-red-400 text-sm">
                            Piyasa verileri yüklenemedi. Lütfen tekrar deneyin.
                        </p>
                    )}

                    {ohlcData && <CandlestickChart data={ohlcData} />}
                </Card>

                {/* AI Insight card — 1 col on xl, full-width on smaller */}
                <AIAnalysisCard symbol={selectedSymbol} />
            </div>

            {/* Comparison Chart */}
            <ComparisonChart />

            <TradeModal
                isOpen={tradeModalOpen}
                onClose={() => setTradeModalOpen(false)}
                symbol={tradeSymbol}
                side={tradeSide}
            />
        </div>
    );
};

export default MarketPage;
