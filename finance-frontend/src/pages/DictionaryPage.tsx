import { useState, useMemo } from 'react';
import { BookOpen, Search, X, ChevronDown, ChevronUp, Tag } from 'lucide-react';

type TermCategory = 'Genel' | 'Teknik Analiz' | 'Temel Analiz' | 'Emir Türleri' | 'Yatırım Araçları' | 'Risk Yönetimi';

interface DictionaryTerm {
    term: string;
    definition: string;
    category: TermCategory;
    englishTerm?: string;
}

const DICTIONARY_TERMS: DictionaryTerm[] = [
    { term: 'Boğa Piyasası', englishTerm: 'Bull Market', definition: 'Fiyatların uzun süre boyunca yükseliş trendinde olduğu, yatırımcı güveninin yüksek olduğu piyasa koşullarıdır. Genellikle %20 veya daha fazla fiyat artışı ile tanımlanır.', category: 'Genel' },
    { term: 'Ayı Piyasası', englishTerm: 'Bear Market', definition: 'Fiyatların uzun süre boyunca düşüş trendinde olduğu, yatırımcı güveninin düşük olduğu piyasa koşullarıdır. Genellikle %20 veya daha fazla fiyat düşüşü ile tanımlanır.', category: 'Genel' },
    { term: 'Likidite', englishTerm: 'Liquidity', definition: 'Bir varlığın fiyatını önemli ölçüde etkilemeden ne kadar hızlı alınıp satılabildiğinin ölçüsüdür.', category: 'Genel' },
    { term: 'Volatilite', englishTerm: 'Volatility', definition: 'Bir varlığın fiyatındaki dalgalanmanın ölçüsüdür. Yüksek volatilite, büyük fiyat hareketlerini ifade eder.', category: 'Genel' },
    { term: 'Piyasa Değeri', englishTerm: 'Market Cap', definition: 'Bir şirketin toplam piyasa değeridir. Hisse senedi fiyatı × toplam hisse sayısı ile hesaplanır.', category: 'Genel' },
    { term: 'Portföy', englishTerm: 'Portfolio', definition: 'Bir yatırımcının sahip olduğu tüm yatırım araçlarının toplamıdır.', category: 'Genel' },
    { term: 'Temettü', englishTerm: 'Dividend', definition: 'Bir şirketin kârının hissedarlarına dağıttığı kısımdır.', category: 'Genel' },
    { term: 'Arbitraj', englishTerm: 'Arbitrage', definition: 'Aynı varlığın farklı piyasalardaki fiyat farkından yararlanarak risksiz kâr elde etme stratejisidir.', category: 'Genel' },
    { term: 'Halka Arz', englishTerm: 'IPO', definition: 'Bir şirketin hisselerini ilk kez halka açık olarak satışa sunmasıdır.', category: 'Genel' },
    { term: 'Spread', englishTerm: 'Spread', definition: 'Bir varlığın alış ve satış fiyatı arasındaki farktır.', category: 'Genel' },
    { term: 'Hareketli Ortalama', englishTerm: 'Moving Average (MA)', definition: 'Belirli bir dönem boyunca ortalama fiyatı hesaplayarak fiyat trendlerini yumuşatan teknik analiz göstergesidir.', category: 'Teknik Analiz' },
    { term: 'RSI', englishTerm: 'Relative Strength Index', definition: 'Fiyat hareketlerinin hızını ve değişimini ölçen 0-100 arası bir momentum göstergesidir.', category: 'Teknik Analiz' },
    { term: 'MACD', englishTerm: 'Moving Average Convergence Divergence', definition: 'İki hareketli ortalamanın ilişkisini gösteren trend takip göstergesidir.', category: 'Teknik Analiz' },
    { term: 'Destek Seviyesi', englishTerm: 'Support Level', definition: 'Fiyatın düşüşünü durduracağı beklenen fiyat seviyesidir.', category: 'Teknik Analiz' },
    { term: 'Direnç Seviyesi', englishTerm: 'Resistance Level', definition: 'Fiyatın yükselişini durduracağı beklenen fiyat seviyesidir.', category: 'Teknik Analiz' },
    { term: 'Mum Grafik', englishTerm: 'Candlestick Chart', definition: 'Açılış, kapanış, en yüksek ve en düşük fiyatları gösteren grafik türüdür.', category: 'Teknik Analiz' },
    { term: 'Bollinger Bantları', englishTerm: 'Bollinger Bands', definition: 'Fiyat volatilitesini ölçmek için hareketli ortalama etrafında iki standart sapma bandından oluşan göstergedir.', category: 'Teknik Analiz' },
    { term: 'Fibonacci Geri Çekilmesi', englishTerm: 'Fibonacci Retracement', definition: 'Fibonacci oranlarını kullanarak potansiyel destek ve direnç seviyelerini belirleyen teknik analiz aracıdır.', category: 'Teknik Analiz' },
    { term: 'F/K Oranı', englishTerm: 'P/E Ratio', definition: 'Hisse fiyatının hisse başına kâra bölünmesiyle hesaplanan temel analiz göstergesidir.', category: 'Temel Analiz' },
    { term: 'Bilanço', englishTerm: 'Balance Sheet', definition: 'Bir şirketin varlıklarını, borçlarını ve öz sermayesini gösteren mali tablodur.', category: 'Temel Analiz' },
    { term: 'EPS', englishTerm: 'Earnings Per Share', definition: 'Şirket net kârının toplam hisse sayısına bölünmesiyle hesaplanır.', category: 'Temel Analiz' },
    { term: 'ROE', englishTerm: 'Return on Equity', definition: 'Bir şirketin öz sermayesiyle ne kadar kâr ürettiğini gösteren orandır.', category: 'Temel Analiz' },
    { term: 'Piyasa Emri', englishTerm: 'Market Order', definition: 'Mevcut piyasa fiyatından hemen gerçekleştirilecek alım veya satım emridir.', category: 'Emir Türleri' },
    { term: 'Limit Emir', englishTerm: 'Limit Order', definition: 'Belirtilen fiyata ulaşıldığında gerçekleştirilecek emirdir.', category: 'Emir Türleri' },
    { term: 'Stop Emir', englishTerm: 'Stop Order', definition: 'Fiyat belirli bir seviyeye ulaştığında otomatik olarak tetiklenen emirdir.', category: 'Emir Türleri' },
    { term: 'Stop-Loss', englishTerm: 'Stop-Loss', definition: 'Bir pozisyondaki kaybı belirli bir seviyede durdurmak için konulan otomatik satış emridir.', category: 'Emir Türleri' },
    { term: 'Take-Profit', englishTerm: 'Take-Profit', definition: 'Fiyat kâr hedefine ulaştığında pozisyonu otomatik olarak kapatan emirdir.', category: 'Emir Türleri' },
    { term: 'ETF', englishTerm: 'Exchange Traded Fund', definition: 'Borsada işlem gören yatırım fonudur. Bir endeksi, sektörü veya varlık sınıfını takip eder.', category: 'Yatırım Araçları' },
    { term: 'Tahvil', englishTerm: 'Bond', definition: 'Devlet veya şirketlerin borçlanma amacıyla çıkardığı sabit getirili menkul kıymettir.', category: 'Yatırım Araçları' },
    { term: 'Türev Ürün', englishTerm: 'Derivative', definition: 'Değeri dayanak varlığa bağlı olan finansal sözleşmedir.', category: 'Yatırım Araçları' },
    { term: 'Opsiyon', englishTerm: 'Option', definition: 'Sahibine belirli bir varlığı belirli bir fiyattan alma veya satma hakkı veren sözleşmedir.', category: 'Yatırım Araçları' },
    { term: 'Endeks Fon', englishTerm: 'Index Fund', definition: 'Belirli bir piyasa endeksini birebir takip eden yatırım fonudur.', category: 'Yatırım Araçları' },
    { term: 'Emtia', englishTerm: 'Commodity', definition: 'Altın, gümüş, petrol gibi fiziksel malların finans piyasalarında işlem gören formudur.', category: 'Yatırım Araçları' },
    { term: 'Açığa Satış', englishTerm: 'Short Selling', definition: 'Sahip olunmayan bir varlığın ödünç alınarak satılması ve daha düşük fiyattan geri alınması stratejisidir.', category: 'Risk Yönetimi' },
    { term: 'Kaldıraç', englishTerm: 'Leverage', definition: 'Borç alınan sermayeyle yatırım miktarını artırma yöntemidir.', category: 'Risk Yönetimi' },
    { term: 'Marjin', englishTerm: 'Margin', definition: 'Kaldıraçlı işlem açabilmek için yatırılması gereken teminat tutarıdır.', category: 'Risk Yönetimi' },
    { term: 'Çeşitlendirme', englishTerm: 'Diversification', definition: 'Riski azaltmak için yatırımları farklı varlık sınıflarına dağıtma stratejisidir.', category: 'Risk Yönetimi' },
    { term: 'Hedge', englishTerm: 'Hedge', definition: 'Mevcut bir yatırımdaki riski azaltmak için ters yönde pozisyon almaktır.', category: 'Risk Yönetimi' },
    { term: 'Sharpe Oranı', englishTerm: 'Sharpe Ratio', definition: 'Bir yatırımın risk-getiri performansını ölçen, riske göre düzeltilmiş getiri oranıdır.', category: 'Risk Yönetimi' },
];

