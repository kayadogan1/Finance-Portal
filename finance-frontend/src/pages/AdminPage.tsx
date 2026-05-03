import { useEffect, useMemo, useState } from 'react';
import type { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import {
    Activity,
    FolderOpen,
    Layers3,
    Plus,
    Radio,
    RefreshCw,
    ShieldCheck,
    Tags,
    Trash2,
    Users,
} from 'lucide-react';
import { privateApi, publicApi } from '../services/api';

interface NewsCategory {
    id: number;
    name: string;
    slug: string;
    articleCount: number;
}

interface InstrumentPreview {
    symbol: string;
    name: string;
    instrumentType: string;
    currentPrice: number | null;
    baseCurrency?: string | null;
    market?: string | null;
    isActive?: boolean;
}

type CategoryMode = 'writable' | 'readonly-topics';
type ProviderHealthState = 'ready' | 'warning' | 'error';

interface ProviderStatus {
    key: string;
    label: string;
    state: ProviderHealthState;
    detail: string;
}

interface ProviderStatusResponse {
    service: string;
    providers: ProviderStatus[];
}

const TOPIC_LABELS: Record<string, string> = {
    STOCK: 'Hisse',
    INDEX: 'Endeks',
    FUND: 'Fon',
    BOND: 'Tahvil / Bono',
    COMMODITY: 'Emtia',
    FOREX: 'Doviz',
    CRYPTO: 'Kripto',
    GENERAL: 'Genel Piyasa',
};

const formatCurrency = (value: number | null | undefined, currency?: string | null) => {
    if (value == null || Number.isNaN(value)) return '-';
    const normalized = currency === 'TRY' ? 'TRY' : currency === 'USD' ? 'USD' : currency || 'USD';
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: normalized,
        maximumFractionDigits: normalized === 'TRY' ? 2 : 2,
    }).format(value);
};

const slugify = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replaceAll(/\s+/g, '-')
        .replaceAll(/[^a-z0-9-]/g, '');

