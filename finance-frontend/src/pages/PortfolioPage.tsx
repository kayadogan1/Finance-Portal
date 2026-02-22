import { useQuery } from '@tanstack/react-query';
import { PieChart, TrendingUp } from 'lucide-react';
import { getDistribution, getHistory } from '../services/portfolioService';
import PortfolioDistributionChart from '../components/portfolio/PortfolioDistributionChart';
import PortfolioHistoryChart from '../components/portfolio/PortfolioHistoryChart';

const ChartSkeleton = ({ className = '' }: { className?: string }) => (
    <div className={`animate-pulse ${className}`}>
        <div className="h-5 w-40 bg-slate-700 rounded mb-6" />
        <div className="space-y-3">
            <div className="h-4 bg-slate-700/60 rounded w-full" />
            <div className="h-4 bg-slate-700/40 rounded w-5/6" />
            <div className="h-48 bg-slate-700/30 rounded-xl mt-4" />
            <div className="h-4 bg-slate-700/40 rounded w-3/4 mt-4" />
            <div className="h-4 bg-slate-700/30 rounded w-1/2" />
        </div>
    </div>
);

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

const PortfolioPage = () => {
    const {
        data: distribution,
        isLoading: distLoading,
        isError: distError,
    } = useQuery({
        queryKey: ['portfolio-distribution'],
        queryFn: getDistribution,
    });

    const {
        data: history,
        isLoading: histLoading,
        isError: histError,
    } = useQuery({
        queryKey: ['portfolio-history'],
        queryFn: getHistory,
    });

    return (
        <div className="space-y-8">
            {/* Page header */}
            <div>
                <h2 className="text-2xl font-bold text-white">Portföy Analizi</h2>
                <p className="text-slate-400 mt-1">
                    Varlık dağılımınız ve portföy değer geçmişiniz
                </p>
            </div>

            {/* Charts grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Distribution Chart */}
                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <PieChart size={20} className="text-emerald-400" />
                        <h3 className="text-lg font-semibold text-white">
                            Varlık Dağılımı
                        </h3>
                    </div>

                    {distLoading && <ChartSkeleton />}
                    {distError && (
                        <p className="text-red-400 text-sm">
                            Dağılım verileri yüklenemedi.
                        </p>
                    )}
                    {distribution && <PortfolioDistributionChart data={distribution} />}
                </Card>

                {/* History Chart */}
                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp size={20} className="text-emerald-400" />
                        <h3 className="text-lg font-semibold text-white">
                            Portföy Değer Geçmişi
                        </h3>
                    </div>

                    {histLoading && <ChartSkeleton />}
                    {histError && (
                        <p className="text-red-400 text-sm">
                            Geçmiş verileri yüklenemedi.
                        </p>
                    )}
                    {history && <PortfolioHistoryChart data={history} />}
                </Card>
            </div>
        </div>
    );
};

export default PortfolioPage;
