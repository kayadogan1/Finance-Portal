import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Newspaper, Globe } from 'lucide-react';
import NewsGrid from '../components/news/NewsGrid';
import { getTopics, TOPIC_LABELS } from '../services/newsService';

/* ─── Country filter ─── */
const COUNTRIES = [
    { key: '', label: 'Tümü', flag: '🌍' },
    { key: 'TR', label: 'Türkiye', flag: '🇹🇷' },
    { key: 'US', label: 'ABD', flag: '🇺🇸' },
    { key: 'UK', label: 'İngiltere', flag: '🇬🇧' },
] as const;

const NewsPage = () => {
    const [activeTopic, setActiveTopic] = useState('');
    const [activeCountry, setActiveCountry] = useState('');

    // Dynamic topic fetch from backend /api/news/topics
    const { data: topics = [] } = useQuery<string[]>({
        queryKey: ['news-topics'],
        queryFn: getTopics,
        staleTime: 1000 * 60 * 60, // 1 hour — topics rarely change
    });

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
                        Son 1 haftanın küresel piyasa haberleri, analizler ve finansal gelişmeler
                    </p>
                </div>
            </div>

            {/* Topic filter — dynamically fetched from backend */}
            <div className="space-y-3">
                <div className="overflow-x-auto pb-1 custom-scrollbar">
                    <div className="flex gap-2 min-w-max">
                        <button
                            onClick={() => setActiveTopic('')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                                ${activeTopic === ''
                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:bg-slate-700'
                                }`}
                        >
                            Tümü
                        </button>
                        {topics.map((topic) => (
                            <button
                                key={topic}
                                onClick={() => setActiveTopic(topic)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                                    ${activeTopic === topic
                                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:bg-slate-700'
                                    }`}
                            >
                                {TOPIC_LABELS[topic] || topic}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Country filter */}
                <div className="flex items-center gap-2">
                    <Globe size={14} className="text-slate-500" />
                    <div className="flex gap-1.5">
                        {COUNTRIES.map(({ key, label, flag }) => (
                            <button
                                key={key}
                                onClick={() => setActiveCountry(key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                    ${activeCountry === key
                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                        : 'bg-slate-800/50 text-slate-400 border border-slate-700/40 hover:text-white hover:bg-slate-700/50'
                                    }`}
                            >
                                {flag} {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* News grid */}
            <NewsGrid
                key={`${activeTopic}-${activeCountry}`}
                topic={activeTopic || undefined}
                country={activeCountry || undefined}
                title={activeTopic
                    ? `${TOPIC_LABELS[activeTopic] || activeTopic} Haberleri`
                    : 'Son Haberler'
                }
                columns={3}
                maxItems={18}
            />
        </div>
    );
};

export default NewsPage;
