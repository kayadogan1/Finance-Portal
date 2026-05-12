import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
    Activity,
    CheckCircle2,
    ExternalLink,
    FolderOpen,
    Layers3,
    Newspaper,
    Plus,
    Radio,
    RefreshCw,
    ShieldCheck,
    Tags,
    Trash2,
    Users,
} from 'lucide-react';
import { privateApi, publicApi } from '../services/api';
import {
    deleteNewsArticle,
    getPendingNews,
    getNewsCategoryLabel,
    updateNewsApproval,
    type FilteredArticleDto,
} from '../services/newsService';

interface NewsCategory {
    id: number;
    name: string;
    slug: string;
    articleCount: number;
}

interface InstrumentPreview {
    symbol: string;
    name: string;
    instrumentType: string;     // InstrumentType enum serializes as string (e.g. "STOCK")
    currentPrice: number | null;
    previousPrice?: number | null;
    changePercent?: number | null;
    baseCurrency?: string | null; // Currency enum serializes as string (e.g. "TRY")
    market?: string | null;
    active: boolean;             // boolean field, serializes as "active"
    historicalDataLoaded?: boolean;
    lastUpdateTime?: string | null;
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
    const rawCurrency = (currency || 'USD').toUpperCase();
    const normalized = rawCurrency === 'TL'
        ? 'TRY'
        : ['USDT', 'XAU', 'XAG'].includes(rawCurrency)
            ? 'USD'
            : rawCurrency;

    try {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: normalized,
            maximumFractionDigits: 2,
        }).format(value);
    } catch {
        return `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value)} ${rawCurrency}`;
    }
};

