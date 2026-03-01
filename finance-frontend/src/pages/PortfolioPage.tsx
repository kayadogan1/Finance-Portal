import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
    PieChart as PieChartIcon, TrendingUp, Wallet,
    ArrowDownToLine, ShoppingCart, RefreshCw,
} from 'lucide-react';
import {
    getPortfolios,
    getPortfolioPieChart,
} from '../services/portfolioService';
import PortfolioPieChart from '../components/portfolio/PortfolioPieChart';
import PerformanceAreaChart from '../components/portfolio/PerformanceAreaChart';
import { CreatePortfolioModal } from '../components/portfolio/CreatePortfolioModal';
import { DepositModal } from '../components/portfolio/DepositModal';
import { TradeModal } from '../components/trade/TradeModal';

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

// TODO: Backend PortfolioDto does not expose the portfolio `id` field.
// Once the backend team adds it, replace this constant with the real portfolio ID.
export const DUMMY_PORTFOLIO_ID = "123e4567-e89b-12d3-a456-426614174000";

const PortfolioPage = () => {
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [depositModalOpen, setDepositModalOpen] = useState(false);
    const [sellSymbol, setSellSymbol] = useState<string | null>(null);

    // Fetch portfolios (needed to check if user has one)
    const { data: portfolios, isLoading: portsLoading } = useQuery({
        queryKey: ['portfolio'],
        queryFn: getPortfolios,
    });

    const hasPortfolio = portfolios && portfolios.length > 0;
    const activePortfolio = hasPortfolio ? portfolios[0] : null;

    // Pie chart data — aggressively cached (5 min staleTime)
    const { data: pieData, isLoading: pieLoading, isError: pieError } = useQuery({
        queryKey: ['portfolio-pie', DUMMY_PORTFOLIO_ID],
        queryFn: () => getPortfolioPieChart(DUMMY_PORTFOLIO_ID),
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
        enabled: hasPortfolio ?? false,
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
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Portföy Yönetimi</h2>
                    <p className="text-slate-400 mt-1">
                        Yatırımlarınızı ve varlık dağılımınızı takip edin.
                    </p>
                </div>
                {!hasPortfolio && (
                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
                    >
                        Portföy Oluştur
                    </button>
                )}
            </div>

            {!hasPortfolio ? (
                <div className="bg-slate-800/50 backdrop-blur border border-slate-700/60 rounded-2xl p-12 text-center">
                    <Wallet className="mx-auto mb-4 text-slate-500" size={48} />
                    <h3 className="text-xl font-semibold text-white mb-2">Henüz Bir Portföyünüz Yok</h3>
                    <p className="text-slate-400 mb-6 max-w-md mx-auto">
                        Portföy oluşturarak yatırımlarınızı takip etmeye başlayabilir ve piyasa analizlerinden faydalanabilirsiniz.
                    </p>
                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                        Hemen Oluştur
                    </button>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 rounded-xl p-5 border border-emerald-500/30 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-emerald-300 text-sm font-medium">Nakit Bakiye</span>
                                <Wallet className="text-emerald-400" size={20} />
                            </div>
                            <p className="text-2xl font-bold text-white">
                                {/* TODO: Backend doesn't return cashBalance in PortfolioDto */}
                                0.00 ₺
                            </p>
                        </div>

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
                                    <ArrowDownToLine size={14} /> Para Yatır
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Charts grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pie Chart — Backend: GET /api/portfolio/value/{portfolioId} */}
                        <Card>
                            <div className="flex items-center gap-2 mb-4">
                                <PieChartIcon size={20} className="text-emerald-400" />
                                <h3 className="text-lg font-semibold text-white">Varlık Dağılımı</h3>
                            </div>
                            {pieLoading && <ChartSkeleton />}
                            {pieError && <p className="text-red-400 text-sm">Dağılım verileri yüklenemedi.</p>}
                            {pieData && <PortfolioPieChart data={pieData} />}
                        </Card>

                        {/* Performance Area Chart — Backend: GET /api/portfolio/{portfolioId}/history?days=N */}
                        <Card>
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp size={20} className="text-emerald-400" />
                                <h3 className="text-lg font-semibold text-white">Portföy Performansı</h3>
                            </div>
                            <PerformanceAreaChart portfolioId={DUMMY_PORTFOLIO_ID} />
                        </Card>
                    </div>

                    {/* Portfolio Items Table */}
                    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-700">
                            <h2 className="text-lg font-semibold text-white">Pozisyonlarım ({activePortfolio?.portfolioName})</h2>
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
                                            <th className="p-4 text-left font-semibold">Miktar</th>
                                            <th className="p-4 text-right font-semibold">Ort. Maliyet</th>
                                            <th className="p-4 text-center font-semibold">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {activePortfolio.portfolioItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-700/50 transition-colors">
                                                <td className="p-4 font-bold text-white">{item.instrumentSymbol}</td>
                                                <td className="p-4 text-slate-300 font-mono">{item.quantity}</td>
                                                <td className="p-4 text-right text-slate-300 font-mono">{Number(item.averageCost).toFixed(2)} ₺</td>
                                                <td className="p-4 text-center">
                                                    <button
                                                        onClick={() => setSellSymbol(item.instrumentSymbol)}
                                                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-medium transition-colors"
                                                    >
                                                        Sat
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Recent Transactions Placeholder */}
                    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-700">
                            <h2 className="text-lg font-semibold text-white">Son İşlemler</h2>
                        </div>
                        <div className="p-12 text-center text-slate-400">
                            {/* TODO: Backend needs GET /api/portfolio/transactions endpoint */}
                            <RefreshCw className="mx-auto mb-3 opacity-50" size={40} />
                            <p>Transaction history endpoint pending.</p>
                        </div>
                    </div>
                </>
            )}

            {/* Modals */}
            <CreatePortfolioModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
            <DepositModal isOpen={depositModalOpen} onClose={() => setDepositModalOpen(false)} />
            {sellSymbol && (
                <TradeModal
                    isOpen={Boolean(sellSymbol)}
                    onClose={() => setSellSymbol(null)}
                    symbol={sellSymbol}
                    side="SELL"
                />
            )}
        </div>
    );
};

export default PortfolioPage;
