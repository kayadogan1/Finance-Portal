import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
    PieChart as PieChartIcon, TrendingUp, TrendingDown, Wallet,
    ArrowDownToLine, RefreshCw, Plus, ChevronDown,
} from 'lucide-react';
import {
    getPortfolios, getPortfolioPieChart, type PortfolioDto,
} from '../services/portfolioService';
import PortfolioPieChart from '../components/portfolio/PortfolioPieChart';
import PerformanceAreaChart from '../components/portfolio/PerformanceAreaChart';
import { CreatePortfolioModal } from '../components/portfolio/CreatePortfolioModal';
import { DepositModal } from '../components/portfolio/DepositModal';
import { TradeModal } from '../components/trade/TradeModal';
import useAuth from '../hooks/useAuth';

const PortfolioPage = () => {
    const { isAdmin } = useAuth();
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [depositModalOpen, setDepositModalOpen] = useState(false);
    const [sellSymbol, setSellSymbol] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectorOpen, setSelectorOpen] = useState(false);

    const { data: portfolios, isLoading: portsLoading } = useQuery({
        queryKey: ['portfolio'], queryFn: getPortfolios,
    });

    const hasPortfolio = portfolios && portfolios.length > 0;
    const active: PortfolioDto | null = hasPortfolio ? portfolios[selectedIndex] ?? portfolios[0] : null;

    const { data: pieData, isLoading: pieLoading, isError: pieError } = useQuery({
        queryKey: ['portfolio-pie', active?.id],
        queryFn: () => getPortfolioPieChart(active!.id),
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
        enabled: !!active?.id,
    });

    if (portsLoading) {
        return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-primary" size={24} /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.2px] text-foreground">Portföy Yönetimi</h2>
                    <p className="text-meta mt-1">Yatırımlarınızı ve varlık dağılımınızı takip edin.</p>
                </div>
                {!isAdmin && (
                    <button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-1.5 px-4 h-9 rounded text-[13px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                        <Plus size={14} /> Yeni Portföy
                    </button>
                )}
            </div>

            {!hasPortfolio ? (
                <div className="card-base text-center !py-12">
                    <Wallet className="mx-auto mb-4 text-ghost" size={36} />
                    <h3 className="text-[16px] font-semibold text-foreground mb-1">{isAdmin ? 'Yönetici Paneli' : 'Henüz Bir Portföyünüz Yok'}</h3>
                    <p className="text-meta mb-5 max-w-md mx-auto">
                        {isAdmin ? 'Yöneticiler portföy oluşturamaz.' : 'Portföy oluşturarak yatırımlarınızı takip etmeye başlayabilirsiniz.'}
                    </p>
                    {!isAdmin && (
                        <button onClick={() => setCreateModalOpen(true)} className="px-5 h-9 rounded text-[13px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                            Hemen Oluştur
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Portfolio selector */}
                    {portfolios.length > 1 && (
                        <div className="relative w-fit">
                            <button onClick={() => setSelectorOpen(p => !p)} className="flex items-center gap-2 px-4 h-9 rounded text-[13px] font-medium bg-card border border-border text-foreground hover:border-border/60 transition-colors">
                                <Wallet size={14} className="text-primary" />
                                {active?.portfolioName}
                                <ChevronDown size={12} className={`text-subtle transition-transform ${selectorOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {selectorOpen && (
                                <div className="absolute top-full mt-1 left-0 w-52 bg-card border border-border rounded shadow-none z-30">
                                    {portfolios.map((p, idx) => (
                                        <button
                                            key={p.id}
                                            onClick={() => { setSelectedIndex(idx); setSelectorOpen(false); }}
                                            className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${idx === selectedIndex ? 'text-primary bg-white/5' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                                        >
                                            <p className="font-medium">{p.portfolioName}</p>
                                            <p className="text-[10px] text-subtle mt-0.5">{p.riskTolerance} · {p.purpose}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Balance — left border accent, no colored bg */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="py-4 px-5 border-l-2 border-primary">
                            <span className="text-label">NAKİT BAKİYE</span>
                            <div className="flex items-baseline gap-2 mt-1.5">
                                <span className="text-price">
                                    {Number(active?.portfolioBalance ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-label">TRY</span>
                            </div>
                        </div>
                        {!isAdmin && (
                            <div className="card-base">
                                <span className="text-label">Hızlı İşlemler</span>
                                <div className="flex gap-2 mt-3">
                                    <button onClick={() => setDepositModalOpen(true)} className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded text-[12px] font-medium bg-transparent border border-border text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                                        <ArrowDownToLine size={13} /> Para Yatır
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="card-base">
                            <div className="flex items-center gap-2 mb-4">
                                <PieChartIcon size={14} className="text-primary" />
                                <span className="text-[14px] font-medium text-foreground">Varlık Dağılımı</span>
                            </div>
                            {pieLoading && <div className="h-[280px] rounded bg-white/[0.03] animate-pulse" />}
                            {pieError && <p className="text-[13px] text-negative">Dağılım verileri yüklenemedi.</p>}
                            {pieData && <PortfolioPieChart data={pieData} />}
                            {!pieLoading && !pieError && !pieData && <div className="flex items-center justify-center h-[280px] text-meta">Varlık dağılımı verisi bulunamadı.</div>}
                        </div>
                        <div className="card-base">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp size={14} className="text-primary" />
                                <span className="text-[14px] font-medium text-foreground">Portföy Performansı</span>
                            </div>
                            {active?.id ? <PerformanceAreaChart portfolioId={active.id} /> : <div className="flex items-center justify-center h-[280px] text-meta">Portföy ID bulunamadı.</div>}
                        </div>
                    </div>

                    {/* Positions table */}
                    <div className="border-t border-border pt-5">
                        <span className="text-label mb-4 block">Pozisyonlarım — {active?.portfolioName}</span>
                        {!active?.portfolioItems?.length ? (
                            <div className="py-10 text-center">
                                <Wallet className="mx-auto mb-2 text-ghost" size={28} />
                                <p className="text-meta">Henüz enstrümanınız yok</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="px-4 py-2.5 text-left text-label">Sembol</th>
                                            <th className="px-4 py-2.5 text-right text-label">Miktar</th>
                                            <th className="px-4 py-2.5 text-right text-label">Ort. Maliyet</th>
                                            <th className="px-4 py-2.5 text-right text-label">Güncel Fiyat</th>
                                            <th className="px-4 py-2.5 text-right text-label">Toplam Değer</th>
                                            <th className="px-4 py-2.5 text-right text-label">K/Z</th>
                                            {!isAdmin && <th className="px-4 py-2.5 text-center text-label">İşlem</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {active.portfolioItems.map((item, idx) => {
                                            const symbol = item.instrumentDto?.symbol ?? item.instrumentSymbol ?? '—';
                                            const curPrice = item.instrumentDto?.currentPrice ?? 0;
                                            const amount = Number(item.amount ?? 0);
                                            const avgCost = Number(item.averageCost ?? 0);
                                            const totalVal = amount * curPrice;
                                            const totalCost = amount * avgCost;
                                            const pnl = totalVal - totalCost;
                                            const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
                                            const isProfit = pnl >= 0;
                                            return (
                                                <tr key={idx} className="h-11 hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-4 py-0">
                                                        <span className="text-[13px] font-semibold text-foreground">{symbol}</span>
                                                        {item.instrumentDto?.name && <p className="text-[10px] text-subtle mt-0.5">{item.instrumentDto.name}</p>}
                                                    </td>
                                                    <td className="px-4 py-0 text-right text-[13px] tabular-nums text-muted-foreground">{amount.toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</td>
                                                    <td className="px-4 py-0 text-right text-[13px] tabular-nums text-muted-foreground">{avgCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                                                    <td className="px-4 py-0 text-right text-[13px] font-medium tabular-nums text-foreground">{curPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                                                    <td className="px-4 py-0 text-right text-[13px] font-semibold tabular-nums text-foreground">{totalVal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                                                    <td className="px-4 py-0 text-right">
                                                        <span className={`inline-flex items-center gap-1 ${isProfit ? 'badge-positive' : 'badge-negative'}`}>
                                                            {isProfit ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                            {isProfit ? '+' : ''}{pnl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                            <span className="opacity-60 text-[10px]">({isProfit ? '+' : ''}{pnlPct.toFixed(1)}%)</span>
                                                        </span>
                                                    </td>
                                                    {!isAdmin && (
                                                        <td className="px-4 py-0 text-center">
                                                            <button onClick={() => setSellSymbol(symbol)} className="text-[12px] font-medium text-negative hover:bg-negative/[0.06] px-2 py-1 rounded transition-colors">
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

                    {/* Recent transactions placeholder */}
                    <div className="border-t border-border pt-5">
                        <span className="text-label mb-4 block">Son İşlemler</span>
                        <div className="py-8 text-center">
                            <RefreshCw className="mx-auto mb-2 text-ghost" size={22} />
                            <p className="text-meta">İşlem geçmişi yakında aktif olacak.</p>
                        </div>
                    </div>
                </>
            )}

            {!isAdmin && (
                <>
                    <CreatePortfolioModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
                    {active?.id && <DepositModal isOpen={depositModalOpen} onClose={() => setDepositModalOpen(false)} portfolioId={active.id} />}
                    {sellSymbol && active?.id && <TradeModal isOpen={Boolean(sellSymbol)} onClose={() => setSellSymbol(null)} symbol={sellSymbol} side="SELL" portfolioId={active.id} />}
                </>
            )}
        </div>
    );
};

export default PortfolioPage;