const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('tr-TR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
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
    const [pendingNews, setPendingNews] = useState<FilteredArticleDto[]>([]);
    const [pendingNewsLoading, setPendingNewsLoading] = useState(true);
    const [updatingNewsIds, setUpdatingNewsIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        void Promise.all([fetchCategories(), fetchInactiveInstruments(), fetchTotalMembers(), fetchProviderStatuses(), fetchPendingNews()]);
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
            const { data } = await publicApi.get<string[]>('/api/news/topics');
            const topicCategories = (Array.isArray(data) ? data : []).map((topic, index) => ({
                id: index + 1,
                name: TOPIC_LABELS[topic] ?? topic,
                slug: slugify(topic),
                articleCount: 0,
            }));
            setCategories(topicCategories);
            setCategoryMode('readonly-topics');
        } catch {
            toast.error('Konu listesi yuklenemedi.');
        } finally {
            setCategoriesLoading(false);
        }
    };

    const fetchTotalMembers = async () => {
        setTotalMembersLoading(true);
        try {
            // privateApi interceptor already unwraps ApiResult — `data` is the number directly
            const { data } = await privateApi.get<number>('/api/admin/totalMember');
            setTotalMembers(typeof data === 'number' ? data : null);
        } catch {
            setTotalMembers(null);
        } finally {
            setTotalMembersLoading(false);
        }
    };

    const fetchInactiveInstruments = async () => {
        setInstrumentsLoading(true);
        try {
            // privateApi interceptor already unwraps ApiResult — `data` is the array directly
            const { data } = await privateApi.get<InstrumentPreview[]>('/api/admin/nonactiveInstruments');
            const payload = Array.isArray(data) ? data : [];
            setInstruments(payload);
            setInstrumentAdminAvailable(true);
        } catch {
            setInstrumentAdminAvailable(false);
            setInstruments([]);
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
            await fetchPendingNews();
            await fetchProviderStatuses();
            toast.success('Haber guncelleme tetiklendi.');
        } catch {
            setNewsRefreshAvailable(false);
            toast.error('Haber guncelleme baslatilamadi.');
        } finally {
            setIsRefreshingNews(false);
        }
    };

    const getArticleId = (article: FilteredArticleDto) => article.source?.id ?? article.url;

    const fetchPendingNews = async () => {
        setPendingNewsLoading(true);
        try {
            setPendingNews(await getPendingNews());
        } catch {
            toast.error('Onay bekleyen haberler yuklenemedi.');
            setPendingNews([]);
        } finally {
            setPendingNewsLoading(false);
        }
    };

    const handleApproveNews = async (article: FilteredArticleDto) => {
        const id = getArticleId(article);
        if (!id) return;
        setUpdatingNewsIds((prev) => new Set(prev).add(id));
        try {
            await updateNewsApproval(id, true);
            setPendingNews((prev) => prev.filter((item) => getArticleId(item) !== id));
            toast.success('Haber onaylandi ve yayina alindi.');
        } catch {
            toast.error('Haber onaylanamadi.');
        } finally {
            setUpdatingNewsIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const handleDeleteNews = async (article: FilteredArticleDto) => {
        const id = getArticleId(article);
        if (!id) return;
        setUpdatingNewsIds((prev) => new Set(prev).add(id));
        try {
            await deleteNewsArticle(id);
            setPendingNews((prev) => prev.filter((item) => getArticleId(item) !== id));
            toast.success('Haber kuyruktan silindi.');
        } catch {
            toast.error('Haber silinemedi.');
        } finally {
            setUpdatingNewsIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const fetchProviderStatuses = async () => {
        setProviderStatusesLoading(true);
        try {
            const [financeResult, newsResult] = await Promise.allSettled([
                privateApi.get<ProviderStatusResponse>('/api/admin/providers/status'),
                privateApi.get<ProviderStatusResponse>('/api/news/admin/providers/status'),
            ]);

            // interceptor unwraps ApiResult → data IS ProviderStatusResponse directly
            const financeProviders = financeResult.status === 'fulfilled'
                ? financeResult.value.data.providers ?? []
                : [{
                    key: 'finance-provider-status',
                    label: 'Finance Service',
                    state: 'error' as const,
                    detail: 'Finance provider status endpointi okunamadi.',
                }];

            const newsProviders = newsResult.status === 'fulfilled'
                ? newsResult.value.data.providers ?? []
                : [{
                    key: 'news-provider-status',
                    label: 'News Service',
                    state: 'error' as const,
                    detail: 'News provider status endpointi okunamadi.',
                }];

            const merged = [
                ...financeProviders,
                ...newsProviders,
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
            title: 'Haber Onayi',
            value: pendingNewsLoading ? 'Yukleniyor...' : `${pendingNews.length} bekleyen`,
            note: pendingNewsLoading
                ? 'Onay kuyrugu yukleniyor.'
                : pendingNews.length > 0
                    ? 'Onaylanmayan haberler public sayfalarda gorunmez.'
                    : 'Yayin bekleyen haber bulunmuyor.',
            icon: Newspaper,
            accent: pendingNews.length > 0 ? 'text-amber-400' : 'text-emerald-400',
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
                    {categoryMode === 'writable' && (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="flex items-center gap-1.5 px-4 h-9 rounded text-[13px] font-medium bg-transparent border border-border text-foreground hover:bg-white/5 transition-colors"
                        >
                            <Plus size={15} />
                            Kategori Ekle
                        </button>
                    )}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[13px] font-medium text-foreground">Haber Onay Kuyrugu</p>
                                        <p className="text-meta mt-1 text-[12px]">
                                            Onaylanmayan haberler Haberler sayfasinda yayinlanmaz.
                                        </p>
                                    </div>
                                    <button
                                        onClick={fetchPendingNews}
                                        disabled={pendingNewsLoading}
                                        className="inline-flex h-8 items-center gap-1 rounded border border-border px-2.5 text-[12px] font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground disabled:opacity-60"
                                    >
                                        <RefreshCw size={13} className={pendingNewsLoading ? 'animate-spin' : ''} />
                                        Yenile
                                    </button>
                                </div>

                                {pendingNewsLoading ? (
                                    <div className="flex items-center justify-center py-8 text-meta">
                                        <RefreshCw className="mr-2 animate-spin text-primary" size={15} />
                                        Haberler yukleniyor...
                                    </div>
                                ) : pendingNews.length === 0 ? (
                                    <div className="rounded border border-dashed border-border py-8 text-center text-meta">
                                        Onay bekleyen haber yok.
                                    </div>
                                ) : (
                                    <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                                        {pendingNews.map((article) => {
                                            const articleId = getArticleId(article);
                                            const isUpdating = updatingNewsIds.has(articleId);
                                            return (
                                                <div key={articleId} className="rounded-md border border-border/70 bg-white/[0.02] p-3">
                                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                                        <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                                                            {getNewsCategoryLabel(article.category)}
                                                        </span>
                                                        <span className="text-[11px] text-meta">{article.source?.name ?? 'Bilinmeyen kaynak'}</span>
                                                        <span className="text-[11px] text-meta">{formatDateTime(article.publishedAt)}</span>
                                                    </div>
                                                    <p className="line-clamp-2 text-[13px] font-semibold leading-5 text-foreground">
                                                        {article.title}
                                                    </p>
                                                    {article.description && (
                                                        <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-muted-foreground">
                                                            {article.description}
                                                        </p>
                                                    )}
                                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                                        <a
                                                            href={article.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:text-primary/80"
                                                        >
                                                            Kaynagi ac
                                                            <ExternalLink size={12} />
                                                        </a>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleDeleteNews(article)}
                                                                disabled={isUpdating}
                                                                className="inline-flex h-8 items-center gap-1 rounded border border-red-500/30 px-2.5 text-[12px] font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-60"
                                                            >
                                                                <Trash2 size={13} />
                                                                Sil
                                                            </button>
                                                            <button
                                                                onClick={() => handleApproveNews(article)}
                                                                disabled={isUpdating}
                                                                className="inline-flex h-8 items-center gap-1 rounded bg-emerald-500/15 px-2.5 text-[12px] font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-60"
                                                            >
                                                                <CheckCircle2 size={13} />
                                                                Onayla
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-md border border-border bg-background/60 p-3">
                                <p className="text-[13px] font-medium text-foreground">Provider Status</p>
                                {providerStatusesLoading ? (
                                    <div className="mt-3 flex items-center justify-center py-6 text-meta">
                                        <RefreshCw className="animate-spin text-primary mr-2" size={15} />
                                        Provider durumu yukleniyor...
                                    </div>
                                ) : (
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
                                )}
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
                                                {instrument.market ?? '-'} • {instrument.active ? 'aktif' : 'inactive'}
                                                {instrument.changePercent != null && (
                                                    <span className={`ml-2 font-semibold ${instrument.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {instrument.changePercent >= 0 ? '+' : ''}{Number(instrument.changePercent).toFixed(2)}%
                                                    </span>
                                                )}
                                            </p>
                                        <div className="flex gap-2 mt-2 justify-end">
                                            {!instrument.active && (
                                                <button
                                                    onClick={() => handleInstrumentActivation(instrument.symbol, true)}
                                                    className="px-2.5 h-7 rounded text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
                                                >
                                                    Aktif Et
                                                </button>
                                            )}
                                            {instrument.active && (
                                                <button
                                                    onClick={() => handleInstrumentActivation(instrument.symbol, false)}
                                                    className="px-2.5 h-7 rounded text-[11px] font-medium bg-red-500/10 text-red-400 hover:bg-red-500/15 transition-colors"
                                                >
                                                    Pasife Al
                                                </button>
                                            )}
                                        </div>
                                        </div>
                                    </div>
                                ))}

                                {instruments.length === 0 && (
                                    <div className="flex items-center justify-center rounded-md border border-dashed border-border py-10 text-meta">
                                        Pasif enstruman bulunmuyor; liste temiz gorunuyor.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
