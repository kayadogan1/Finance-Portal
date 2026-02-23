import { useState, useEffect } from 'react';
import { publicApi, privateApi } from '../services/api';
import toast from 'react-hot-toast';
import { Wallet, TrendingUp, TrendingDown, Plus, ArrowDownToLine, ShoppingCart, RefreshCw, X } from 'lucide-react';
import type { Portfolio, Instrument } from '../types';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">{children}</div>
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
                privateApi.get<Portfolio>('/api/portfolio'),
                publicApi.get<Instrument[]>('/api/market')
            ]);
            setPortfolio(portfolioRes.data);
            setInstruments(instrumentsRes.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            setLoading(false);
        }
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
        try {
            await privateApi.post('/api/portfolio/deposit', { amount: parseFloat(depositAmount) });
            toast.success('Para yatırma işlemi başarılı!');
            await fetchData();
            setDepositModal(false);
            setDepositAmount('');
        } catch (err) {
            console.error('Para yatırma hatası:', err);
            toast.error('Para yatırma işlemi başarısız.');
        }
        setActionLoading(false);
    };

    const handleBuy = async () => {
        if (!buySymbol || !buyQuantity || parseFloat(buyQuantity) <= 0) return;
        setActionLoading(true);
        try {
            await privateApi.post('/api/portfolio/buy', {
                instrumentSymbol: buySymbol,
                quantity: parseFloat(buyQuantity),
            });
            toast.success('Alım işlemi başarılı!');
            await fetchData();
            setBuyModal(false);
            setBuySymbol('');
            setBuyQuantity('');
        } catch (err) {
            console.error('Alım hatası:', err);
            toast.error('Alım işlemi başarısız.');
        }
        setActionLoading(false);
    };

    const handleSell = async () => {
        if (!sellModal || !sellQuantity || parseFloat(sellQuantity) <= 0) return;
        setActionLoading(true);
        try {
            await privateApi.post('/api/portfolio/sell', {
                instrumentSymbol: sellModal,
                quantity: parseFloat(sellQuantity),
            });
            toast.success('Satış işlemi başarılı!');
            await fetchData();
            setSellModal(null);
            setSellQuantity('');
        } catch (err) {
            console.error('Satım hatası:', err);
            toast.error('Satış işlemi başarısız.');
        }
        setActionLoading(false);
    };

    const getInstrumentPrice = (symbol: string): number => {
        const inst = instruments.find(i => i.symbol === symbol);
        return inst?.currentPrice || 0;
    };

    const calculatePnL = (item: { instrument: Instrument; quantity: number; averageCost: number }) => {
        const currentPrice = getInstrumentPrice(item.instrument.symbol) || item.instrument.currentPrice;
        const currentValue = currentPrice * item.quantity;
        const costValue = item.averageCost * item.quantity;
        const pnl = currentValue - costValue;
        const pnlPercent = costValue > 0 ? (pnl / costValue) * 100 : 0;
        return { pnl, pnlPercent, currentValue };
    };

    const totalPortfolioValue = portfolio?.items?.reduce((sum, item) => {
        const { currentValue } = calculatePnL(item);
        return sum + currentValue;
    }, portfolio.cashBalance || 0) || 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin text-emerald-400" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Özet Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Nakit Bakiye */}
                <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 rounded-xl p-5 border border-emerald-500/30 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-emerald-300 text-sm font-medium">Nakit Bakiye</span>
                        <Wallet className="text-emerald-400" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-white">
                        {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(portfolio?.cashBalance || 0)} ₺
                    </p>
                </div>

                {/* Toplam Değer */}
                <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl p-5 border border-blue-500/30 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-blue-300 text-sm font-medium">Toplam Portföy</span>
                        <TrendingUp className="text-blue-400" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-white">
                        {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(totalPortfolioValue)} ₺
                    </p>
                </div>

                {/* İşlemler */}
                <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-5 border border-purple-500/30 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-purple-300 text-sm font-medium">Hızlı İşlemler</span>
                        <ShoppingCart className="text-purple-400" size={20} />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setDepositModal(true)}
                            className="flex-1 flex items-center justify-center gap-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg py-2 text-sm font-medium transition-colors"
                        >
                            <ArrowDownToLine size={14} /> Yatır
                        </button>
                        <button
                            onClick={() => setBuyModal(true)}
                            className="flex-1 flex items-center justify-center gap-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg py-2 text-sm font-medium transition-colors"
                        >
                            <Plus size={14} /> Al
                        </button>
                    </div>
                </div>
            </div>

            {/* Pozisyonlar Tablosu */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-700">
                    <h2 className="text-lg font-semibold text-white">Pozisyonlarım</h2>
                </div>

                {!portfolio?.items?.length ? (
                    <div className="p-12 text-center text-slate-400">
                        <Wallet className="mx-auto mb-3 opacity-50" size={40} />
                        <p>Henüz pozisyonunuz yok</p>
                        <p className="text-sm mt-1">Hemen ilk yatırımınızı yapın!</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="p-4 text-left font-semibold">Sembol</th>
                                    <th className="p-4 text-left font-semibold">Miktar</th>
                                    <th className="p-4 text-right font-semibold">Ort. Maliyet</th>
                                    <th className="p-4 text-right font-semibold">Güncel Fiyat</th>
                                    <th className="p-4 text-right font-semibold">Kar/Zarar</th>
                                    <th className="p-4 text-center font-semibold">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {portfolio.items.map((item) => {
                                    const { pnl, pnlPercent } = calculatePnL(item);
                                    const isPositive = pnl >= 0;
                                    const currentPrice = getInstrumentPrice(item.instrument.symbol) || item.instrument.currentPrice;

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-700/50 transition-colors">
                                            <td className="p-4">
                                                <div>
                                                    <span className="font-bold text-white">{item.instrument.symbol}</span>
                                                    <p className="text-xs text-slate-400">{item.instrument.name}</p>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-300 font-mono">
                                                {new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 4 }).format(item.quantity)}
                                            </td>
                                            <td className="p-4 text-right text-slate-300 font-mono">
                                                {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(item.averageCost)} ₺
                                            </td>
                                            <td className="p-4 text-right text-white font-mono font-medium">
                                                {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(currentPrice)} ₺
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className={`flex items-center justify-end gap-1 font-mono ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                    <span className="font-medium">
                                                        {isPositive ? '+' : ''}{pnlPercent.toFixed(2)}%
                                                    </span>
                                                </div>
                                                <p className={`text-xs ${isPositive ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                                                    {isPositive ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(pnl)} ₺
                                                </p>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => setSellModal(item.instrument.symbol)}
                                                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-medium transition-colors"
                                                >
                                                    Sat
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Para Yatırma Modal */}
            <Modal isOpen={depositModal} onClose={() => setDepositModal(false)} title="Para Yatır">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Miktar (₺)</label>
                        <input
                            type="number"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                    <button
                        onClick={handleDeposit}
                        disabled={actionLoading}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
                    >
                        {actionLoading ? 'İşleniyor...' : 'Para Yatır'}
                    </button>
                </div>
            </Modal>

            {/* Alım Modal */}
            <Modal isOpen={buyModal} onClose={() => setBuyModal(false)} title="Enstrüman Al">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Enstrüman</label>
                        <select
                            value={buySymbol}
                            onChange={(e) => setBuySymbol(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Seçin...</option>
                            {instruments.map(inst => (
                                <option key={inst.symbol} value={inst.symbol}>
                                    {inst.symbol} - {inst.name} ({new Intl.NumberFormat('tr-TR').format(inst.currentPrice)} ₺)
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Miktar</label>
                        <input
                            type="number"
                            value={buyQuantity}
                            onChange={(e) => setBuyQuantity(e.target.value)}
                            placeholder="0"
                            step="0.0001"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <button
                        onClick={handleBuy}
                        disabled={actionLoading}
                        className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
                    >
                        {actionLoading ? 'İşleniyor...' : 'Satın Al'}
                    </button>
                </div>
            </Modal>

            {/* Satış Modal */}
            <Modal isOpen={Boolean(sellModal)} onClose={() => setSellModal(null)} title={`${sellModal} Sat`}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Miktar</label>
                        <input
                            type="number"
                            value={sellQuantity}
                            onChange={(e) => setSellQuantity(e.target.value)}
                            placeholder="0"
                            step="0.0001"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                        />
                    </div>
                    <button
                        onClick={handleSell}
                        disabled={actionLoading}
                        className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
                    >
                        {actionLoading ? 'İşleniyor...' : 'Sat'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
