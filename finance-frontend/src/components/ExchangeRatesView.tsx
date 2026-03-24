import { useState, useEffect } from 'react';
import { publicApi } from '../services/api';
import toast from 'react-hot-toast';
import { Bitcoin, DollarSign, TrendingUp, Globe, RefreshCw, Filter } from 'lucide-react';
import type { Instrument, MarketTabType } from '../types';

const TABS: { id: MarketTabType; label: string; icon: React.ReactNode }[] = [
    { id: 'ALL', label: 'Tümü', icon: <Globe size={13} /> },
    { id: 'FOREX', label: 'Döviz', icon: <DollarSign size={13} /> },
    { id: 'CRYPTO', label: 'Kripto', icon: <Bitcoin size={13} /> },
    { id: 'STOCK', label: 'Hisse', icon: <TrendingUp size={13} /> },
];

export default function ExchangeRatesView() {
    const [instruments, setInstruments] = useState<Instrument[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<MarketTabType>('ALL');
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const fetchInstruments = async () => {
        try {
            const { data } = await publicApi.get('/api/public/exchange-rates');
            setInstruments(data); setLastUpdate(new Date()); setLoading(false);
        } catch (err) {
            console.error('Veri çekme hatası:', err); toast.error('Piyasa verileri yüklenemedi.'); setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchInstruments();
        const interval = setInterval(fetchInstruments, 3000);
        return () => clearInterval(interval);
    }, []);

    const filteredInstruments = activeTab === 'ALL' ? instruments : instruments.filter(i => i.type === activeTab);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'CRYPTO': return <Bitcoin size={13} className="text-[#F97316]" />;
            case 'FOREX': return <DollarSign size={13} className="text-[#3B82F6]" />;
            case 'STOCK': return <TrendingUp size={13} className="text-[#8B5CF6]" />;
            default: return <Globe size={13} className="text-subtle" />;
        }
    };

    if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-primary" size={24} /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2.5">
                    <Filter size={16} className="text-primary" />
                    <div>
                        <h2 className="text-[20px] font-semibold tracking-[-0.2px] text-foreground">Piyasa Verileri</h2>
                        <p className="text-meta">Son güncelleme: {lastUpdate.toLocaleTimeString('tr-TR')}</p>
                    </div>
                </div>

                {/* Tab filters — underline style */}
                <div className="border-b border-border">
                    <div className="flex gap-5">
                        {TABS.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 text-label pb-2 border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                                {tab.icon}
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredInstruments.map(instrument => (
                    <div key={instrument.symbol} className="card-base !p-4 group hover:border-border/60 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="text-[13px] font-semibold text-foreground">{instrument.symbol}</h3>
                                <p className="text-meta line-clamp-1">{instrument.name}</p>
                            </div>
                            {getTypeIcon(instrument.type)}
                        </div>
                        <p className="text-data">
                            {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(instrument.currentPrice)}
                            <span className="text-subtle text-[11px] ml-1">₺</span>
                        </p>
                        <div className="flex items-center justify-between mt-2 text-meta">
                            <span className="flex items-center gap-1">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-positive"></span>
                                </span>
                                Canlı
                            </span>
                            <span className="tabular-nums">{new Date(instrument.lastUpdateTime).toLocaleTimeString('tr-TR')}</span>
                        </div>
                    </div>
                ))}
            </div>

            {filteredInstruments.length === 0 && (
                <div className="text-center py-10">
                    <Globe className="mx-auto mb-2 text-ghost" size={28} />
                    <p className="text-[13px] text-muted-foreground">Bu kategoride enstrüman bulunamadı</p>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {TABS.filter(t => t.id !== 'ALL').map(tab => {
                    const count = instruments.filter(i => i.type === tab.id).length;
                    return (
                        <div key={tab.id} className="card-base text-center">
                            <div className="inline-flex items-center gap-1.5 mb-1.5">{tab.icon}<span className="text-[12px] font-medium text-muted-foreground">{tab.label}</span></div>
                            <p className="text-data">{count}</p>
                            <p className="text-meta">enstrüman</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
