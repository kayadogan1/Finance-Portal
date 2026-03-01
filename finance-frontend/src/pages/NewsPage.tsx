import { useState } from 'react';
import { Newspaper } from 'lucide-react';
import NewsGrid from '../components/news/NewsGrid';

const TOPICS = [
    { key: '', label: 'Tümü' },
    { key: 'CRYPTO', label: 'Kripto' },
    { key: 'ECONOMY', label: 'Ekonomi' },
    { key: 'BUSINESS', label: 'İş Dünyası' },
    { key: 'FINANCE', label: 'Finans' },
    { key: 'TECHNOLOGY', label: 'Teknoloji' },
    { key: 'AI', label: 'Yapay Zeka' },
    { key: 'ENERGY', label: 'Enerji' },
    { key: 'POLITICS', label: 'Politika' },
    { key: 'HEALTH', label: 'Sağlık' },
] as const;

const NewsPage = () => {
    const [activeTopic, setActiveTopic] = useState('');

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <Newspaper className="text-emerald-400" size={28} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Finansal Haberler</h2>
                    <p className="text-slate-400 text-sm">
                        Küresel piyasa haberleri, analizler ve finansal gelişmeler
                    </p>
                </div>
            </div>

            {/* Topic filter tabs */}
            <div className="overflow-x-auto pb-1 custom-scrollbar">
                <div className="flex gap-2 min-w-max">
                    {TOPICS.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTopic(key)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                                ${activeTopic === key
                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:bg-slate-700'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* News grid */}
            <NewsGrid
                key={activeTopic}
                topic={activeTopic || undefined}
                title={activeTopic ? `${TOPICS.find(t => t.key === activeTopic)?.label} Haberleri` : 'Son Haberler'}
                columns={3}
                maxItems={18}
            />
        </div>
    );
};

export default NewsPage;
