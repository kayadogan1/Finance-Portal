import { useState } from 'react';
import { Globe } from 'lucide-react';
import NewsGrid from '../components/news/NewsGrid';
import { NEWS_CATEGORIES } from '../services/newsService';

const COUNTRIES = [
    { key: '', label: 'Tümü', flag: '🌍' },
    { key: 'TR', label: 'Türkiye', flag: '🇹🇷' },
    { key: 'US', label: 'ABD', flag: '🇺🇸' },
] as const;

const NewsPage = () => {
    const [activeTopic, setActiveTopic] = useState('');
    const [activeCountry, setActiveCountry] = useState('');
    const activeCategory = NEWS_CATEGORIES.find(category => category.key === activeTopic) ?? NEWS_CATEGORIES[0];

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
                        {NEWS_CATEGORIES.filter(category => category.key).map(category => (
                            <button key={category.key} onClick={() => setActiveTopic(category.key)}
                                className={`text-label pb-2 border-b-2 transition-colors whitespace-nowrap ${activeTopic === category.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                            >
                                {category.label}
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
                topic={activeCategory.serverTopic}
                country={activeCountry || undefined}
                category={activeCategory.key || undefined}
                title={activeCategory.key ? `${activeCategory.label} Haberleri` : 'Son Haberler'}
                columns={3} maxItems={18}
            />
        </div>
    );
};

export default NewsPage;
