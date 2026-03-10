import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowUpCircle,
    ArrowDownCircle,
    Wallet,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    ChevronDown,
    Package,
} from 'lucide-react';
import {
    getPortfolios,
    buyInstrument,
    sellInstrument,
    type PortfolioDto,
    type PortfolioItemDto,
} from '../../services/portfolioService';

/* ─── Types ─── */

type TradeAction = 'BUY' | 'SELL';

interface TradeWidgetProps {
    /** The instrument symbol to trade (e.g. "BTCUSDT") */
    symbol: string;
    /** The instrument display name */
    instrumentName?: string;
    /** Current price from parent or backend — readonly */
    currentPrice: number;
}

/* ─── Format Helpers ─── */

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

function formatQuantity(value: number): string {
    if (value >= 1) return value.toFixed(4).replace(/\.?0+$/, '');
    return value.toFixed(8).replace(/\.?0+$/, '');
}

/* ─── Quick Percent Buttons ─── */

const QUICK_PERCENTS = [
    { label: '%25', value: 0.25 },
    { label: '%50', value: 0.50 },
    { label: '%75', value: 0.75 },
    { label: 'Max', value: 1.0 },
];

/* ─── Component ─── */

const TradeWidget = ({ symbol, instrumentName, currentPrice }: TradeWidgetProps) => {
    const queryClient = useQueryClient();

    const [action, setAction] = useState<TradeAction>('BUY');
    const [quantity, setQuantity] = useState<string>('');
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // ──── Fetch user portfolios ────
    const { data: portfolios = [], isLoading: portfoliosLoading } = useQuery<PortfolioDto[]>({
        queryKey: ['portfolios'],
        queryFn: getPortfolios,
        staleTime: 1000 * 60 * 2,
    });

    // Auto-select first portfolio
    const activePortfolio = useMemo(() => {
        if (portfolios.length === 0) return null;
        const id = selectedPortfolioId || portfolios[0].id;
        return portfolios.find((p) => p.id === id) ?? portfolios[0];
    }, [portfolios, selectedPortfolioId]);

    // Find how many of THIS instrument the user holds in the selected portfolio
    const holdingItem: PortfolioItemDto | undefined = useMemo(() => {
        if (!activePortfolio?.portfolioItems) return undefined;
        return activePortfolio.portfolioItems.find(
            (item) => item.instrumentDto?.symbol === symbol || item.instrumentSymbol === symbol,
        );
    }, [activePortfolio, symbol]);

    const availableCash = activePortfolio?.portfolioBalance ?? 0;
    const holdingQuantity = holdingItem?.amount ?? 0;
    const holdingAvgCost = holdingItem?.averageCost ?? 0;

    // ──── Computed values ────
    const qty = parseFloat(quantity) || 0;
    const estimatedTotal = qty * currentPrice;

    // Validation
    const insufficientFunds = action === 'BUY' && estimatedTotal > availableCash;
    const insufficientHoldings = action === 'SELL' && qty > holdingQuantity;
    const isInvalid = qty <= 0 || insufficientFunds || insufficientHoldings || !activePortfolio;

    // ──── Quick percent handler ────
    const handleQuickPercent = useCallback(
        (percent: number) => {
            if (!currentPrice || currentPrice <= 0) return;

            if (action === 'BUY') {
                // percent of available cash → quantity
                const maxQty = (availableCash * percent) / currentPrice;
                setQuantity(formatQuantity(maxQty));
            } else {
                // percent of holdings
                const maxQty = holdingQuantity * percent;
                setQuantity(formatQuantity(maxQty));
            }
        },
        [action, availableCash, holdingQuantity, currentPrice],
    );

    // ──── Mutations ────
    const buyMutation = useMutation({
        mutationFn: () => buyInstrument(symbol, qty, activePortfolio!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portfolios'] });
            setQuantity('');
            setErrorMsg('');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        },
        onError: (err: Error) => {
            setErrorMsg(err.message || 'İşlem başarısız oldu.');
        },
    });

    const sellMutation = useMutation({
        mutationFn: () => sellInstrument(symbol, qty, activePortfolio!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portfolios'] });
            setQuantity('');
            setErrorMsg('');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        },
        onError: (err: Error) => {
            setErrorMsg(err.message || 'İşlem başarısız oldu.');
        },
    });

    const isSubmitting = buyMutation.isPending || sellMutation.isPending;

    const handleSubmit = () => {
        if (isInvalid || isSubmitting) return;
        setErrorMsg('');
        if (action === 'BUY') {
            buyMutation.mutate();
        } else {
            sellMutation.mutate();
        }
    };

    // ──── Colors ────
    const isBuy = action === 'BUY';

    return (
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl">
            {/* ─── Header: Buy/Sell Tabs ─── */}
            <div className="flex">
                <button
                    onClick={() => { setAction('BUY'); setQuantity(''); setErrorMsg(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold uppercase tracking-wider transition-all duration-200
                        ${isBuy
                            ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500'
                            : 'bg-slate-900/40 text-slate-400 hover:text-slate-300 border-b-2 border-transparent'
                        }`}
                >
                    <ArrowUpCircle size={16} />
                    AL (Buy)
                </button>
                <button
                    onClick={() => { setAction('SELL'); setQuantity(''); setErrorMsg(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold uppercase tracking-wider transition-all duration-200
                        ${!isBuy
                            ? 'bg-red-500/20 text-red-400 border-b-2 border-red-500'
                            : 'bg-slate-900/40 text-slate-400 hover:text-slate-300 border-b-2 border-transparent'
                        }`}
                >
                    <ArrowDownCircle size={16} />
                    SAT (Sell)
                </button>
            </div>

            <div className="p-5 space-y-4">
                {/* ─── Portfolio Selector ─── */}
                <div>
                    <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">
                        Portföy
                    </label>
                    {portfoliosLoading ? (
                        <div className="h-10 bg-slate-700/40 rounded-lg animate-pulse" />
                    ) : portfolios.length === 0 ? (
                        <div className="text-xs text-slate-500 bg-slate-900/40 rounded-lg p-3 text-center">
                            Henüz portföyünüz yok.
                        </div>
                    ) : (
                        <div className="relative">
                            <select
                                value={activePortfolio?.id ?? ''}
                                onChange={(e) => setSelectedPortfolioId(e.target.value)}
                                className="w-full appearance-none bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-2.5 text-sm text-white
                                           focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40
                                           cursor-pointer transition-all"
                            >
                                {portfolios.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.portfolioName}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    )}
                </div>

                {/* ─── Available Cash / Holdings Info ─── */}
                {activePortfolio && (
                    <div className={`flex items-center justify-between p-3 rounded-xl border
                        ${isBuy
                            ? 'bg-emerald-500/5 border-emerald-500/15'
                            : 'bg-blue-500/5 border-blue-500/15'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <Wallet size={14} className={isBuy ? 'text-emerald-400' : 'text-blue-400'} />
                            <span className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">
                                {isBuy ? 'Kullanılabilir Bakiye' : 'Eldeki Miktar'}
                            </span>
                        </div>
                        <span className={`text-sm font-bold ${isBuy ? 'text-emerald-400' : 'text-blue-400'}`}>
                            {isBuy
                                ? formatCurrency(availableCash)
                                : `${formatQuantity(holdingQuantity)} adet`
                            }
                        </span>
                    </div>
                )}

                {/* ─── Holding details (SELL mode) ─── */}
                {!isBuy && holdingItem && (
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-900/30 rounded-lg">
                        <div className="flex items-center gap-1.5">
                            <Package size={12} className="text-slate-500" />
                            <span className="text-[10px] text-slate-500 uppercase">Ort. Maliyet</span>
                        </div>
                        <span className="text-xs text-slate-400 font-medium">
                            {formatCurrency(holdingAvgCost)}
                        </span>
                    </div>
                )}

                {/* ─── Current Price ─── */}
                <div>
                    <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">
                        Güncel Fiyat
                    </label>
                    <div className="bg-slate-900/60 border border-slate-700/40 rounded-lg px-4 py-2.5 text-sm text-white font-mono">
                        {formatCurrency(currentPrice)}
                    </div>
                </div>

                {/* ─── Quantity Input ─── */}
                <div>
                    <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">
                        Miktar {instrumentName && <span className="text-slate-600">({instrumentName})</span>}
                    </label>
                    <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={quantity}
                        onChange={(e) => {
                            setQuantity(e.target.value);
                            setErrorMsg('');
                        }}
                        placeholder="0.00"
                        className={`w-full bg-slate-900/60 border rounded-lg px-4 py-2.5 text-sm text-white font-mono
                                    placeholder-slate-600 focus:outline-none focus:ring-2 transition-all
                                    ${insufficientFunds || insufficientHoldings
                                ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500/40'
                                : 'border-slate-700/60 focus:ring-emerald-500/30 focus:border-emerald-500/40'
                            }`}
                    />
                </div>

                {/* ─── Quick Percent Buttons ─── */}
                <div className="grid grid-cols-4 gap-2">
                    {QUICK_PERCENTS.map(({ label, value }) => (
                        <button
                            key={label}
                            onClick={() => handleQuickPercent(value)}
                            disabled={!activePortfolio || (isBuy && availableCash <= 0) || (!isBuy && holdingQuantity <= 0)}
                            className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all duration-200
                                disabled:opacity-30 disabled:cursor-not-allowed
                                ${isBuy
                                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15 active:bg-emerald-500/25'
                                    : 'bg-red-500/5 border-red-500/20 text-red-400 hover:bg-red-500/15 active:bg-red-500/25'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* ─── Estimated Total ─── */}
                {qty > 0 && (
                    <div className={`flex items-center justify-between p-3 rounded-xl border
                        ${isBuy
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-red-500/5 border-red-500/20'
                        }`}
                    >
                        <span className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">
                            Tahmini Tutar
                        </span>
                        <span className={`text-sm font-bold font-mono ${isBuy ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(estimatedTotal)}
                        </span>
                    </div>
                )}

                {/* ─── Validation Warnings ─── */}
                {insufficientFunds && (
                    <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <AlertTriangle size={14} className="text-red-400 shrink-0" />
                        <span className="text-xs text-red-400 font-medium">
                            Yetersiz Bakiye — Toplam tutar kullanılabilir bakiyeyi aşıyor.
                        </span>
                    </div>
                )}

                {insufficientHoldings && (
                    <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <AlertTriangle size={14} className="text-red-400 shrink-0" />
                        <span className="text-xs text-red-400 font-medium">
                            Yetersiz Hisse — Satmak istediğiniz miktar eldeki miktardan fazla.
                        </span>
                    </div>
                )}

                {/* ─── API Error ─── */}
                {errorMsg && (
                    <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                        <span className="text-xs text-amber-400 font-medium">{errorMsg}</span>
                    </div>
                )}

                {/* ─── Success message ─── */}
                {showSuccess && (
                    <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg animate-in fade-in duration-300">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <span className="text-xs text-emerald-400 font-medium">
                            İşlem başarıyla gerçekleştirildi!
                        </span>
                    </div>
                )}

                {/* ─── Submit Button ─── */}
                <button
                    onClick={handleSubmit}
                    disabled={isInvalid || isSubmitting}
                    className={`w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200
                        disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
                        ${isBuy
                            ? 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30'
                            : 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30'
                        }
                        ${!isInvalid && !isSubmitting ? 'hover:-translate-y-0.5 active:translate-y-0' : ''}
                    `}
                >
                    {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                            <Loader2 size={16} className="animate-spin" />
                            İşleniyor...
                        </span>
                    ) : (
                        <>
                            {isBuy ? 'AL — İşlemi Onayla' : 'SAT — İşlemi Onayla'}
                        </>
                    )}
                </button>

                {/* ─── Disclaimer ─── */}
                <p className="text-[10px] text-slate-600 text-center leading-relaxed">
                    İşlemler anlık piyasa fiyatı üzerinden gerçekleştirilir.
                    Komisyon uygulanabilir.
                </p>
            </div>
        </div>
    );
};

export default TradeWidget;
