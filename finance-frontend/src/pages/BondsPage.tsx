import { Landmark, BarChart3, Info } from 'lucide-react';
import NewsGrid from '../components/news/NewsGrid';

const BondsPage = () => {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <Landmark className="text-amber-400" size={28} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Tahvil & Bono</h2>
                    <p className="text-slate-400 text-sm">Makroekonomik gelişmeleri ve faiz piyasalarını takip edin</p>
                </div>
            </div>

            {/* Bond overview cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-amber-600/10 to-amber-800/10 rounded-xl p-5 border border-amber-500/20 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <BarChart3 size={18} className="text-amber-400" />
                        <span className="text-amber-300 text-sm font-medium">10Y US Treasury</span>
                    </div>
                    <p className="text-2xl font-bold text-white">4.25%</p>
                    <p className="text-xs text-slate-400 mt-1">Son güncelleme: Piyasa açılışı</p>
                </div>

                <div className="bg-gradient-to-br from-amber-600/10 to-amber-800/10 rounded-xl p-5 border border-amber-500/20 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <BarChart3 size={18} className="text-amber-400" />
                        <span className="text-amber-300 text-sm font-medium">2Y US Treasury</span>
                    </div>
                    <p className="text-2xl font-bold text-white">4.65%</p>
                    <p className="text-xs text-slate-400 mt-1">Son güncelleme: Piyasa açılışı</p>
                </div>

                <div className="bg-gradient-to-br from-amber-600/10 to-amber-800/10 rounded-xl p-5 border border-amber-500/20 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <BarChart3 size={18} className="text-amber-400" />
                        <span className="text-amber-300 text-sm font-medium">TCMB Politika Faizi</span>
                    </div>
                    <p className="text-2xl font-bold text-white">45.00%</p>
                    <p className="text-xs text-slate-400 mt-1">Son güncelleme: 2025 Q4</p>
                </div>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                <Info size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm text-amber-200 font-medium">Tahvil Verileri</p>
                    <p className="text-xs text-slate-400 mt-1">
                        Canlı tahvil fiyatı verileri henüz backend tarafında mevcut değildir.
                        Yukarıdaki referans değerler statik olarak gösterilmektedir.
                        Gerçek zamanlı veri entegrasyonu için Finnhub veya Polygon.io API'si önerilir.
                    </p>
                </div>
            </div>

            {/* Economy-focused news */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/60 rounded-2xl p-6 shadow-lg">
                <NewsGrid topic="ECONOMY" title="Ekonomi Haberleri" columns={3} maxItems={12} />
            </div>
        </div>
    );
};

export default BondsPage;
