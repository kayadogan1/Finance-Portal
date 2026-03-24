import { useState, useEffect } from 'react';
import { publicApi, privateApi } from '../services/api';
import toast from 'react-hot-toast';
import { Wallet, TrendingUp, TrendingDown, Plus, ArrowDownToLine, RefreshCw, X } from 'lucide-react';
import type { Portfolio, Instrument } from '../types';

interface ModalProps { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card rounded border border-border w-full max-w-md mx-4 overflow-hidden shadow-none">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                    <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
                    <button onClick={onClose} className="text-subtle hover:text-foreground transition-colors"><X size={16} /></button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
};

export default function PortfolioView() {
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [instruments, setInstruments] = useState<Instrument[]>([]);
    const [loading, setLoading] = useState(true);
    const [depositModal, setDepositModal] = useState(false);
    const [buyModal, setBuyModal] = useState(false);
    const [sellModal, setSellModal] = useState<string | null>(null);
    const [depositAmount, setDepositAmount] = useState('');
    const [buySymbol, setBuySymbol] = useState('');
    const [buyQuantity, setBuyQuantity] = useState('');
    const [sellQuantity, setSellQuantity] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const fetchData = async () => {
        try {
            const [portfolioRes, instrumentsRes] = await Promise.all([
                privateApi.get<Portfolio>('/api/portfolio'), publicApi.get<Instrument[]>('/api/market'),
            ]);
            setPortfolio(portfolioRes.data); setInstruments(instrumentsRes.data); setLoading(false);
        } catch { setLoading(false); }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleDeposit = async () => {
        if (!depositAmount || parseFloat(depositAmount) <= 0) return;
        setActionLoading(true);
        try { await privateApi.post('/api/portfolio/deposit', { amount: parseFloat(depositAmount) }); toast.success('Para yatırma başarılı!'); await fetchData(); setDepositModal(false); setDepositAmount(''); }
        catch { toast.error('Para yatırma başarısız.'); }
        setActionLoading(false);
    };

    const handleBuy = async () => {
        if (!buySymbol || !buyQuantity || parseFloat(buyQuantity) <= 0) return;
        setActionLoading(true);
        try { await privateApi.post('/api/portfolio/buy', { instrumentSymbol: buySymbol, quantity: parseFloat(buyQuantity) }); toast.success('Alım başarılı!'); await fetchData(); setBuyModal(false); setBuySymbol(''); setBuyQuantity(''); }
        catch { toast.error('Alım başarısız.'); }
        setActionLoading(false);
    };

    const handleSell = async () => {
        if (!sellModal || !sellQuantity || parseFloat(sellQuantity) <= 0) return;
        setActionLoading(true);
        try { await privateApi.post('/api/portfolio/sell', { instrumentSymbol: sellModal, quantity: parseFloat(sellQuantity) }); toast.success('Satış başarılı!'); await fetchData(); setSellModal(null); setSellQuantity(''); }
        catch { toast.error('Satış başarısız.'); }
        setActionLoading(false);
    };

    const getInstrumentPrice = (symbol: string): number => instruments.find(i => i.symbol === symbol)?.currentPrice || 0;

    const calculatePnL = (item: { instrument: Instrument; quantity: number; averageCost: number }) => {
        const currentPrice = getInstrumentPrice(item.instrument.symbol) || item.instrument.currentPrice;
        const currentValue = currentPrice * item.quantity;
        const costValue = item.averageCost * item.quantity;
        const pnl = currentValue - costValue;
        const pnlPercent = costValue > 0 ? (pnl / costValue) * 100 : 0;
        return { pnl, pnlPercent, currentValue };
    };

    const totalPortfolioValue = portfolio?.items?.reduce((sum, item) => sum + calculatePnL(item).currentValue, portfolio.cashBalance || 0) || 0;

    if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-primary" size={24} /></div>;

    const inputCls = "w-full h-9 bg-background border border-border rounded px-3 text-[13px] text-foreground placeholder:text-ghost focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0";

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="card-base" style={{ borderLeft: '2px solid hsl(var(--primary))' }}>
                    <span className="text-label">Nakit Bakiye</span>
                    <p className="text-price mt-1">{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(portfolio?.cashBalance || 0)} ₺</p>
                </div>
                <div className="card-base" style={{ borderLeft: '2px solid hsl(var(--primary))' }}>
                    <span className="text-label">Toplam Portföy</span>
                    <p className="text-price mt-1">{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(totalPortfolioValue)} ₺</p>
                </div>
                <div className="card-base">
                    <span className="text-label mb-2 block">Hızlı İşlemler</span>
                    <div className="flex gap-2">
                        <button onClick={() => setDepositModal(true)} className="flex-1 flex items-center justify-center gap-1 h-9 rounded text-[12px] font-medium bg-transparent border border-border text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                            <ArrowDownToLine size={12} /> Yatır
                        </button>
                        <button onClick={() => setBuyModal(true)} className="flex-1 flex items-center justify-center gap-1 h-9 rounded text-[12px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                            <Plus size={12} /> Al
                        </button>
                    </div>
                </div>
            </div>

            {/* Positions table */}
            <div className="card-base !p-0 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
                    <Wallet size={14} className="text-primary" />
                    <span className="text-[14px] font-medium text-foreground">Pozisyonlarım</span>
                </div>

                {!portfolio?.items?.length ? (
                    <div className="py-10 text-center">
                        <Wallet className="mx-auto mb-2 text-ghost" size={28} />
                        <p className="text-[13px] text-muted-foreground">Henüz pozisyonunuz yok</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="px-5 py-2.5 text-left text-label">Sembol</th>
                                    <th className="px-5 py-2.5 text-left text-label">Miktar</th>
                                    <th className="px-5 py-2.5 text-right text-label">Ort. Maliyet</th>
                                    <th className="px-5 py-2.5 text-right text-label">Güncel Fiyat</th>
                                    <th className="px-5 py-2.5 text-right text-label">Kar/Zarar</th>
                                    <th className="px-5 py-2.5 text-center text-label">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {portfolio.items.map(item => {
                                    const { pnl, pnlPercent } = calculatePnL(item);
                                    const isPositive = pnl >= 0;
                                    const currentPrice = getInstrumentPrice(item.instrument.symbol) || item.instrument.currentPrice;
                                    return (
                                        <tr key={item.id} className="h-11 hover:bg-white/[0.02] transition-colors">
                                            <td className="px-5">
                                                <span className="text-[13px] font-semibold text-foreground">{item.instrument.symbol}</span>
                                                <p className="text-meta">{item.instrument.name}</p>
                                            </td>
                                            <td className="px-5 text-[13px] tabular-nums text-muted-foreground">{new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 4 }).format(item.quantity)}</td>
                                            <td className="px-5 text-right text-[13px] tabular-nums text-muted-foreground">{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(item.averageCost)} ₺</td>
                                            <td className="px-5 text-right text-[13px] tabular-nums font-medium text-foreground">{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(currentPrice)} ₺</td>
                                            <td className="px-5 text-right">
                                                <span className={`inline-flex items-center gap-1 ${isPositive ? 'badge-positive' : 'badge-negative'}`}>
                                                    {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                                    {isPositive ? '+' : ''}{pnlPercent.toFixed(2)}%
                                                </span>
                                            </td>
                                            <td className="px-5 text-center">
                                                <button onClick={() => setSellModal(item.instrument.symbol)}
                                                    className="px-2.5 py-1 rounded text-[11px] font-medium bg-negative/10 text-negative hover:bg-negative/15 transition-colors">Sat</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Deposit Modal */}
            <Modal isOpen={depositModal} onClose={() => setDepositModal(false)} title="Para Yatır">
                <div className="space-y-4">
                    <div>
                        <label className="text-label mb-1.5 block">Miktar (₺)</label>
                        <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="0.00" className={inputCls} />
                    </div>
                    <button onClick={handleDeposit} disabled={actionLoading} className="w-full h-9 rounded text-[13px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">{actionLoading ? 'İşleniyor...' : 'Para Yatır'}</button>
                </div>
            </Modal>

            {/* Buy Modal */}
            <Modal isOpen={buyModal} onClose={() => setBuyModal(false)} title="Enstrüman Al">
                <div className="space-y-4">
                    <div>
                        <label className="text-label mb-1.5 block">Enstrüman</label>
                        <select value={buySymbol} onChange={e => setBuySymbol(e.target.value)} className={inputCls}>
                            <option value="">Seçin...</option>
                            {instruments.map(inst => <option key={inst.symbol} value={inst.symbol}>{inst.symbol} - {inst.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-label mb-1.5 block">Miktar</label>
                        <input type="number" value={buyQuantity} onChange={e => setBuyQuantity(e.target.value)} placeholder="0" step="0.0001" className={inputCls} />
                    </div>
                    <button onClick={handleBuy} disabled={actionLoading} className="w-full h-9 rounded text-[13px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">{actionLoading ? 'İşleniyor...' : 'Satın Al'}</button>
                </div>
            </Modal>

            {/* Sell Modal */}
            <Modal isOpen={Boolean(sellModal)} onClose={() => setSellModal(null)} title={`${sellModal} Sat`}>
                <div className="space-y-4">
                    <div>
                        <label className="text-label mb-1.5 block">Miktar</label>
                        <input type="number" value={sellQuantity} onChange={e => setSellQuantity(e.target.value)} placeholder="0" step="0.0001" className={inputCls} />
                    </div>
                    <button onClick={handleSell} disabled={actionLoading} className="w-full h-9 rounded text-[13px] font-medium bg-negative text-white hover:bg-negative/90 disabled:opacity-50 transition-colors">{actionLoading ? 'İşleniyor...' : 'Sat'}</button>
                </div>
            </Modal>
        </div>
    );
}
