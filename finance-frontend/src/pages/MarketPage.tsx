import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CandlestickChart as CandlestickIcon, Activity } from 'lucide-react';
import { getMarketInstruments } from '../services/marketService';
import CandlestickChart from '../components/market/CandlestickChart';
import AIAnalysisCard from '../components/market/AIAnalysisCard';
import TradeWidget from '../components/trade/TradeWidget';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InstrumentsTable } from '../components/market/InstrumentsTable';
import ComparisonChart from '../components/market/ComparisonChart';


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

    // Fetch market instruments
    const { data: instruments = [], isLoading: instrumentsLoading } = useQuery({
        queryKey: ['market-instruments'],
        queryFn: getMarketInstruments,
    });

    // Derive current price from selected instrument
    const selectedInstrument = useMemo(() => {
        return instruments.find(i => i.symbol === selectedSymbol);
    }, [instruments, selectedSymbol]);
    const currentPrice = selectedInstrument?.currentPrice ?? 0;

    // Auto-select first symbol if instruments exist and nothing is selected
    useEffect(() => {
        if (instruments.length > 0 && selectedSymbol === 'BTCUSDT' && !instruments.some(i => i.symbol === 'BTCUSDT')) {
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

    return (
        <div className="space-y-8">
            {/* Page header */}
            <div>
                <h2 className="text-2xl font-bold text-white">Piyasalar</h2>
                <p className="text-slate-400 mt-1">
                    Küresel piyasaları takip edin ve AI ile analiz edin.
                </p>
            </div>

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
                                <InstrumentsTable instruments={grouped.all} selectedSymbol={selectedSymbol} onSelectSymbol={setSelectedSymbol} />
                            </TabsContent>
                            <TabsContent value="crypto" className="mt-0 outline-none">
                                <InstrumentsTable instruments={grouped.crypto} selectedSymbol={selectedSymbol} onSelectSymbol={setSelectedSymbol} />
                            </TabsContent>
                            <TabsContent value="forex" className="mt-0 outline-none">
                                <InstrumentsTable instruments={grouped.forex} selectedSymbol={selectedSymbol} onSelectSymbol={setSelectedSymbol} />
                            </TabsContent>
                            <TabsContent value="commodity" className="mt-0 outline-none">
                                <InstrumentsTable instruments={grouped.commodity} selectedSymbol={selectedSymbol} onSelectSymbol={setSelectedSymbol} />
                            </TabsContent>
                            <TabsContent value="indices" className="mt-0 outline-none">
                                <InstrumentsTable instruments={grouped.indices} selectedSymbol={selectedSymbol} onSelectSymbol={setSelectedSymbol} />
                            </TabsContent>
                        </>
                    )}
                </Tabs>
            </Card>

            {/* Chart + AI Insight + Trade Widget grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Chart card — spans 2 cols */}
                <Card className="lg:col-span-2">
                    <div className="flex items-center gap-2 mb-5">
                        <CandlestickIcon size={20} className="text-emerald-400" />
                        <h3 className="text-lg font-semibold text-white">
                            {selectedSymbol} — Grafik
                        </h3>
                    </div>

                    <CandlestickChart symbol={selectedSymbol} defaultSlot="W1" />
                </Card>

                {/* AI Insight card */}
                <AIAnalysisCard symbol={selectedSymbol} />

                {/* Trade Widget — sticky on scroll */}
                <div className="lg:col-span-1 xl:col-span-1">
                    <div className="sticky top-6">
                        <TradeWidget
                            symbol={selectedSymbol}
                            instrumentName={selectedInstrument?.name}
                            currentPrice={currentPrice}
                        />
                    </div>
                </div>
            </div>

            {/* Comparison Chart */}
            <ComparisonChart />
        </div>
    );
};

export default MarketPage;