const AdminPage = () => {
    const [categories, setCategories] = useState<NewsCategory[]>([]);
    const [categoryMode, setCategoryMode] = useState<CategoryMode>('writable');
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [newCatName, setNewCatName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isRefreshingNews, setIsRefreshingNews] = useState(false);
    const [instruments, setInstruments] = useState<InstrumentPreview[]>([]);
    const [instrumentsLoading, setInstrumentsLoading] = useState(true);
    const [totalMembers, setTotalMembers] = useState<number | null>(null);
    const [totalMembersLoading, setTotalMembersLoading] = useState(true);
    const [instrumentAdminAvailable, setInstrumentAdminAvailable] = useState(false);
    const [newsRefreshAvailable, setNewsRefreshAvailable] = useState(true);
    const [lastNewsRefreshAt, setLastNewsRefreshAt] = useState<string | null>(null);
    const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);
    const [providerStatusesLoading, setProviderStatusesLoading] = useState(true);

    useEffect(() => {
        void Promise.all([fetchCategories(), fetchInactiveInstruments(), fetchTotalMembers(), fetchProviderStatuses()]);
    }, []);

    const categorySummary = useMemo(() => {
        if (categoryMode === 'readonly-topics') {
            return 'Haber konulari su an backend enum listesinden okunuyor.';
        }
        return 'Kategori CRUD aktif. Yeniden adlandirma icin update endpointi gerekli.';
    }, [categoryMode]);

    const fetchCategories = async () => {
        setCategoriesLoading(true);
        try {
            const { data } = await privateApi.get<NewsCategory[]>('/api/admin/news-categories');
            setCategories(Array.isArray(data) ? data : []);
            setCategoryMode('writable');
        } catch (error) {
            const status = (error as AxiosError)?.response?.status;
            if (status === 404 || !status) {
                try {
                    const { data } = await publicApi.get<string[]>('/api/news/topics');
                    const topicCategories = (Array.isArray(data) ? data : []).map((topic, index) => ({
                        id: index + 1,
                        name: TOPIC_LABELS[topic] ?? topic,
                        slug: slugify(topic),
                        articleCount: 0,
                    }));
                    setCategories(topicCategories);
                    setCategoryMode('readonly-topics');
                    toast('Kategori CRUD endpointi henuz yok, konu listesi salt okunur gosteriliyor.', { icon: 'i' });
                } catch {
                    toast.error('Kategori veya konu listesi yuklenemedi.');
                }
            } else {
                toast.error('Kategoriler yuklenemedi.');
            }
        } finally {
            setCategoriesLoading(false);
        }
    };

    const fetchTotalMembers = async () => {
        setTotalMembersLoading(true);
        try {
            const { data } = await privateApi.get<{ data?: number }>('/api/admin/totalMember');
            setTotalMembers(typeof data?.data === 'number' ? data.data : null);
        } catch {
            setTotalMembers(null);
            toast.error('Toplam kullanici sayisi yuklenemedi.');
        } finally {
            setTotalMembersLoading(false);
        }
    };

    const fetchInactiveInstruments = async () => {
        setInstrumentsLoading(true);
        try {
            const { data } = await privateApi.get<{ data?: InstrumentPreview[] } | InstrumentPreview[]>('/api/admin/nonactiveInstruments');
            const payload = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
            setInstruments(payload);
            setInstrumentAdminAvailable(true);
        } catch {
            setInstrumentAdminAvailable(false);
            setInstruments([]);
            toast.error('Inactive enstruman listesi yuklenemedi.');
        } finally {
            setInstrumentsLoading(false);
        }
    };

    const handleInstrumentActivation = async (symbol: string, nextActive: boolean) => {
        try {
            await privateApi.patch(`/api/admin/instruments/${symbol}/active`, { active: nextActive });
            toast.success(nextActive ? 'Enstruman tekrar aktif edildi.' : 'Enstruman pasife alindi.');
            setInstruments((prev) => prev.filter((instrument) => instrument.symbol !== symbol));
        } catch {
            toast.error('Enstruman durumu guncellenemedi.');
        }
    };

    const handleCreate = async () => {
        if (!newCatName.trim()) return;
        if (categoryMode !== 'writable') {
            toast.error('Kategori eklemek icin backend CRUD endpointleri gerekli.');
            return;
        }
        try {
            const { data } = await privateApi.post<NewsCategory>('/api/admin/news-categories', { name: newCatName.trim() });
            setCategories((prev) => [...prev, data]);
            toast.success('Kategori olusturuldu.');
            setNewCatName('');
            setIsCreating(false);
        } catch {
            toast.error('Kategori olusturulamadi.');
        }
    };

    const handleDelete = async (id: number) => {
        if (categoryMode !== 'writable') {
            toast.error('Kategori silmek icin backend CRUD endpointleri gerekli.');
            return;
        }
        try {
            await privateApi.delete(`/api/admin/news-categories/${id}`);
            setCategories((prev) => prev.filter((category) => category.id !== id));
            toast.success('Kategori silindi.');
        } catch {
            toast.error('Kategori silinemedi.');
        }
    };

    const handleRefreshNews = async () => {
        try {
            setIsRefreshingNews(true);
            await privateApi.post('/api/news/refresh');
            setNewsRefreshAvailable(true);
            setLastNewsRefreshAt(new Date().toLocaleString('tr-TR'));
            await fetchProviderStatuses();
            toast.success('Haber guncelleme tetiklendi.');
        } catch {
            setNewsRefreshAvailable(false);
            toast.error('Haber guncelleme baslatilamadi.');
        } finally {
            setIsRefreshingNews(false);
        }
    };

    const fetchProviderStatuses = async () => {
        setProviderStatusesLoading(true);
        try {
            const [{ data: financeStatus }, { data: newsStatus }] = await Promise.all([
                privateApi.get<ProviderStatusResponse>('/api/admin/providers/status'),
                privateApi.get<ProviderStatusResponse>('/api/news/admin/providers/status'),
            ]);

            const merged = [
                ...(financeStatus.providers ?? []),
                ...(newsStatus.providers ?? []),
                {
                    key: 'news-refresh',
                    label: 'Manuel Haber Refresh',
                    state: newsRefreshAvailable ? 'ready' : 'error',
                    detail: newsRefreshAvailable
                        ? `Admin panelinden manuel tetikleme hazir${lastNewsRefreshAt ? ` • Son tetikleme: ${lastNewsRefreshAt}` : ''}`
                        : 'Refresh endpointi veya haber akisi kontrol edilmeli.',
                } satisfies ProviderStatus,
            ];

            setProviderStatuses(merged);
        } catch {
            setProviderStatuses([
                {
                    key: 'provider-status-fallback',
                    label: 'Provider Status',
                    state: 'error',
                    detail: 'Provider status endpointleri okunamadi.',
                },
            ]);
        } finally {
            setProviderStatusesLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Haber Kaynaklari',
            value: 'Canli',
            note: 'Providerlardan manuel yeniden cekme hazir.',
            icon: Radio,
            accent: 'text-primary',
        },
        {
            title: 'Toplam Kullanici',
            value: totalMembersLoading ? 'Yukleniyor...' : totalMembers?.toLocaleString('tr-TR') ?? 'Bilinmiyor',
            note: totalMembersLoading
                ? 'Kullanici sayisi getiriliyor.'
                : totalMembers == null
                    ? 'Toplam kullanici endpointi cevap vermedi.'
                    : 'Admin controller uzerinden canli kullanici sayisi.',
            icon: Users,
            accent: totalMembers == null ? 'text-muted-foreground' : 'text-foreground',
        },
        {
            title: 'Provider Status',
            value: providerStatusesLoading
                ? 'Yukleniyor...'
                : `${providerStatuses.filter((status) => status.state === 'ready').length}/${providerStatuses.length}`,
            note: 'Bagli admin akislari icin temel saglik gorunumu.',
            icon: Radio,
            accent: 'text-primary',
        },
        {
            title: 'Instrument Aktivasyon',
            value: instrumentAdminAvailable ? `${instruments.length} inactive` : 'Kontrol gerekli',
            note: instrumentAdminAvailable
                ? 'Inactive instrument listesi admin panelinde yonetiliyor.'
                : 'Instrument admin endpointi kontrol edilmeli.',
            icon: ShieldCheck,
            accent: instrumentAdminAvailable ? 'text-emerald-400' : 'text-muted-foreground',
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.2px] text-foreground">Yonetim Paneli</h2>
                    <p className="text-meta mt-1">
                        Haber operasyonlari, kategori taksonomisi ve admin akislarini tek yerden yonetin.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={handleRefreshNews}
                        disabled={isRefreshingNews}
                        className="flex items-center gap-1.5 px-4 h-9 rounded text-[13px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-70"
                    >
                        <RefreshCw size={15} className={isRefreshingNews ? 'animate-spin' : ''} />
                        Haberleri Yenile
                    </button>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-1.5 px-4 h-9 rounded text-[13px] font-medium bg-transparent border border-border text-foreground hover:bg-white/5 transition-colors"
                    >
                        <Plus size={15} />
                        Kategori Ekle
                    </button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {statCards.map(({ title, value, note, icon: Icon, accent }) => (
                    <div key={title} className="card-base">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-label">{title}</p>
                                <p className={`mt-3 text-[18px] font-semibold ${accent}`}>{value}</p>
                                <p className="text-meta mt-2 text-[13px] leading-relaxed">{note}</p>
                            </div>
                            <div className="rounded-md border border-border bg-white/5 p-2">
                                <Icon size={16} className={accent} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isCreating && (
                <div className="card-base">
                    <div className="flex items-center gap-2 mb-4">
                        <Tags size={14} className="text-primary" />
                        <span className="text-[14px] font-medium text-foreground">Yeni Finans Kategorisi</span>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                            type="text"
                            value={newCatName}
                            onChange={(event) => setNewCatName(event.target.value)}
                            onKeyDown={(event) => event.key === 'Enter' && handleCreate()}
                            placeholder="Kategori adi..."
                            autoFocus
                            className="flex-1 h-9 bg-background border border-border rounded px-3 text-[13px] text-foreground placeholder:text-ghost focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                        />
                        <button
                            onClick={handleCreate}
                            className="px-4 h-9 rounded text-[13px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            Kaydet
                        </button>
                        <button
                            onClick={() => {
                                setIsCreating(false);
                                setNewCatName('');
                            }}
                            className="px-4 h-9 rounded text-[13px] font-medium bg-transparent border border-border text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                        >
                            Iptal
                        </button>
                    </div>
                    <p className="text-meta mt-3 text-[12px]">{categorySummary}</p>
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[1.25fr,0.95fr]">
                <div className="card-base">
                    <div className="flex items-center gap-2 mb-4">
                        <FolderOpen size={14} className="text-primary" />
                        <span className="text-[14px] font-medium text-foreground">Haber Kategorileri</span>
                        <span className="ml-auto text-label bg-white/5 px-2 py-0.5 rounded">
                            {categories.length} kategori
                        </span>
                    </div>
                    <p className="text-meta mb-4 text-[13px]">{categorySummary}</p>

                    {categoriesLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <RefreshCw className="animate-spin text-primary" size={24} />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="pb-2.5 text-label">Kategori</th>
                                        <th className="pb-2.5 text-label">Slug</th>
                                        <th className="pb-2.5 text-label text-center">Makale</th>
                                        <th className="pb-2.5 text-label text-right">Islem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {categories.map((category) => (
                                        <tr key={category.id} className="group h-11 hover:bg-white/[0.02] transition-colors">
                                            <td className="py-0 text-[13px] font-medium text-foreground">{category.name}</td>
                                            <td className="py-0">
                                                <code className="text-meta bg-white/5 px-1.5 py-0.5 rounded-sm">{category.slug}</code>
                                            </td>
                                            <td className="py-0 text-center text-[13px] tabular-nums text-muted-foreground">
                                                {category.articleCount}
                                            </td>
                                            <td className="py-0 text-right">
                                                {categoryMode === 'writable' ? (
                                                    <button
                                                        onClick={() => handleDelete(category.id)}
                                                        className="inline-flex items-center gap-1 p-1.5 text-subtle hover:text-negative transition-colors"
                                                        title="Sil"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                ) : (
                                                    <span className="text-[12px] text-meta">Salt okunur</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!categoriesLoading && categories.length === 0 && (
                        <p className="text-center text-meta py-8">Henuz kategori bulunmamaktadir.</p>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="card-base">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity size={14} className="text-primary" />
                            <span className="text-[14px] font-medium text-foreground">Haber Operasyonlari</span>
                        </div>
                        <div className="space-y-3">
                            <div className="rounded-md border border-border bg-background/60 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[13px] font-medium text-foreground">Providerlardan yeniden cek</p>
                                        <p className="text-meta mt-1 text-[12px]">
                                            News service tarafindaki refresh endpointi manuel tetiklenir.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleRefreshNews}
                                        disabled={isRefreshingNews}
                                        className="px-3 h-8 rounded text-[12px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-70"
                                    >
                                        Calistir
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-md border border-border bg-background/60 p-3">
                                <p className="text-[13px] font-medium text-foreground">Provider Status</p>
                                <div className="mt-3 space-y-2">
                                    {providerStatuses.map((status) => (
                                        <div key={status.key} className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-white/[0.02] px-3 py-2">
                                            <div>
                                                <p className="text-[12px] font-medium text-foreground">{status.label}</p>
                                                <p className="text-[11px] text-meta mt-1">{status.detail}</p>
                                            </div>
                                            <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                                                status.state === 'ready'
                                                    ? 'bg-emerald-500/10 text-emerald-400'
                                                    : status.state === 'warning'
                                                        ? 'bg-amber-500/10 text-amber-400'
                                                        : 'bg-red-500/10 text-red-400'
                                            }`}>
                                                {status.state === 'ready' ? 'Hazir' : status.state === 'warning' ? 'Uyari' : 'Hata'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card-base">
                        <div className="flex items-center gap-2 mb-4">
                            <Layers3 size={14} className="text-primary" />
                            <span className="text-[14px] font-medium text-foreground">Enstruman Yonetimi</span>
                        </div>

                        {instrumentsLoading ? (
                            <div className="flex items-center justify-center h-40">
                                <RefreshCw className="animate-spin text-primary" size={24} />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {instruments.map((instrument) => (
                                    <div
                                        key={instrument.symbol}
                                        className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-3 py-2.5"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[13px] font-semibold text-foreground">{instrument.symbol}</span>
                                                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                                    {instrument.instrumentType}
                                                </span>
                                            </div>
                                            <p className="text-meta mt-1 truncate text-[12px]">{instrument.name}</p>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <p className="text-[13px] font-medium text-foreground">
                                                {formatCurrency(instrument.currentPrice, instrument.baseCurrency)}
                                            </p>
                                            <p className="text-meta mt-1 text-[12px]">
                                                {instrument.market ?? '-'} • {instrument.isActive ? 'aktif' : 'inactive'}
                                            </p>
                                            <button
                                                onClick={() => handleInstrumentActivation(instrument.symbol, true)}
                                                className="mt-2 px-2.5 h-7 rounded text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
                                            >
                                                Aktif Et
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {instruments.length === 0 && (
                                    <div className="flex items-center justify-center rounded-md border border-dashed border-border py-10 text-meta">
                                        Gosterilecek enstruman bulunamadi.
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-4 rounded-md border border-dashed border-border px-3 py-3 text-[12px] text-meta leading-relaxed">
                            Aktif / pasif toggle akisi su endpoint varsayimiyla baglandi:
                            <div className="mt-2 space-y-1 font-mono text-[11px]">
                                <div>GET /api/admin/nonactiveInstruments</div>
                                <div>PATCH /api/admin/instruments/{'{symbol}'}/active</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
