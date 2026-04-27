import { useQuery } from '@tanstack/react-query';
import {
    User, Mail, Shield, Star, TrendingUp, TrendingDown,
    Sun, Moon, Trash2, ArrowRight, RefreshCw,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useTheme from '../hooks/useTheme';
import { useFavorites } from '../hooks/useFavorites';
import { formatChangePercent, getMarketInstruments, hasChange, type MarketInstrument } from '../services/marketService';
import { getTransactions } from '../services/portfolioService';
import keycloak from '../utils/keycloak';

/* ─── Helpers ─── */

function formatDate(isoStr: string): string {
    const d = new Date(isoStr);
    return d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

/* ═══════════════════════════════════
   Profile Page
   ═══════════════════════════════════ */

const ProfilePage = () => {
    const { isAuthenticated, username, isAdmin } = useAuth();
    const { isDark, toggle: toggleTheme } = useTheme();
    const { favorites, removeFavorite } = useFavorites();

    // Fetch instruments to enrich favorites with price data
    const { data: instruments = [], isLoading: instsLoading } = useQuery({
        queryKey: ['market-instruments'],
        queryFn: getMarketInstruments,
        staleTime: 1000 * 60 * 5,
    });

    // Fetch recent transactions (only if authenticated)
    const { data: transactions = [], isLoading: txLoading } = useQuery({
        queryKey: ['profile-transactions'],
        queryFn: () => getTransactions(),
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 2,
    });

    // Map favorites to instrument data
    const favoriteInstruments: (MarketInstrument & { symbol: string })[] = favorites
        .map((sym) => instruments.find((i) => i.symbol === sym))
        .filter(Boolean) as MarketInstrument[];

    // Keycloak token info
    const email = keycloak.tokenParsed?.email ?? '';

    const cardStyle: React.CSSProperties = {
        background: 'hsl(var(--card))',
        borderRadius: 12,
        border: '1px solid hsl(var(--border))',
        padding: 24,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px', color: 'hsl(var(--foreground))' }}>
                    Profil
                </h2>
                <p className="text-meta mt-1">Hesap bilgileriniz ve tercihleriniz</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* ─── User Info Card ─── */}
                <div style={cardStyle} className="lg:col-span-1">
                    {/* Avatar */}
                    <div className="flex flex-col items-center text-center mb-6">
                        <div
                            style={{
                                width: 72,
                                height: 72,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
                                border: '2px solid rgba(99,102,241,0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 28,
                                fontWeight: 700,
                                color: '#818cf8',
                                marginBottom: 12,
                            }}
                        >
                            {username?.charAt(0)?.toUpperCase() ?? 'U'}
                        </div>
                        <h3 className="text-[18px] font-semibold text-foreground">{username || 'Kullanıcı'}</h3>
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                marginTop: 6,
                                fontSize: 11,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                padding: '3px 10px',
                                borderRadius: 6,
                                background: isAdmin ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)',
                                color: isAdmin ? '#ef4444' : '#818cf8',
                            }}
                        >
                            <Shield size={11} />
                            {isAdmin ? 'Yönetici' : 'Kullanıcı'}
                        </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: 'hsl(var(--card-hover))' }}>
                            <User size={14} className="text-subtle shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[10px] text-subtle uppercase tracking-wider">Kullanıcı Adı</p>
                                <p className="text-[13px] font-medium text-foreground truncate">{username || '—'}</p>
                            </div>
                        </div>
                        {email && (
                            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: 'hsl(var(--card-hover))' }}>
                                <Mail size={14} className="text-subtle shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[10px] text-subtle uppercase tracking-wider">E-posta</p>
                                    <p className="text-[13px] font-medium text-foreground truncate">{email}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Theme Toggle */}
                    <div className="mt-6 pt-5 border-t border-border">
                        <span className="text-label mb-3 block">Tema Tercihi</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => isDark && toggleTheme()}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    height: 40,
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    border: !isDark ? '1px solid rgba(99,102,241,0.4)' : '1px solid hsl(var(--border))',
                                    background: !isDark ? 'rgba(99,102,241,0.1)' : 'transparent',
                                    color: !isDark ? '#818cf8' : 'hsl(var(--muted-foreground))',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <Sun size={14} /> Aydınlık
                            </button>
                            <button
                                onClick={() => !isDark && toggleTheme()}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    height: 40,
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    border: isDark ? '1px solid rgba(99,102,241,0.4)' : '1px solid hsl(var(--border))',
                                    background: isDark ? 'rgba(99,102,241,0.1)' : 'transparent',
                                    color: isDark ? '#818cf8' : 'hsl(var(--muted-foreground))',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <Moon size={14} /> Karanlık
                            </button>
                        </div>
                    </div>
                </div>

                {/* ─── Favorites + Transactions ─── */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Favorite instruments */}
                    <div style={cardStyle}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Star size={14} className="text-yellow-500" />
                                <span className="text-[14px] font-semibold text-foreground">Favori Enstrümanlar</span>
                                {favorites.length > 0 && (
                                    <span style={{
                                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                                        background: 'rgba(234,179,8,0.1)', color: '#eab308',
                                    }}>
                                        {favorites.length}
                                    </span>
                                )}
                            </div>
                            <NavLink to="/market" className="text-[12px] font-medium text-subtle hover:text-foreground flex items-center gap-1 transition-colors">
                                Piyasalara Git <ArrowRight size={11} />
                            </NavLink>
                        </div>

                        {favorites.length === 0 ? (
                            <div className="py-8 text-center">
                                <Star className="mx-auto mb-2 text-ghost" size={28} />
                                <p className="text-meta">Henüz favori enstrümanınız yok.</p>
                                <p className="text-[12px] text-subtle mt-1">Piyasalar sayfasında yıldız ikonuna tıklayarak favori ekleyebilirsiniz.</p>
                            </div>
                        ) : instsLoading ? (
                            <div className="py-6 text-center">
                                <RefreshCw className="mx-auto mb-2 text-ghost animate-spin" size={20} />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {favoriteInstruments.map((inst) => {
                                    const hasChangeValue = hasChange(inst);
                                    const isPositive = hasChangeValue && inst.change24h >= 0;
                                    return (
                                        <div
                                            key={inst.symbol}
                                            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:translate-y-[-1px]"
                                            style={{
                                                background: 'hsl(var(--card-hover))',
                                                border: '1px solid hsl(var(--border-subtle))',
                                                borderLeft: `3px solid ${!hasChangeValue ? 'hsl(var(--muted-foreground))' : isPositive ? '#10b981' : '#ef4444'}`,
                                            }}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[13px] font-semibold text-foreground">{inst.symbol}</span>
                                                <p className="text-[11px] text-subtle truncate">{inst.name}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-[14px] font-semibold text-foreground tabular-nums">
                                                    {(inst.currentPrice ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                                                </div>
                                                <span
                                                    className="inline-flex items-center gap-1"
                                                    style={{
                                                        fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                                                        color: !hasChangeValue ? 'hsl(var(--muted-foreground))' : isPositive ? '#10b981' : '#ef4444',
                                                    }}
                                                >
                                                    {hasChangeValue ? (isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />) : null}
                                                    {formatChangePercent(inst.change24h)}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => removeFavorite(inst.symbol)}
                                                title="Favorilerden çıkar"
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                                                    display: 'flex', color: 'hsl(var(--subtle-foreground))',
                                                    transition: 'color 0.15s',
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--subtle-foreground))'; }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    );
                                })}
                                {/* Favorites that aren't in loaded instruments */}
                                {favorites
                                    .filter((sym) => !instruments.some((i) => i.symbol === sym))
                                    .map((sym) => (
                                        <div
                                            key={sym}
                                            className="flex items-center gap-3 px-4 py-3 rounded-lg"
                                            style={{ background: 'hsl(var(--card-hover))', border: '1px solid hsl(var(--border-subtle))' }}
                                        >
                                            <span className="text-[13px] font-semibold text-foreground flex-1">{sym}</span>
                                            <span className="text-[11px] text-subtle">Fiyat bilgisi yükleniyor...</span>
                                            <button
                                                onClick={() => removeFavorite(sym)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'hsl(var(--subtle-foreground))' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Recent transactions */}
                    {isAuthenticated && (
                        <div style={cardStyle}>
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp size={14} className="text-primary" />
                                <span className="text-[14px] font-semibold text-foreground">Son İşlemler</span>
                            </div>

                            {txLoading ? (
                                <div className="py-6 text-center">
                                    <RefreshCw className="mx-auto mb-2 text-ghost animate-spin" size={20} />
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="py-6 text-center">
                                    <p className="text-meta">Henüz işlem geçmişi bulunmuyor.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="px-3 py-2 text-left text-label">Tür</th>
                                                <th className="px-3 py-2 text-left text-label">Enstrüman</th>
                                                <th className="px-3 py-2 text-right text-label">Miktar</th>
                                                <th className="px-3 py-2 text-right text-label">Fiyat</th>
                                                <th className="px-3 py-2 text-right text-label">Tarih</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {transactions.slice(0, 10).map((tx, idx) => {
                                                const isBuy = tx.transactionType === 'BUY';
                                                return (
                                                    <tr key={idx} className="h-10 hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-3 py-0">
                                                            <span className={`text-[11px] font-bold ${isBuy ? 'text-positive' : 'text-negative'}`}>
                                                                {isBuy ? 'ALIŞ' : 'SATIŞ'}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-0 text-[13px] font-medium text-foreground">{tx.instrumentName}</td>
                                                        <td className="px-3 py-0 text-right text-[13px] tabular-nums text-muted-foreground">
                                                            {Number(tx.quantity).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}
                                                        </td>
                                                        <td className="px-3 py-0 text-right text-[13px] font-medium tabular-nums text-foreground">
                                                            {Number(tx.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                        </td>
                                                        <td className="px-3 py-0 text-right text-[11px] text-subtle tabular-nums">
                                                            {formatDate(tx.dateTime)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
