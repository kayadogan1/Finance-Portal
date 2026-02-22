import { useState } from 'react';
import { Plus, Tags, Trash2, Edit3, FolderOpen } from 'lucide-react';

/* ─── Mock data ─── */
interface NewsCategory {
    id: number;
    name: string;
    slug: string;
    articleCount: number;
}

const initialCategories: NewsCategory[] = [
    { id: 1, name: 'Ekonomi', slug: 'economy', articleCount: 42 },
    { id: 2, name: 'Kripto', slug: 'crypto', articleCount: 38 },
    { id: 3, name: 'Global Piyasalar', slug: 'global', articleCount: 27 },
    { id: 4, name: 'Hisse Senetleri', slug: 'stocks', articleCount: 55 },
    { id: 5, name: 'Emtialar', slug: 'commodities', articleCount: 18 },
];

/* ─── Card ─── */
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

/* ─── Page ─── */
const AdminPage = () => {
    const [categories, setCategories] = useState<NewsCategory[]>(initialCategories);
    const [newCatName, setNewCatName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = () => {
        if (!newCatName.trim()) return;
        const slug = newCatName.toLowerCase().replace(/\s+/g, '-');
        setCategories((prev) => [
            ...prev,
            { id: Date.now(), name: newCatName.trim(), slug, articleCount: 0 },
        ]);
        setNewCatName('');
        setIsCreating(false);
    };

    const handleDelete = (id: number) => {
        setCategories((prev) => prev.filter((c) => c.id !== id));
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Yönetim Paneli</h2>
                    <p className="text-slate-400 mt-1">
                        Haber kategorilerini yönetin
                    </p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600
                               text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                >
                    <Plus size={18} />
                    Kategori Oluştur
                </button>
            </div>

            {/* Create new category form */}
            {isCreating && (
                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <Tags size={20} className="text-emerald-400" />
                        <h3 className="text-lg font-semibold text-white">Yeni Kategori</h3>
                    </div>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            placeholder="Kategori adı..."
                            className="flex-1 bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5
                                       text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500
                                       transition-colors"
                            autoFocus
                        />
                        <button
                            onClick={handleCreate}
                            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium
                                       rounded-xl transition-colors"
                        >
                            Kaydet
                        </button>
                        <button
                            onClick={() => { setIsCreating(false); setNewCatName(''); }}
                            className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium
                                       rounded-xl transition-colors"
                        >
                            İptal
                        </button>
                    </div>
                </Card>
            )}

            {/* Categories table */}
            <Card>
                <div className="flex items-center gap-2 mb-5">
                    <FolderOpen size={20} className="text-emerald-400" />
                    <h3 className="text-lg font-semibold text-white">Haber Kategorileri</h3>
                    <span className="ml-auto text-xs text-slate-500 bg-slate-700/60 px-3 py-1 rounded-full">
                        {categories.length} kategori
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-700/60">
                                <th className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Kategori
                                </th>
                                <th className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Slug
                                </th>
                                <th className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
                                    Makale Sayısı
                                </th>
                                <th className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">
                                    İşlemler
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/40">
                            {categories.map((cat) => (
                                <tr
                                    key={cat.id}
                                    className="group hover:bg-slate-700/20 transition-colors"
                                >
                                    <td className="py-4 pr-4">
                                        <span className="font-medium text-white">{cat.name}</span>
                                    </td>
                                    <td className="py-4 pr-4">
                                        <code className="text-sm text-slate-400 bg-slate-700/40 px-2 py-0.5 rounded">
                                            {cat.slug}
                                        </code>
                                    </td>
                                    <td className="py-4 text-center">
                                        <span className="text-slate-300">{cat.articleCount}</span>
                                    </td>
                                    <td className="py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-700/60
                                                           rounded-lg transition-colors"
                                                title="Düzenle"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(cat.id)}
                                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/60
                                                           rounded-lg transition-colors"
                                                title="Sil"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {categories.length === 0 && (
                    <p className="text-center text-slate-500 py-8">
                        Henüz kategori bulunmamaktadır. Yeni bir kategori oluşturun.
                    </p>
                )}
            </Card>
        </div>
    );
};

export default AdminPage;
