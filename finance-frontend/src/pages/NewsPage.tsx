import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe } from 'lucide-react';
import NewsGrid from '../components/news/NewsGrid';
import { getTopics, TOPIC_LABELS } from '../services/newsService';

const COUNTRIES = [
    { key: '', label: 'Tümü', flag: '🌍' },
    { key: 'TR', label: 'Türkiye', flag: '🇹🇷' },
    { key: 'US', label: 'ABD', flag: '🇺🇸' },
    { key: 'UK', label: 'İngiltere', flag: '🇬🇧' },
] as const;

const NewsPage = () => {
    const [activeTopic, setActiveTopic] = useState('');
    const [activeCountry, setActiveCountry] = useState('');

    const { data: topics = [] } = useQuery<string[]>({
        queryKey: ['news-topics'], queryFn: getTopics, staleTime: 1000 * 60 * 60,
    });

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-[20px] font-semibold tracking-[-0.2px] text-foreground">Finansal Haberler</h2>
                <p className="text-meta mt-1">Son 1 haftanın küresel piyasa haberleri ve finansal gelişmeler</p>
            </div>

            {/* Topic filter — underline tabs */}
            <div className="space-y-3">
                <div className="border-b border-border overflow-x-auto">
                    <div className="flex gap-6 min-w-max">
                        <button
                            onClick={() => setActiveTopic('')}
                            className={`text-label pb-2 border-b-2 transition-colors ${activeTopic === '' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                        >
                            Tümü
                        </button>
                        {Array.isArray(topics) && topics.map(t => (
                            <button key={t} onClick={() => setActiveTopic(t)}
                                className={`text-label pb-2 border-b-2 transition-colors whitespace-nowrap ${activeTopic === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                            >
                                {TOPIC_LABELS[t] || t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Country filter */}
                <div className="flex items-center gap-2">
                    <Globe size={12} className="text-subtle" />
                    <div className="flex gap-1.5">
                        {COUNTRIES.map(({ key, label, flag }) => (
                            <button key={key} onClick={() => setActiveCountry(key)}
                                className={`px-3 py-1 rounded text-[12px] font-medium border transition-colors ${
                                    activeCountry === key
                                        ? 'border-primary/30 text-primary bg-primary/5'
                                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-white/5'
                                }`}
                            >
                                {flag} {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <NewsGrid
                key={`${activeTopic}-${activeCountry}`}
                topic={activeTopic || undefined}
                country={activeCountry || undefined}
                title={activeTopic ? `${TOPIC_LABELS[activeTopic] || activeTopic} Haberleri` : 'Son Haberler'}
                columns={3} maxItems={18}
            />
        </div>
    );
};

export default NewsPage;
