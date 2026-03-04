import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
    PieChart as PieChartIcon, TrendingUp, TrendingDown, Wallet,
    ArrowDownToLine, ShoppingCart, RefreshCw, Plus, ChevronDown,
} from 'lucide-react';
import {
    getPortfolios,
    getPortfolioPieChart,
    type PortfolioDto,
} from '../services/portfolioService';
import PortfolioPieChart from '../components/portfolio/PortfolioPieChart';
import PerformanceAreaChart from '../components/portfolio/PerformanceAreaChart';
import { CreatePortfolioModal } from '../components/portfolio/CreatePortfolioModal';
import { DepositModal } from '../components/portfolio/DepositModal';
import { TradeModal } from '../components/trade/TradeModal';
import useAuth from '../hooks/useAuth';

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-slate-800/50 backdrop-blur border border-slate-700/60 rounded-2xl p-6 shadow-lg ${className}`}>
        {children}
    </div>
);

const ChartSkeleton = () => (
    <div className="animate-pulse">
        <div className="h-[280px] bg-slate-700/20 rounded-xl" />
    </div>
);

const PortfolioPage = () => {
    const { isAdmin } = useAuth();

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [depositModalOpen, setDepositModalOpen] = useState(false);
    const [sellSymbol, setSellSymbol] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectorOpen, setSelectorOpen] = useState(false);

    // Fetch all portfolios for the user
    const { data: portfolios, isLoading: portsLoading } = useQuery({
        queryKey: ['portfolio'],
        queryFn: getPortfolios,
    });

    const hasPortfolio = portfolios && portfolios.length > 0;
    const activePortfolio: PortfolioDto | null =
        hasPortfolio ? portfolios[selectedIndex] ?? portfolios[0] : null;

    // Pie chart — uses REAL activePortfolio.id, only runs when id exists
    const { data: pieData, isLoading: pieLoading, isError: pieError } = useQuery({
        queryKey: ['portfolio-pie', activePortfolio?.id],
        queryFn: () => getPortfolioPieChart(activePortfolio!.id),
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
        enabled: !!activePortfolio?.id,
    });

    if (portsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin text-emerald-400" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header — create button hidden for admins */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Portföy Yönetimi</h2>
                    <p className="text-slate-400 mt-1">
                        Yatırımlarınızı ve varlık dağılımınızı takip edin.
                    </p>
                </div>
                {!isAdmin && (
                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-500/20"
                    >
                        <Plus size={16} />
                        Yeni Portföy
                    </button>
                )}
            </div>

            {!hasPortfolio ? (
                <div className="bg-slate-800/50 backdrop-blur border border-slate-700/60 rounded-2xl p-12 text-center">
                    <Wallet className="mx-auto mb-4 text-slate-500" size={48} />
                    <h3 className="text-xl font-semibold text-white mb-2">
                        {isAdmin ? 'Yönetici Paneli' : 'Henüz Bir Portföyünüz Yok'}
                    </h3>
                    <p className="text-slate-400 mb-6 max-w-md mx-auto">
                        {isAdmin
                            ? 'Yöneticiler portföy oluşturamaz. Kullanıcı portföylerini görüntüleyebilirsiniz.'
                            : 'Portföy oluşturarak yatırımlarınızı takip etmeye başlayabilir ve piyasa analizlerinden faydalanabilirsiniz.'}
                    </p>
                    {!isAdmin && (
                        <button
                            onClick={() => setCreateModalOpen(true)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            Hemen Oluştur
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Portfolio Selector (visible when multiple portfolios exist) */}
                    {portfolios.length > 1 && (
                        <div className="relative w-fit">
                            <button
                                onClick={() => setSelectorOpen((p) => !p)}
                                className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-5 py-3 text-white font-medium hover:bg-slate-700 transition-colors"
                            >
                                <Wallet size={16} className="text-emerald-400" />
                                {activePortfolio?.portfolioName}
                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${selectorOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {selectorOpen && (
                                <div className="absolute top-full mt-2 left-0 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-30">
                                    {portfolios.map((p, idx) => (
                                        <button
                                            key={p.id}
                                            onClick={() => { setSelectedIndex(idx); setSelectorOpen(false); }}
                                            className={`w-full text-left px-4 py-3 text-sm transition-colors
                                                ${idx === selectedIndex
                                                    ? 'bg-emerald-500/10 text-emerald-400'
                                                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                                                }`}
                                        >
                                            <p className="font-medium">{p.portfolioName}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">{p.riskTolerance} · {p.purpose}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 rounded-xl p-5 border border-emerald-500/30 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-emerald-300 text-sm font-medium">Nakit Bakiye</span>
                                <Wallet className="text-emerald-400" size={20} />
                            </div>
                            <p className="text-2xl font-bold text-white">
                                {Number(activePortfolio?.portfolioBalance ?? 0).toLocaleString('tr-TR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })} ₺
                            </p>
                        </div>

                        {!isAdmin && (
                            <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-5 border border-purple-500/30 backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-purple-300 text-sm font-medium">Hızlı İşlemler</span>
                                    <ShoppingCart className="text-purple-400" size={20} />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setDepositModalOpen(true)}
                                        className="flex-1 flex items-center justify-center gap-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg py-2 text-sm font-medium transition-colors"
                                    >
                                        <ArrowDownToLine size={14} />
                                        Para Yatır
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Charts grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <div className="flex items-center gap-2 mb-4">
                                <PieChartIcon size={20} className="text-emerald-400" />
                                <h3 className="text-lg font-semibold text-white">Varlık Dağılımı</h3>
                            </div>
                            {pieLoading && <ChartSkeleton />}
                            {pieError && <p className="text-red-400 text-sm">Dağılım verileri yüklenemedi.</p>}
                            {pieData && <PortfolioPieChart data={pieData} />}
                            {!pieLoading && !pieError && !pieData && (
                                <div className="flex items-center justify-center h-[280px] text-slate-500 text-sm">
                                    Varlık dağılımı verisi bulunamadı.
                                </div>
                            )}
                        </Card>

                        <Card>
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp size={20} className="text-emerald-400" />
                                <h3 className="text-lg font-semibold text-white">Portföy Performansı</h3>
                            </div>
                            {activePortfolio?.id ? (
                                <PerformanceAreaChart portfolioId={activePortfolio.id} />
                            ) : (
                                <div className="flex items-center justify-center h-[280px] text-slate-500 text-sm">
                                    Portföy ID bulunamadı.
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Portfolio Items Table */}
                    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-700">
                            <h2 className="text-lg font-semibold text-white">
                                Pozisyonlarım ({activePortfolio?.portfolioName})
                            </h2>
                        </div>
                        {!activePortfolio?.portfolioItems?.length ? (
                            <div className="p-12 text-center text-slate-400">
                                <Wallet className="mx-auto mb-3 opacity-50" size={40} />
                                <p>Henüz enstrümanınız yok</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="p-4 text-left font-semibold">Sembol</th>
                                            <th className="p-4 text-right font-semibold">Miktar</th>
                                            <th className="p-4 text-right font-semibold">Ort. Maliyet</th>
                                            <th className="p-4 text-right font-semibold">Güncel Fiyat</th>
                                            <th className="p-4 text-right font-semibold">Toplam Değer</th>
                                            <th className="p-4 text-right font-semibold">K/Z</th>
                                            {!isAdmin && <th className="p-4 text-center font-semibold">İşlem</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {activePortfolio.portfolioItems.map((item, idx) => {
                                            const symbol = item.instrumentDto?.symbol ?? item.instrumentSymbol ?? '—';
                                            const currentPrice = item.instrumentDto?.currentPrice ?? 0;
                                            const amount = Number(item.amount ?? 0);
                                            const avgCost = Number(item.averageCost ?? 0);
                                            const totalValue = amount * currentPrice;
                                            const totalCost = amount * avgCost;
                                            const pnl = totalValue - totalCost;
                                            const pnlPercent = totalCost > 0 ? ((pnl / totalCost) * 100) : 0;
                                            const isProfit = pnl >= 0;

                                            return (
                                                <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                                                    <td className="p-4">
                                                        <div>
                                                            <span className="font-bold text-white">{symbol}</span>
                                                            {item.instrumentDto?.name && (
                                                                <p className="text-[11px] text-slate-500 mt-0.5">{item.instrumentDto.name}</p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right text-slate-300 font-mono text-sm">
                                                        {amount.toLocaleString('tr-TR', { maximumFractionDigits: 6 })}
                                                    </td>
                                                    <td className="p-4 text-right text-slate-300 font-mono text-sm">
                                                        {avgCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                                                    </td>
                                                    <td className="p-4 text-right text-white font-mono text-sm font-medium">
                                                        {currentPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                                                    </td>
                                                    <td className="p-4 text-right text-white font-mono text-sm font-semibold">
                                                        {totalValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono font-semibold ${isProfit
                                                            ? 'bg-emerald-500/10 text-emerald-400'
                                                            : 'bg-red-500/10 text-red-400'
                                                            }`}>
                                                            {isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                            {isProfit ? '+' : ''}{pnl.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                                                            <span className="text-[10px] opacity-70">({isProfit ? '+' : ''}{pnlPercent.toFixed(1)}%)</span>
                                                        </div>
                                                    </td>
                                                    {!isAdmin && (
                                                        <td className="p-4 text-center">
                                                            <button
                                                                onClick={() => setSellSymbol(symbol)}
                                                                className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 rounded-lg text-xs font-medium transition-colors border border-red-500/20"
                                                            >
                                                                Sat
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Recent Transactions */}
                    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-700">
                            <h2 className="text-lg font-semibold text-white">Son İşlemler</h2>
                        </div>
                        <div className="p-12 text-center text-slate-400">
                            <RefreshCw className="mx-auto mb-3 opacity-50" size={40} />
                            <p>İşlem geçmişi yakında aktif olacak.</p>
                        </div>
                    </div>
                </>
            )}

            {/* Modals — only for non-admin users */}
            {!isAdmin && (
                <>
                    <CreatePortfolioModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
                    {activePortfolio?.id && (
                        <DepositModal
                            isOpen={depositModalOpen}
                            onClose={() => setDepositModalOpen(false)}
                            portfolioId={activePortfolio.id}
                        />
                    )}
                    {sellSymbol && activePortfolio?.id && (
                        <TradeModal
                            isOpen={Boolean(sellSymbol)}
                            onClose={() => setSellSymbol(null)}
                            symbol={sellSymbol}
                            side="SELL"
                            portfolioId={activePortfolio.id}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default PortfolioPage;
