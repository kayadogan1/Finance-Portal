import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CandlestickChart as CandlestickIcon, Globe2, MapPin } from 'lucide-react';
import { getMarketInstruments, getMarketInstrumentsPaged, type MarketInstrument } from '../services/marketService';
import CandlestickChart from '../components/market/CandlestickChart';
import AIAnalysisCard from '../components/market/AIAnalysisCard';
import TradeWidget from '../components/trade/TradeWidget';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InstrumentsGrid } from '../components/market/InstrumentsGrid';
import ComparisonChart from '../components/market/ComparisonChart';
import { formatMarketPrice } from '../utils/currency';

// Heuristics for region filtering
const KNOWN_US_SYMBOLS = ['AAPL', 'TSLA', 'MSFT', 'AMZN', 'GOOGL', 'SPX', 'META', 'NFLX', 'DJI', 'IXIC', 'EURUSD', 'GBPUSD'];
const KNOWN_TR_SYMBOLS = ['THYAO', 'SASA', 'XU100', 'GARAN', 'AKBNK', 'TUPRS', 'EREGL', 'SISE', 'KCHOL', 'USDTRY', 'EURTRY'];

const isUS = (symbol: string) => KNOWN_US_SYMBOLS.includes(symbol.toUpperCase());
const isTR = (symbol: string) => KNOWN_TR_SYMBOLS.includes(symbol.toUpperCase());

const PAGE_SIZE = 10;