const CATEGORIES: TermCategory[] = ['Genel', 'Teknik Analiz', 'Temel Analiz', 'Emir Türleri', 'Yatırım Araçları', 'Risk Yönetimi'];

const DictionaryPage = () => {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<TermCategory | 'Tümü'>('Tümü');
    const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
    const [expandedTerm, setExpandedTerm] = useState<string | null>(null);

    const availableLetters = useMemo(() => {
        const letters = new Set(DICTIONARY_TERMS.map(t => t.term[0].toLocaleUpperCase('tr-TR')));
        return [...letters].sort((a, b) => a.localeCompare(b, 'tr'));
    }, []);

    const filteredTerms = useMemo(() => {
        return DICTIONARY_TERMS.filter(t => {
            const matchSearch = search.trim() === '' ||
                t.term.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')) ||
                (t.englishTerm && t.englishTerm.toLowerCase().includes(search.toLowerCase())) ||
                t.definition.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR'));
            const matchCategory = selectedCategory === 'Tümü' || t.category === selectedCategory;
            const matchLetter = !selectedLetter || t.term[0].toLocaleUpperCase('tr-TR') === selectedLetter;
            return matchSearch && matchCategory && matchLetter;
        });
    }, [search, selectedCategory, selectedLetter]);

    const groupedTerms = useMemo(() => {
        const groups: Record<string, DictionaryTerm[]> = {};
        for (const term of filteredTerms) {
            if (!groups[term.category]) groups[term.category] = [];
            groups[term.category].push(term);
        }
        return groups;
    }, [filteredTerms]);

    const clearFilters = () => { setSearch(''); setSelectedCategory('Tümü'); setSelectedLetter(null); };
    const hasActiveFilters = search || selectedCategory !== 'Tümü' || selectedLetter;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.2px] text-foreground">Finans Sözlüğü</h2>
                    <p className="text-meta mt-1">{filteredTerms.length} / {DICTIONARY_TERMS.length} terim gösteriliyor</p>
                </div>
                {hasActiveFilters && (
                    <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium text-muted-foreground hover:text-foreground bg-transparent border border-border hover:bg-white/5 transition-colors">
                        <X size={11} /> Filtreleri Temizle
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" size={16} />
                <input
                    type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Terim, kavram veya açıklama ara..."
                    className="w-full h-9 bg-background border border-border rounded pl-10 pr-4 text-[13px] text-foreground placeholder:text-ghost focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                />
                {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-foreground transition-colors">
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Category filter — underline tabs */}
            <div className="border-b border-border overflow-x-auto">
                <div className="flex gap-6 min-w-max">
                    <button onClick={() => setSelectedCategory('Tümü')}
                        className={`text-label pb-2 border-b-2 transition-colors ${selectedCategory === 'Tümü' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                        Tümü ({DICTIONARY_TERMS.length})
                    </button>
                    {CATEGORIES.map(cat => {
                        const count = DICTIONARY_TERMS.filter(t => t.category === cat).length;
                        return (
                            <button key={cat} onClick={() => setSelectedCategory(cat)}
                                className={`text-label pb-2 border-b-2 transition-colors whitespace-nowrap ${selectedCategory === cat ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                                {cat} ({count})
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Alphabet filter */}
            <div className="flex flex-wrap gap-1">
                {availableLetters.map(letter => (
                    <button key={letter} onClick={() => setSelectedLetter(selectedLetter === letter ? null : letter)}
                        className={`w-8 h-8 rounded text-[11px] font-semibold transition-colors ${selectedLetter === letter ? 'bg-primary text-primary-foreground' : 'bg-transparent border border-border text-muted-foreground hover:text-foreground hover:bg-white/5'}`}>
                        {letter}
                    </button>
                ))}
            </div>

            {/* Terms */}
            {filteredTerms.length === 0 ? (
                <div className="text-center py-12">
                    <BookOpen className="mx-auto mb-2 text-ghost" size={32} />
                    <p className="text-[13px] text-muted-foreground">Aramanızla eşleşen terim bulunamadı.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {Object.entries(groupedTerms).map(([category, terms]) => (
                        <div key={category}>
                            <div className="flex items-center gap-2 mb-3">
                                <Tag size={12} className="text-subtle" />
                                <span className="text-label">{category}</span>
                                <span className="text-[10px] text-ghost">({terms.length})</span>
                            </div>
                            <div className="space-y-1">
                                {terms.map(term => {
                                    const isOpen = expandedTerm === term.term;
                                    return (
                                        <div key={term.term} className={`border rounded overflow-hidden transition-colors ${isOpen ? 'border-border' : 'border-border/50'}`}>
                                            <button onClick={() => setExpandedTerm(isOpen ? null : term.term)}
                                                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="text-[13px] font-semibold text-foreground">{term.term}</span>
                                                    {term.englishTerm && <span className="text-meta font-mono">({term.englishTerm})</span>}
                                                </div>
                                                {isOpen ? <ChevronUp size={14} className="text-subtle shrink-0" /> : <ChevronDown size={14} className="text-subtle shrink-0" />}
                                            </button>
                                            {isOpen && (
                                                <div className="px-4 pb-3 border-t border-border/50">
                                                    <p className="text-[13px] text-muted-foreground leading-relaxed mt-2.5">{term.definition}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DictionaryPage;
