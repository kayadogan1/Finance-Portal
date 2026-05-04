import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    PieChart as PieChartIcon, TrendingUp, TrendingDown, Wallet,
    ArrowDownToLine, ArrowUpFromLine, RefreshCw, Plus, ChevronDown, Clock,
} from 'lucide-react';
import {
    getPortfolios, getPortfolioPieChart, getPortfolioTypeAllocation, getTransactions,
    type PortfolioDto, type TransactionDto,
} from '../services/portfolioService';
import PortfolioPieChart from '../components/portfolio/PortfolioPieChart';
import PerformanceAreaChart from '../components/portfolio/PerformanceAreaChart';
import { CreatePortfolioModal } from '../components/portfolio/CreatePortfolioModal';
import { DepositModal } from '../components/portfolio/DepositModal';
import { TradeModal } from '../components/trade/TradeModal';
import useAuth from '../hooks/useAuth';
import { formatMarketPrice } from '../utils/currency';

/* ─── Transaction History (inline component) ─── */

type CurrencyLookup = Record<string, string>;

const TransactionHistory = ({ currencyLookup }: { currencyLookup: CurrencyLookup }) => {
    const { data: transactions = [], isLoading } = useQuery({
        queryKey: ['portfolio-transactions'],
        queryFn: () => getTransactions(),
        staleTime: 1000 * 60 * 2,
    });

    const resolveTransactionCurrency = (tx: TransactionDto) => {
        const explicit = normalizeCurrency(tx.currency);
        if (tx.currency) return explicit;
        const symbolKey = tx.instrumentSymbol?.toUpperCase();
        const nameKey = tx.instrumentName?.toUpperCase();
        return (symbolKey && currencyLookup[symbolKey])
            || (nameKey && currencyLookup[nameKey])
            || 'TRY';
    };

    return (
        <div className="border-t border-border pt-5">
            <span className="text-label mb-4 block">Son İşlemler</span>
            {isLoading ? (
                <div className="py-8 text-center">
                    <RefreshCw className="mx-auto mb-2 text-ghost animate-spin" size={22} />
                    <p className="text-meta">İşlemler yükleniyor...</p>
                </div>
            ) : transactions.length === 0 ? (
                <div className="py-8 text-center">
                    <Clock className="mx-auto mb-2 text-ghost" size={22} />
                    <p className="text-meta">Henüz işlem geçmişi bulunmuyor.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="px-4 py-2.5 text-left text-label">Tür</th>
                                <th className="px-4 py-2.5 text-left text-label">Enstrüman</th>
                                <th className="px-4 py-2.5 text-right text-label">Miktar</th>
                                <th className="px-4 py-2.5 text-right text-label">Fiyat</th>
                                <th className="px-4 py-2.5 text-right text-label">Tarih</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {transactions.slice(0, 20).map((tx, idx) => {
                                const isBuy = tx.transactionType === 'BUY';
                                const txDate = new Date(tx.dateTime);
                                return (
                                    <tr key={idx} className="h-11 hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-0">
                                            <span className={`inline-flex items-center gap-1 text-[12px] font-semibold ${isBuy ? 'text-positive' : 'text-negative'}`}>
                                                {isBuy ? <ArrowDownToLine size={12} /> : <ArrowUpFromLine size={12} />}
                                                {isBuy ? 'ALIŞ' : 'SATIŞ'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-0 text-[13px] font-medium text-foreground">{tx.instrumentName}</td>
                                        <td className="px-4 py-0 text-right text-[13px] tabular-nums text-muted-foreground">
                                            {Number(tx.quantity).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}
                                        </td>
                                        <td className="px-4 py-0 text-right text-[13px] font-medium tabular-nums text-foreground">
                                            {formatMarketPrice(Number(tx.price), resolveTransactionCurrency(tx))}
                                        </td>
                                        <td className="px-4 py-0 text-right text-[12px] text-subtle tabular-nums">
                                            {txDate.toLocaleDateString('tr-TR')} {txDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

type DisplayCurrency = 'TRY' | 'USD';

const normalizeCurrency = (currency?: string) => {
    const cur = (currency ?? 'TRY').toUpperCase();
    if (cur === 'TL') return 'TRY';
    if (cur === 'USDT' || cur === 'XAU' || cur === 'XAG') return 'USD';
    return cur;
};

const PortfolioPage = () => {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [depositModalOpen, setDepositModalOpen] = useState(false);
    const [sellSymbol, setSellSymbol] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [allocationMode, setAllocationMode] = useState<'instrument' | 'type'>('instrument');
    const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('TRY');

    const { data: portfolios, isLoading: portsLoading } = useQuery({
        queryKey: ['portfolio', displayCurrency],
        queryFn: () => getPortfolios(displayCurrency),
        staleTime: 1000 * 60,
    });

    const hasPortfolio = portfolios && portfolios.length > 0;
    const active: PortfolioDto | null = hasPortfolio ? portfolios[selectedIndex] ?? portfolios[0] : null;
    const totalPortfolioValue = Number(active?.totalPortfolioValue ?? 0);
    const holdingsValue = Number(active?.holdingsValue ?? 0);
    const totalCost = Number(active?.totalCost ?? 0);
    const totalProfitLoss = Number(active?.profitLoss ?? holdingsValue - totalCost);
    const totalProfitLossPercent = active?.profitLossPercent ?? (totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : null);
    const isPortfolioPositive = totalProfitLoss >= 0;

    const { data: pieData, isLoading: pieLoading, isError: pieError } = useQuery({
        queryKey: ['portfolio-pie', active?.id, allocationMode, displayCurrency],
        queryFn: () => allocationMode === 'type'
            ? getPortfolioTypeAllocation(active!.id, displayCurrency)
            : getPortfolioPieChart(active!.id, displayCurrency),
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
        enabled: !!active?.id,
    });

    const displayedPieData = useMemo(() => {
        return pieData?.filter((item) => Number(item.totalValue) > 0);
    }, [pieData]);

    const transactionCurrencyLookup = useMemo(() => {
        const lookup: CurrencyLookup = {};
        for (const item of active?.portfolioItems ?? []) {
            const currency = normalizeCurrency(item.instrumentDto?.baseCurrency);
            const symbol = item.instrumentDto?.symbol ?? item.instrumentSymbol;
            const name = item.instrumentDto?.name;
            if (symbol) lookup[symbol.toUpperCase()] = currency;
            if (name) lookup[name.toUpperCase()] = currency;
        }
        return lookup;
    }, [active?.portfolioItems]);

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
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="py-4 px-5 border-l-2 border-primary">
                            <span className="text-label">NAKİT BAKİYE</span>
                            <div className="flex items-baseline gap-2 mt-1.5">
                                <span className="text-price">
                                    {Number(active?.portfolioBalance ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-label">{active?.displayCurrency ?? displayCurrency}</span>
                            </div>
                        </div>
                        <div className="card-base">
                            <span className="text-label">TOPLAM PORTFÖY DEĞERİ</span>
                            <div className="flex items-baseline gap-2 mt-1.5">
                                <span className="text-price">{formatMarketPrice(totalPortfolioValue, displayCurrency)}</span>
                            </div>
                            <p className="text-[11px] text-subtle mt-2">
                                Varlıklar {formatMarketPrice(holdingsValue, displayCurrency)} + nakit
                            </p>
                        </div>
                        <div className="card-base">
                            <span className="text-label">TOPLAM KÂR / ZARAR</span>
                            <div className="mt-1.5">
                                <span className={`inline-flex items-center gap-1.5 text-[20px] font-semibold tabular-nums ${isPortfolioPositive ? 'text-positive' : 'text-negative'}`}>
                                    {isPortfolioPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                    {isPortfolioPositive ? '+' : '-'}{formatMarketPrice(Math.abs(totalProfitLoss), displayCurrency)}
                                </span>
                            </div>
                            <p className="text-[11px] mt-2 text-subtle">
                                {totalProfitLossPercent == null
                                    ? 'Maliyet verisi oluşmadı'
                                    : `${isPortfolioPositive ? '+' : ''}${totalProfitLossPercent.toFixed(2)}% toplam getiri`}
                            </p>
                        </div>
                        <div className="card-base">
                            <span className="text-label">TOPLAM MALİYET</span>
                            <div className="flex items-baseline gap-2 mt-1.5">
                                <span className="text-price">{formatMarketPrice(totalCost, displayCurrency)}</span>
                            </div>
                            <p className="text-[11px] text-subtle mt-2">
                                Kullanıcıyı oran hesabına boğmadan referans maliyet
                            </p>
                        </div>
                        {!isAdmin && (
                            <div className="card-base md:col-span-2 xl:col-span-4">
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
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <PieChartIcon size={14} className="text-primary" />
                                    <span className="text-[14px] font-medium text-foreground">
                                        {allocationMode === 'type' ? 'Tür Dağılımı' : 'Varlık Dağılımı'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex bg-[hsl(var(--background-subtle))] border border-border rounded p-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setAllocationMode('instrument')}
                                            className={`px-3 h-7 rounded text-[11px] font-semibold transition-colors ${
                                                allocationMode === 'instrument'
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            Enstrüman
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAllocationMode('type')}
                                            className={`px-3 h-7 rounded text-[11px] font-semibold transition-colors ${
                                                allocationMode === 'type'
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            Tür/Piyasa
                                        </button>
                                    </div>
                                    <div className="flex bg-[hsl(var(--background-subtle))] border border-border rounded p-0.5">
                                        {(['TRY', 'USD'] as const).map((currency) => (
                                            <button
                                                key={currency}
                                                type="button"
                                                onClick={() => setDisplayCurrency(currency)}
                                                className={`px-2.5 h-7 rounded text-[11px] font-semibold transition-colors ${
                                                    displayCurrency === currency
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                {currency}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {pieLoading && <div className="h-[280px] rounded bg-white/[0.03] animate-pulse" />}
                            {pieError && <p className="text-[13px] text-negative">Dağılım verileri yüklenemedi.</p>}
                            {displayedPieData && <PortfolioPieChart data={displayedPieData} displayCurrency={displayCurrency} />}
                            {!pieLoading && !pieError && !displayedPieData && <div className="flex items-center justify-center h-[280px] text-meta">Varlık dağılımı verisi bulunamadı.</div>}
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
                                            const itemCurrency = normalizeCurrency(item.instrumentDto?.baseCurrency);
                                            const amount = Number(item.amount ?? 0);
                                            const avgCost = Number(item.averageCost ?? 0);
                                            const totalVal = Number(item.currentValue ?? amount * curPrice);
                                            const totalCost = Number(item.costValue ?? amount * avgCost);
                                            const pnl = Number(item.profitLoss ?? totalVal - totalCost);
                                            const pnlPct = Number(item.profitLossPercent ?? (totalCost > 0 ? (pnl / totalCost) * 100 : 0));
                                            const isProfit = pnl >= 0;
                                            return (
                                                <tr
                                                    key={idx}
                                                    className="h-11 cursor-pointer hover:bg-white/[0.02] transition-colors"
                                                    onClick={() => symbol !== '—' && navigate(`/instrument/${symbol}`)}
                                                >
                                                    <td className="px-4 py-0">
                                                        <span className="text-[13px] font-semibold text-foreground">{symbol}</span>
                                                        {item.instrumentDto?.name && <p className="text-[10px] text-subtle mt-0.5">{item.instrumentDto.name}</p>}
                                                    </td>
                                                    <td className="px-4 py-0 text-right text-[13px] tabular-nums text-muted-foreground">{amount.toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</td>
                                                    <td className="px-4 py-0 text-right text-[13px] tabular-nums text-muted-foreground">{formatMarketPrice(avgCost, itemCurrency)}</td>
                                                    <td className="px-4 py-0 text-right text-[13px] font-medium tabular-nums text-foreground">{formatMarketPrice(curPrice, itemCurrency)}</td>
                                                    <td className="px-4 py-0 text-right text-[13px] font-semibold tabular-nums text-foreground">
                                                        {formatMarketPrice(totalVal, displayCurrency)}
                                                        {itemCurrency !== displayCurrency && (
                                                            <p className="text-[10px] font-normal text-subtle">
                                                                {formatMarketPrice(amount * curPrice, itemCurrency)}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-0 text-right">
                                                        <span className={`inline-flex items-center gap-1 ${isProfit ? 'badge-positive' : 'badge-negative'}`}>
                                                            {isProfit ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                            {isProfit ? '+' : '-'}{formatMarketPrice(Math.abs(pnl), displayCurrency)}
                                                            <span className="opacity-60 text-[10px]">({isProfit ? '+' : ''}{pnlPct.toFixed(1)}%)</span>
                                                        </span>
                                                    </td>
                                                    {!isAdmin && (
                                                        <td className="px-4 py-0 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        navigate(`/instrument/${symbol}`);
                                                                    }}
                                                                    className="text-[12px] font-medium text-primary hover:bg-primary/[0.06] px-2 py-1 rounded transition-colors"
                                                                >
                                                                    Detay
                                                                </button>
                                                                <button
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        setSellSymbol(symbol);
                                                                    }}
                                                                    className="text-[12px] font-medium text-negative hover:bg-negative/[0.06] px-2 py-1 rounded transition-colors"
                                                                >
                                                                Sat
                                                                </button>
                                                            </div>
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

                    {/* Transaction History */}
                    <TransactionHistory currencyLookup={transactionCurrencyLookup} />
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
