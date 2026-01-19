import { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, RefreshCw, TrendingUp, DollarSign, Bitcoin, Globe } from 'lucide-react';

interface Instrument {
  symbol: string;
  name: string;
  currentPrice: number;
  type: string;
  lastUpdate: string;
}

function App() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastFetch, setLastFetch] = useState<Date>(new Date());

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchMarketData = () => {
    axios.get("http://localhost:8080/api/market")
      .then(response => {
        setInstruments(response.data);
        setLoading(false);
        setLastFetch(new Date());
      })
      .catch(err => console.error("Hata:", err));
  };

  // Enstrüman tipine göre ikon ve renk belirleme
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'CRYPTO':
        return <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20"><Bitcoin size={12} /> Kripto</span>;
      case 'FOREX':
        return <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20"><DollarSign size={12} /> Döviz</span>;
      case 'STOCK':
        return <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20"><TrendingUp size={12} /> Hisse</span>;
      default:
        return <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-500/10 text-gray-400 rounded-full border border-gray-500/20"><Globe size={12} /> {type}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-8 font-sans">
      
      {/* HEADER KISMI */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Activity className="text-emerald-400" size={32} />
            Finans Portalı
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Canlı Piyasa Verileri ve Portföy Takibi</p>
        </div>

        <div className="flex items-center gap-4 bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Canlı</span>
          </div>
          <div className="h-4 w-px bg-slate-600"></div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Son Güncelleme: {lastFetch.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* TABLO KISMI */}
      <div className="max-w-6xl mx-auto bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">Veriler Yükleniyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs tracking-wider">
                <tr>
                  <th className="p-4 font-semibold">Sembol</th>
                  <th className="p-4 font-semibold">Enstrüman Adı</th>
                  <th className="p-4 font-semibold">Tip</th>
                  <th className="p-4 font-semibold text-right">Fiyat</th>
                  <th className="p-4 font-semibold text-right">Zaman</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {instruments.map((item) => (
                  <tr key={item.symbol} className="hover:bg-slate-700/50 transition-colors duration-150 group">
                    <td className="p-4">
                      <span className="font-bold text-white text-lg">{item.symbol}</span>
                    </td>
                    <td className="p-4 text-slate-300 font-medium">{item.name}</td>
                    <td className="p-4">
                      {getTypeBadge(item.type)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-mono text-lg font-bold text-emerald-400 group-hover:text-emerald-300">
                         {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(item.currentPrice)} ₺
                      </div>
                    </td>
                    <td className="p-4 text-right text-sm text-slate-500 font-mono">
                      {new Date(item.lastUpdate).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="max-w-6xl mx-auto mt-6 text-center text-slate-600 text-xs">
        Data provided by Yahoo Finance & Binance APIs via Spring Boot
      </div>
    </div>
  );
}

export default App;