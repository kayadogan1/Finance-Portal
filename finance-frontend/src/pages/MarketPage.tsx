import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CandlestickChart as CandlestickIcon } from 'lucide-react';
import { getMarketInstruments } from '../services/marketService';
import CandlestickChart from '../components/market/CandlestickChart';
import AIAnalysisCard from '../components/market/AIAnalysisCard';
import TradeWidget from '../components/trade/TradeWidget';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InstrumentsTable } from '../components/market/InstrumentsTable';
import ComparisonChart from '../components/market/ComparisonChart';

const MarketPage = () => {
    const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDT');

    const { data: instruments = [], isLoading } = useQuery({
        queryKey: ['market-instruments'],
        queryFn: getMarketInstruments,
    });

    const selected = useMemo(() => instruments.find(i => i.symbol === selectedSymbol), [instruments, selectedSymbol]);

    useEffect(() => {
        if (instruments.length > 0 && !instruments.some(i => i.symbol === selectedSymbol)) {
            setSelectedSymbol(instruments[0].symbol);
        }
    }, [instruments, selectedSymbol]);

    const grouped = useMemo(() => ({
        all: instruments,
        crypto: instruments.filter(i => i.type === 'CRYPTO'),
        forex: instruments.filter(i => i.type === 'FIAT'),
        commodity: instruments.filter(i => i.type === 'COMMODITY'),
        indices: instruments.filter(i => i.type === 'INDEX'),
    }), [instruments]);

    const tabCls = 'text-label pb-2 border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground';

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-[20px] font-semibold tracking-[-0.2px] text-foreground">Piyasalar</h2>
                <p className="text-meta mt-1">Küresel piyasaları takip edin ve AI ile analiz edin.</p>
            </div>

            {/* Table with underline tabs */}
            <Tabs defaultValue="all" className="w-full">
                <div className="border-b border-border pb-0 mb-0">
                    <TabsList className="bg-transparent p-0 h-auto gap-6 rounded-none">
                        <TabsTrigger value="all" className={tabCls}>Tümü</TabsTrigger>
                        <TabsTrigger value="crypto" className={tabCls}>Kripto</TabsTrigger>
                        <TabsTrigger value="forex" className={tabCls}>Döviz</TabsTrigger>
                        <TabsTrigger value="commodity" className={tabCls}>Emtia</TabsTrigger>
                        <TabsTrigger value="indices" className={tabCls}>Endeks</TabsTrigger>
                    </TabsList>
                </div>

                {isLoading ? (
                    <div className="animate-pulse space-y-2 pt-4">
                        {[1,2,3,4,5].map(i => <div key={i} className="h-11 rounded bg-white/[0.03]" />)}
                    </div>
                ) : (
                    <>
                        {(['all','crypto','forex','commodity','indices'] as const).map(key => (
                            <TabsContent key={key} value={key} className="mt-0 outline-none pt-0">
                                <InstrumentsTable instruments={grouped[key]} selectedSymbol={selectedSymbol} onSelectSymbol={setSelectedSymbol} />
                            </TabsContent>
                        ))}
                    </>
                )}
            </Tabs>

            {/* Chart + AI + Trade */}
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                <div className="lg:col-span-2 card-base">
                    <div className="flex items-center gap-2 mb-4">
                        <CandlestickIcon size={14} className="text-primary" />
                        <span className="text-[14px] font-medium text-foreground">{selectedSymbol}</span>
                    </div>
                    <CandlestickChart symbol={selectedSymbol} defaultSlot="W1" />
                </div>
                <AIAnalysisCard symbol={selectedSymbol} />
                <div className="lg:col-span-1 xl:col-span-1">
                    <div className="sticky top-14">
                        <TradeWidget symbol={selectedSymbol} instrumentName={selected?.name} currentPrice={selected?.currentPrice ?? 0} />
                    </div>
                </div>
            </div>

            <ComparisonChart />
        </div>
    );
};

export default MarketPage;
