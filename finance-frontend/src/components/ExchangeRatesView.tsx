import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bitcoin, DollarSign, TrendingUp, Globe, RefreshCw, Filter } from 'lucide-react';
import type { Instrument, MarketTabType } from '../types';

const API_BASE = 'http://localhost:8080';

const TABS: { id: MarketTabType; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'ALL', label: 'Tümü', icon: <Globe size={14} />, color: 'slate' },
    { id: 'FOREX', label: 'Döviz', icon: <DollarSign size={14} />, color: 'blue' },
    { id: 'CRYPTO', label: 'Kripto', icon: <Bitcoin size={14} />, color: 'orange' },
    { id: 'STOCK', label: 'Hisse', icon: <TrendingUp size={14} />, color: 'purple' },
];

export default function ExchangeRatesView() {
    const [instruments, setInstruments] = useState<Instrument[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<MarketTabType>('ALL');
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    useEffect(() => {
        fetchInstruments();
        const interval = setInterval(fetchInstruments, 3000);
        return () => clearInterval(interval);
    }, []);

    const fetchInstruments = async () => {
        try {
            const response = await axios.get<Instrument[]>(`${API_BASE}/api/market`);
            setInstruments(response.data);
            setLastUpdate(new Date());
            setLoading(false);
        } catch (err) {
            console.error('Veri çekme hatası:', err);
            setLoading(false);
        }
    };

    const filteredInstruments = activeTab === 'ALL'
        ? instruments
        : instruments.filter(i => i.type === activeTab);

    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'CRYPTO':
                return { icon: <Bitcoin size={16} />, bgColor: 'bg-orange-500/10', textColor: 'text-orange-400', borderColor: 'border-orange-500/20' };
            case 'FOREX':
                return { icon: <DollarSign size={16} />, bgColor: 'bg-blue-500/10', textColor: 'text-blue-400', borderColor: 'border-blue-500/20' };
            case 'STOCK':
                return { icon: <TrendingUp size={16} />, bgColor: 'bg-purple-500/10', textColor: 'text-purple-400', borderColor: 'border-purple-500/20' };
            default:
                return { icon: <Globe size={16} />, bgColor: 'bg-slate-500/10', textColor: 'text-slate-400', borderColor: 'border-slate-500/20' };
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin text-emerald-400" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Filter className="text-emerald-400" size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Piyasa Verileri</h2>
                        <p className="text-xs text-slate-400">
                            Son güncelleme: {lastUpdate.toLocaleTimeString('tr-TR')}
                        </p>
                    </div>
                </div>

                {/* Tab Filtreleri */}
                <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-emerald-500 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredInstruments.map((instrument) => {
                    const config = getTypeConfig(instrument.type);

                    return (
                        <div
                            key={instrument.symbol}
                            className="group bg-slate-800 rounded-xl border border-slate-700 p-5 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                                        {instrument.symbol}
                                    </h3>
                                    <p className="text-xs text-slate-400 line-clamp-1">{instrument.name}</p>
                                </div>
                                <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor}`}>
                                    {config.icon}
                                </span>
                            </div>

                            <div className="mb-3">
                                <p className="text-2xl font-bold text-emerald-400 font-mono">
                                    {new Intl.NumberFormat('tr-TR', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 4
                                    }).format(instrument.currentPrice)}
                                    <span className="text-sm text-slate-400 ml-1">₺</span>
                                </p>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    Canlı
                                </span>
                                <span className="font-mono">
                                    {new Date(instrument.lastUpdateTime).toLocaleTimeString('tr-TR')}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredInstruments.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <Globe className="mx-auto mb-3 opacity-50" size={40} />
                    <p>Bu kategoride enstrüman bulunamadı</p>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {TABS.filter(t => t.id !== 'ALL').map(tab => {
                    const count = instruments.filter(i => i.type === tab.id).length;
                    return (
                        <div
                            key={tab.id}
                            className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 text-center"
                        >
                            <div className={`inline-flex items-center gap-2 text-${tab.color}-400 mb-2`}>
                                {tab.icon}
                                <span className="text-sm font-medium">{tab.label}</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{count}</p>
                            <p className="text-xs text-slate-500">enstrüman</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
