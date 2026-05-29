import { useState } from 'react';
import { ChevronDown, Globe, Info } from 'lucide-react';
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
    const [sourcesOpen, setSourcesOpen] = useState(false);
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
                    <div className="flex flex-wrap gap-1.5">
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
                    <button
                        type="button"
                        onClick={() => setSourcesOpen(open => !open)}
                        className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded border border-border text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors"
                    >
                        <Info size={12} />
                        Kaynaklar
                        <ChevronDown size={12} className={`transition-transform ${sourcesOpen ? 'rotate-180' : ''}`} />
                    </button>
                </div>
                {sourcesOpen && (
                    <div className="rounded-md border border-border bg-card p-3 text-[12px] text-muted-foreground">
                        Haberler farklı RSS ve haber sağlayıcılarından derlenir; kaynak adı kartların içinde baskın rozet olarak gösterilmez, detay için haber sayfasına girildiğinde orijinal bağlantı korunur.
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {['Yahoo Finance', 'Sözcü', 'Piyasa RSS', 'Finans haber akışları'].map(source => (
                                <span key={source} className="rounded border border-border bg-[hsl(var(--background-subtle))] px-2 py-1 font-medium text-foreground">
                                    {source}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
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
