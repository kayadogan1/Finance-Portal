import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowUpCircle, ArrowDownCircle, Wallet, AlertTriangle,
    CheckCircle2, Loader2, ChevronDown, Package,
} from 'lucide-react';
import {
    getPortfolios, buyInstrument, sellInstrument,
    type PortfolioDto, type PortfolioItemDto,
} from '../../services/portfolioService';

type TradeAction = 'BUY' | 'SELL';

interface TradeWidgetProps {
    symbol: string;
    instrumentName?: string;
    currentPrice: number;
}

function formatCurrency(v: number) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

function formatQty(v: number) {
    return v >= 1 ? v.toFixed(4).replace(/\.?0+$/, '') : v.toFixed(8).replace(/\.?0+$/, '');
}

const QUICK = [
    { label: '%25', value: 0.25 },
    { label: '%50', value: 0.50 },
    { label: '%75', value: 0.75 },
    { label: 'Max', value: 1.0 },
];

const TradeWidget = ({ symbol, instrumentName, currentPrice }: TradeWidgetProps) => {
    const qc = useQueryClient();
    const [action, setAction] = useState<TradeAction>('BUY');
    const [quantity, setQuantity] = useState('');
    const [selectedPortfolioId, setSelectedPortfolioId] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const { data: rawPortfolios = [], isLoading: pLoading } = useQuery<PortfolioDto[]>({
        queryKey: ['portfolios'], queryFn: getPortfolios, staleTime: 1000 * 60 * 2,
    });
    const portfolios = useMemo(() => Array.isArray(rawPortfolios) ? rawPortfolios : [], [rawPortfolios]);

    const activePortfolio = useMemo(() => {
        if (!portfolios.length) return null;
        return portfolios.find(p => p.id === (selectedPortfolioId || portfolios[0].id)) ?? portfolios[0];
    }, [portfolios, selectedPortfolioId]);

    const holdingItem: PortfolioItemDto | undefined = useMemo(() => {
        return activePortfolio?.portfolioItems?.find(
            i => i.instrumentDto?.symbol === symbol || i.instrumentSymbol === symbol
        );
    }, [activePortfolio, symbol]);

    const cash = activePortfolio?.portfolioBalance ?? 0;
    const holdQty = holdingItem?.amount ?? 0;
    const isBuy = action === 'BUY';
    const qty = parseFloat(quantity) || 0;
    const total = qty * currentPrice;
    const insuffFunds = isBuy && total > cash;
    const insuffHold = !isBuy && qty > holdQty;
    const isInvalid = qty <= 0 || insuffFunds || insuffHold || !activePortfolio;

    const handleQuick = useCallback((pct: number) => {
        if (!currentPrice || currentPrice <= 0) return;
        setQuantity(formatQty(isBuy ? (cash * pct) / currentPrice : holdQty * pct));
    }, [isBuy, cash, holdQty, currentPrice]);

    const onSuccess = () => {
        qc.invalidateQueries({ queryKey: ['portfolios'] });
        setQuantity(''); setErrorMsg(''); setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };
    const onError = (err: Error) => setErrorMsg(err.message || 'İşlem başarısız oldu.');

    const buyMut = useMutation({ mutationFn: () => buyInstrument(symbol, qty, activePortfolio!.id), onSuccess, onError });
    const sellMut = useMutation({ mutationFn: () => sellInstrument(symbol, qty, activePortfolio!.id), onSuccess, onError });
    const isSubmitting = buyMut.isPending || sellMut.isPending;

    const handleSubmit = () => {
        if (isInvalid || isSubmitting) return;
        setErrorMsg('');
        if (isBuy) {
            buyMut.mutate();
        } else {
            sellMut.mutate();
        }
    };

    return (
        <div className="card-base !p-0 overflow-hidden">
            {/* Segmented AL / SAT */}
            <div className="segment-control">
                <button
                    onClick={() => { setAction('BUY'); setQuantity(''); setErrorMsg(''); }}
                    className="segment-btn"
                    style={isBuy ? { background: 'hsl(var(--positive))', color: 'hsl(var(--background))' } : {}}
                >
                    <ArrowUpCircle size={14} /> AL
                </button>
                <button
                    onClick={() => { setAction('SELL'); setQuantity(''); setErrorMsg(''); }}
                    className="segment-btn"
                    style={!isBuy ? { background: 'hsl(var(--negative))', color: '#fff' } : {}}
                >
                    <ArrowDownCircle size={14} /> SAT
                </button>
            </div>

            <div className="p-4 space-y-3">
                {/* Portfolio selector */}
                <div>
                    <label className="text-label mb-1.5 block">Portföy</label>
                    {pLoading ? (
                        <div className="h-9 rounded bg-white/5 animate-pulse" />
                    ) : portfolios.length === 0 ? (
                        <div className="text-meta text-center p-2 bg-background rounded">Henüz portföyünüz yok.</div>
                    ) : (
                        <div className="relative">
                            <select
                                value={activePortfolio?.id ?? ''}
                                onChange={e => setSelectedPortfolioId(e.target.value)}
                                className="w-full appearance-none h-9 rounded px-3 text-[13px] font-medium bg-background border border-border text-foreground cursor-pointer focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                            >
                                {portfolios.map(p => <option key={p.id} value={p.id}>{p.portfolioName}</option>)}
                            </select>
                            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-subtle" />
                        </div>
                    )}
                </div>

                {/* Balance / Holdings */}
                {activePortfolio && (
                    <div className="flex items-center justify-between px-3 py-2 bg-background border border-border rounded">
                        <div className="flex items-center gap-1.5">
                            <Wallet size={12} className="text-subtle" />
                            <span className="text-label">{isBuy ? 'Bakiye' : 'Miktar'}</span>
                        </div>
                        <span className={`text-[13px] font-semibold tabular-nums ${isBuy ? 'text-positive' : 'text-primary'}`}>
                            {isBuy ? formatCurrency(cash) : `${formatQty(holdQty)} adet`}
                        </span>
                    </div>
                )}

                {/* Avg cost */}
                {!isBuy && holdingItem && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-background rounded">
                        <span className="flex items-center gap-1 text-label"><Package size={10} />Ort. Maliyet</span>
                        <span className="text-[12px] font-medium tabular-nums text-muted-foreground">{formatCurrency(holdingItem.averageCost ?? 0)}</span>
                    </div>
                )}

                {/* Current price */}
                <div>
                    <label className="text-label mb-1.5 block">Güncel Fiyat</label>
                    <div className="h-9 bg-background border border-border rounded px-3 flex items-center text-[13px] font-semibold tabular-nums text-foreground">
                        {formatCurrency(currentPrice)}
                    </div>
                </div>

                {/* Quantity */}
                <div>
                    <label className="text-label mb-1.5 block">
                        Miktar {instrumentName && <span className="text-ghost normal-case">({instrumentName})</span>}
                    </label>
                    <input
                        type="number" step="0.0001" min="0" value={quantity}
                        onChange={e => { setQuantity(e.target.value); setErrorMsg(''); }}
                        placeholder="0.00"
                        className={`w-full h-9 rounded px-3 text-[18px] font-medium tabular-nums text-right bg-background text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 border ${insuffFunds || insuffHold ? 'border-negative' : 'border-border'}`}
                    />
                </div>

                {/* Quick % */}
                <div className="grid grid-cols-4 gap-1.5">
                    {QUICK.map(({ label, value }) => (
                        <button
                            key={label}
                            onClick={() => handleQuick(value)}
                            disabled={!activePortfolio || (isBuy && cash <= 0) || (!isBuy && holdQty <= 0)}
                            className="py-1.5 text-[11px] font-medium rounded bg-transparent border border-border text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Estimated total */}
                {qty > 0 && (
                    <div className={`flex items-center justify-between px-3 py-2 rounded border ${isBuy ? 'border-positive/20' : 'border-negative/20'} bg-background`}>
                        <span className="text-label">Tahmini Tutar</span>
                        <span className={`text-[13px] font-bold tabular-nums ${isBuy ? 'text-positive' : 'text-negative'}`}>{formatCurrency(total)}</span>
                    </div>
                )}

                {/* Warnings */}
                {insuffFunds && (
                    <div className="flex items-center gap-2 p-2.5 rounded bg-negative/[0.06] border border-negative/10">
                        <AlertTriangle size={13} className="text-negative shrink-0" />
                        <span className="text-[12px] font-medium text-negative">Yetersiz Bakiye</span>
                    </div>
                )}
                {insuffHold && (
                    <div className="flex items-center gap-2 p-2.5 rounded bg-negative/[0.06] border border-negative/10">
                        <AlertTriangle size={13} className="text-negative shrink-0" />
                        <span className="text-[12px] font-medium text-negative">Yetersiz Hisse</span>
                    </div>
                )}
                {errorMsg && (
                    <div className="flex items-center gap-2 p-2.5 rounded bg-warning/[0.06] border border-warning/10">
                        <AlertTriangle size={13} className="text-warning shrink-0" />
                        <span className="text-[12px] font-medium text-warning">{errorMsg}</span>
                    </div>
                )}
                {showSuccess && (
                    <div className="flex items-center gap-2 p-2.5 rounded bg-positive/[0.06] border border-positive/10">
                        <CheckCircle2 size={13} className="text-positive shrink-0" />
                        <span className="text-[12px] font-medium text-positive">İşlem başarıyla gerçekleştirildi!</span>
                    </div>
                )}

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={isInvalid || isSubmitting}
                    className={`w-full h-10 rounded text-[13px] font-semibold transition-colors disabled:opacity-25 disabled:cursor-not-allowed ${isBuy
                            ? 'bg-positive text-background hover:bg-positive/90'
                            : 'bg-negative text-white hover:bg-negative/90'
                        }`}
                >
                    {isSubmitting
                        ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" />İşleniyor...</span>
                        : isBuy ? 'AL — İşlemi Onayla' : 'SAT — İşlemi Onayla'
                    }
                </button>
                <p className="text-[10px] text-center text-ghost leading-relaxed">İşlemler anlık piyasa fiyatı üzerinden gerçekleştirilir.</p>
            </div>
        </div>
    );
};

export default TradeWidget;
