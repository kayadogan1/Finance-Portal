import { useState, useEffect } from 'react';
import { privateApi } from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Tags, Trash2, Edit3, FolderOpen, RefreshCw } from 'lucide-react';

interface NewsCategory { id: number; name: string; slug: string; articleCount: number; }

const AdminPage = () => {
    const [categories, setCategories] = useState<NewsCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCatName, setNewCatName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => { fetchCategories(); }, []);

    const fetchCategories = async () => {
        try { const { data } = await privateApi.get<NewsCategory[]>('/api/admin/news-categories'); setCategories(data); }
        catch { toast.error('Kategoriler yüklenemedi.'); }
        finally { setLoading(false); }
    };

    const handleCreate = async () => {
        if (!newCatName.trim()) return;
        try {
            const { data } = await privateApi.post<NewsCategory>('/api/admin/news-categories', { name: newCatName.trim() });
            setCategories(prev => [...prev, data]); toast.success('Kategori oluşturuldu!'); setNewCatName(''); setIsCreating(false);
        } catch { toast.error('Kategori oluşturulamadı.'); }
    };

    const handleDelete = async (id: number) => {
        try { await privateApi.delete(`/api/admin/news-categories/${id}`); setCategories(prev => prev.filter(c => c.id !== id)); toast.success('Kategori silindi.'); }
        catch { toast.error('Kategori silinemedi.'); }
    };

    if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-primary" size={24} /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.2px] text-foreground">Yönetim Paneli</h2>
                    <p className="text-meta mt-1">Haber kategorilerini yönetin</p>
                </div>
                <button onClick={() => setIsCreating(true)} className="flex items-center gap-1.5 px-4 h-9 rounded text-[13px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Plus size={15} /> Kategori Oluştur
                </button>
            </div>

            {isCreating && (
                <div className="card-base">
                    <div className="flex items-center gap-2 mb-4">
                        <Tags size={14} className="text-primary" />
                        <span className="text-[14px] font-medium text-foreground">Yeni Kategori</span>
                    </div>
                    <div className="flex gap-2">
                        <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            placeholder="Kategori adı..." autoFocus
                            className="flex-1 h-9 bg-background border border-border rounded px-3 text-[13px] text-foreground placeholder:text-ghost focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0" />
                        <button onClick={handleCreate} className="px-4 h-9 rounded text-[13px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Kaydet</button>
                        <button onClick={() => { setIsCreating(false); setNewCatName(''); }} className="px-4 h-9 rounded text-[13px] font-medium bg-transparent border border-border text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">İptal</button>
                    </div>
                </div>
            )}

            <div className="card-base">
                <div className="flex items-center gap-2 mb-4">
                    <FolderOpen size={14} className="text-primary" />
                    <span className="text-[14px] font-medium text-foreground">Haber Kategorileri</span>
                    <span className="ml-auto text-label bg-white/5 px-2 py-0.5 rounded">{categories.length} kategori</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="pb-2.5 text-label">Kategori</th>
                                <th className="pb-2.5 text-label">Slug</th>
                                <th className="pb-2.5 text-label text-center">Makale</th>
                                <th className="pb-2.5 text-label text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {categories.map(cat => (
                                <tr key={cat.id} className="group h-11 hover:bg-white/[0.02] transition-colors">
                                    <td className="py-0 text-[13px] font-medium text-foreground">{cat.name}</td>
                                    <td className="py-0"><code className="text-meta bg-white/5 px-1.5 py-0.5 rounded-sm">{cat.slug}</code></td>
                                    <td className="py-0 text-center text-[13px] tabular-nums text-muted-foreground">{cat.articleCount}</td>
                                    <td className="py-0 text-right">
                                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1.5 text-subtle hover:text-foreground transition-colors" title="Düzenle"><Edit3 size={13} /></button>
                                            <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-subtle hover:text-negative transition-colors" title="Sil"><Trash2 size={13} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {categories.length === 0 && <p className="text-center text-meta py-8">Henüz kategori bulunmamaktadır.</p>}
            </div>
        </div>
    );
};

export default AdminPage;