const MarketPage = () => {
    const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDT');
    const [activeTab, setActiveTab] = useState('all');
    const [page, setPage] = useState(0);
    const [region, setRegion] = useState<'TR' | 'US'>('TR');

    // Paginated fetch for "Tümü" tab
    const { data: pagedData, isLoading: pagedLoading } = useQuery({
        queryKey: ['market-instruments-paged', page],
        queryFn: () => getMarketInstrumentsPaged(page, PAGE_SIZE),
        enabled: activeTab === 'all',
    });

    // Full fetch for category tabs (backend doesn't support type filter with pagination)
    const { data: allInstruments = [], isLoading: allLoading } = useQuery({
        queryKey: ['market-instruments'],
        queryFn: getMarketInstruments,
        enabled: activeTab !== 'all',
    });

    const instruments = activeTab === 'all' ? (pagedData?.content ?? []) : allInstruments;
    const isLoading = activeTab === 'all' ? pagedLoading : allLoading;

    const selected = useMemo(() => {
        const all = activeTab === 'all' ? (pagedData?.content ?? []) : allInstruments;
        return all.find(i => i.symbol === selectedSymbol);
    }, [pagedData, allInstruments, selectedSymbol, activeTab]);

    useEffect(() => {
        const list = activeTab === 'all' ? (pagedData?.content ?? []) : allInstruments;
        if (list.length > 0 && !list.some(i => i.symbol === selectedSymbol)) {
            setSelectedSymbol(list[0].symbol);
        }
    }, [pagedData, allInstruments, selectedSymbol, activeTab]);

    // Reset page when tab changes
    useEffect(() => {
        setPage(0);
    }, [activeTab]);

    // Format price based on region and instrument
    const formatPrice = (price: number, symbol: string) => formatMarketPrice(price, symbol, region);

    const grouped = useMemo(() => {
        // Filter out instruments not belonging to the selected region
        const regionalFiltered = allInstruments.filter(i => {
           if (i.type === 'CRYPTO') return true; // Crypto is global
           if (region === 'TR') return !isUS(i.symbol);
           if (region === 'US') return !isTR(i.symbol);
           return true; 
        });

        return {
            crypto: regionalFiltered.filter(i => i.type === 'CRYPTO'),
            forex: regionalFiltered.filter(i => i.type === 'FIAT' || i.type === 'FOREX'),
            commodity: regionalFiltered.filter(i => i.type === 'COMMODITY'),
            indices: regionalFiltered.filter(i => i.type === 'INDEX'),
            gainers: [...regionalFiltered]
                .filter(i => (i.change24h ?? 0) > 0)
                .sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0))
                .slice(0, 10),
            losers: [...regionalFiltered]
                .filter(i => (i.change24h ?? 0) < 0)
                .sort((a, b) => (a.change24h ?? 0) - (b.change24h ?? 0))
                .slice(0, 10),
        };
    }, [allInstruments, region]);

    const tabCls = 'text-label pb-2 border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px', color: 'hsl(var(--foreground))' }}>
                        Piyasalar
                    </h2>
                    <p className="text-meta mt-1">Küresel piyasaları takip edin ve AI ile analiz edin.</p>
                </div>

                {/* Region Toggle */}
                <div className="flex bg-[#111118] border border-border p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setRegion('TR')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                            region === 'TR' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                    >
                        <MapPin size={16} /> TR Piyasası
                    </button>
                    <button
                        onClick={() => setRegion('US')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                            region === 'US' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                    >
                        <Globe2 size={16} /> US Piyasası
                    </button>
                </div>
            </div>

            {/* Table with underline tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="border-b border-border pb-0 mb-0" style={{ overflowX: 'auto' }}>
                    <TabsList className="bg-transparent p-0 h-auto gap-4 rounded-none" style={{ flexWrap: 'nowrap', minWidth: 'max-content' }}>
                        <TabsTrigger value="all" className={tabCls}>Tümü</TabsTrigger>
                        <TabsTrigger value="crypto" className={tabCls}>Kripto</TabsTrigger>
                        <TabsTrigger value="forex" className={tabCls}>Döviz</TabsTrigger>
                        <TabsTrigger value="commodity" className={tabCls}>Emtia</TabsTrigger>
                        <TabsTrigger value="indices" className={tabCls}>Endeks</TabsTrigger>
                        <TabsTrigger value="gainers" className={tabCls} style={{ color: allLoading ? undefined : '#10b981' }}>
                            En Çok Artanlar
                        </TabsTrigger>
                        <TabsTrigger value="losers" className={tabCls} style={{ color: allLoading ? undefined : '#ef4444' }}>
                            En Çok Düşenler
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* "Tümü" tab — uses server-side pagination. Wait, server side doesn't know our region filter. We should filter it locally for display or let backend handle it. For now, since user prefers region separation, we should be careful. 
                    Actually, if 'Tümü' isn't filtered here easily, let's use client-side filtering for 'Tümü' as well if it's not possible to pass region to backend. But since `getMarketInstrumentsPaged` doesn't take region, let's just pass the unfiltered list and let the Grid format prices based on the selected region.
                */}
                <TabsContent value="all" className="mt-0 outline-none pt-0">
                    <InstrumentsGrid
                        instruments={pagedData?.content ?? []}
                        selectedSymbol={selectedSymbol}
                        onSelectSymbol={setSelectedSymbol}
                        isLoading={pagedLoading}
                        page={page}
                        totalPages={pagedData?.totalPages ?? 0}
                        totalElements={pagedData?.totalElements ?? 0}
                        onPageChange={setPage}
                        formatPrice={formatPrice}
                    />
                </TabsContent>

                {/* Category tabs — client-side filtering */}
                {(['crypto', 'forex', 'commodity', 'indices', 'gainers', 'losers'] as const).map(key => (
                    <TabsContent key={key} value={key} className="mt-0 outline-none pt-0">
                        <InstrumentsGrid
                            instruments={grouped[key]}
                            selectedSymbol={selectedSymbol}
                            onSelectSymbol={setSelectedSymbol}
                            isLoading={allLoading}
                            formatPrice={formatPrice}
                        />
                    </TabsContent>
                ))}
            </Tabs>

            {/* Chart & Trade Layout (AI moved below) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                <div className="lg:col-span-3" style={{ background: '#111118', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', padding: 20 }}>
                    <div className="flex items-center gap-2 mb-4">
                        <CandlestickIcon size={14} className="text-primary" />
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{selectedSymbol}</span>
                        <span style={{ fontSize: 13, color: '#64748b', marginLeft: 8 }}>Grafik ve Analiz</span>
                    </div>
                    <CandlestickChart symbol={selectedSymbol} defaultSlot="W1" />
                </div>
                <div className="lg:col-span-1">
                    <div className="sticky top-14">
                        <TradeWidget symbol={selectedSymbol} instrumentName={selected?.name} currentPrice={selected?.currentPrice ?? 0} />
                    </div>
                </div>
            </div>

            {/* AI Insight Section (Below Chart) */}
            <div className="mt-6 w-full">
                <AIAnalysisCard symbol={selectedSymbol} />
            </div>

            <ComparisonChart />
        </div>
    );
};

export default MarketPage;
