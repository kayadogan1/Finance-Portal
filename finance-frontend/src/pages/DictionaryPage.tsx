import { useState, useMemo } from 'react';
import { BookOpen, Search, X, ChevronDown, ChevronUp, Tag } from 'lucide-react';

/* ─── Category Type ─── */

type TermCategory = 'Genel' | 'Teknik Analiz' | 'Temel Analiz' | 'Emir Türleri' | 'Yatırım Araçları' | 'Risk Yönetimi';

interface DictionaryTerm {
    term: string;
    definition: string;
    category: TermCategory;
    englishTerm?: string;
}

/* ─── Dictionary Data ─── */

const DICTIONARY_TERMS: DictionaryTerm[] = [
    // Genel
    { term: 'Boğa Piyasası', englishTerm: 'Bull Market', definition: 'Fiyatların uzun süre boyunca yükseliş trendinde olduğu, yatırımcı güveninin yüksek olduğu piyasa koşullarıdır. Genellikle %20 veya daha fazla fiyat artışı ile tanımlanır.', category: 'Genel' },
    { term: 'Ayı Piyasası', englishTerm: 'Bear Market', definition: 'Fiyatların uzun süre boyunca düşüş trendinde olduğu, yatırımcı güveninin düşük olduğu piyasa koşullarıdır. Genellikle %20 veya daha fazla fiyat düşüşü ile tanımlanır.', category: 'Genel' },
    { term: 'Likidite', englishTerm: 'Liquidity', definition: 'Bir varlığın fiyatını önemli ölçüde etkilemeden ne kadar hızlı alınıp satılabildiğinin ölçüsüdür. Yüksek likidite, dar spread ve kolay işlem anlamına gelir.', category: 'Genel' },
    { term: 'Volatilite', englishTerm: 'Volatility', definition: 'Bir varlığın fiyatındaki dalgalanmanın ölçüsüdür. Yüksek volatilite, büyük fiyat hareketlerini ifade eder ve hem risk hem de fırsat içerir.', category: 'Genel' },
    { term: 'Piyasa Değeri', englishTerm: 'Market Cap', definition: 'Bir şirketin veya kripto para biriminin toplam piyasa değeridir. Hisse senedi fiyatı × toplam hisse sayısı ile hesaplanır.', category: 'Genel' },
    { term: 'Portföy', englishTerm: 'Portfolio', definition: 'Bir yatırımcının sahip olduğu tüm yatırım araçlarının toplamıdır. İyi bir portföy, risk çeşitlendirmesi amacıyla farklı varlık sınıflarını içerir.', category: 'Genel' },
    { term: 'Temettü', englishTerm: 'Dividend', definition: 'Bir şirketin kârının hissedarlarına dağıttığı kısımdır. Genellikle yıllık veya üç aylık dönemlerde nakit veya hisse olarak ödenir.', category: 'Genel' },
    { term: 'Arbitraj', englishTerm: 'Arbitrage', definition: 'Aynı varlığın farklı piyasalardaki fiyat farkından yararlanarak risksiz kâr elde etme stratejisidir.', category: 'Genel' },
    { term: 'Halka Arz', englishTerm: 'IPO', definition: 'Bir şirketin hisselerini ilk kez halka açık olarak satışa sunmasıdır. Initial Public Offering (IPO) olarak da bilinir.', category: 'Genel' },
    { term: 'Spread', englishTerm: 'Spread', definition: 'Bir varlığın alış (bid) ve satış (ask) fiyatı arasındaki farktır. Düşük spread, daha likit ve maliyeti düşük bir piyasayı gösterir.', category: 'Genel' },

    // Teknik Analiz
    { term: 'Hareketli Ortalama', englishTerm: 'Moving Average (MA)', definition: 'Belirli bir dönem boyunca ortalama fiyatı hesaplayarak fiyat trendlerini yumuşatan teknik analiz göstergesidir. SMA (Basit) ve EMA (Üstel) türleri vardır.', category: 'Teknik Analiz' },
    { term: 'RSI', englishTerm: 'Relative Strength Index', definition: 'Fiyat hareketlerinin hızını ve değişimini ölçen 0-100 arası bir momentum göstergesidir. 70 üzeri aşırı alım, 30 altı aşırı satım bölgesini gösterir.', category: 'Teknik Analiz' },
    { term: 'MACD', englishTerm: 'Moving Average Convergence Divergence', definition: 'İki hareketli ortalamanın ilişkisini gösteren trend takip göstergesidir. MACD çizgisi, sinyal çizgisi ve histogram bileşenlerinden oluşur.', category: 'Teknik Analiz' },
    { term: 'Destek Seviyesi', englishTerm: 'Support Level', definition: 'Fiyatın düşüşünü durduracağı ve geri sıçrayacağı beklenen fiyat seviyesidir. Alıcıların yoğunlaştığı bölgeyi temsil eder.', category: 'Teknik Analiz' },
    { term: 'Direnç Seviyesi', englishTerm: 'Resistance Level', definition: 'Fiyatın yükselişini durduracağı ve geri döneceği beklenen fiyat seviyesidir. Satıcıların yoğunlaştığı bölgeyi temsil eder.', category: 'Teknik Analiz' },
    { term: 'Mum (Candlestick) Grafik', englishTerm: 'Candlestick Chart', definition: 'Belirli bir zaman diliminde açılış, kapanış, en yüksek ve en düşük fiyatları gösteren grafik türüdür. Yeşil mum yükselişi, kırmızı mum düşüşü temsil eder.', category: 'Teknik Analiz' },
    { term: 'Bollinger Bantları', englishTerm: 'Bollinger Bands', definition: 'Fiyat volatilitesini ölçmek için bir hareketli ortalama etrafında iki standart sapma bandından oluşan göstergedir. Bantlar daralınca sıkışma, genişleyince trend beklenir.', category: 'Teknik Analiz' },
    { term: 'Fibonacci Geri Çekilmesi', englishTerm: 'Fibonacci Retracement', definition: 'Fibonacci oranlarını (%23.6, %38.2, %50, %61.8) kullanarak potansiyel destek ve direnç seviyelerini belirleyen teknik analiz aracıdır.', category: 'Teknik Analiz' },

    // Temel Analiz
    { term: 'F/K Oranı', englishTerm: 'P/E Ratio', definition: 'Hisse fiyatının hisse başına kâra bölünmesiyle hesaplanan temel analiz göstergesidir. Yüksek F/K, yatırımcıların yüksek büyüme beklentisini gösterir.', category: 'Temel Analiz' },
    { term: 'Bilanço', englishTerm: 'Balance Sheet', definition: 'Bir şirketin belirli bir tarihteki varlıklarını, borçlarını ve öz sermayesini gösteren mali tablodur.', category: 'Temel Analiz' },
    { term: 'EPS', englishTerm: 'Earnings Per Share', definition: 'Hisse başına kâr — şirket net kârının toplam hisse sayısına bölünmesiyle hesaplanır.', category: 'Temel Analiz' },
    { term: 'Öz Sermaye Kârlılığı', englishTerm: 'Return on Equity (ROE)', definition: 'Bir şirketin öz sermayesiyle ne kadar kâr ürettiğini gösteren oranıdır. Yüksek ROE, etkin sermaye kullanımını gösterir.', category: 'Temel Analiz' },

    // Emir Türleri
    { term: 'Piyasa Emri', englishTerm: 'Market Order', definition: 'Mevcut piyasa fiyatından hemen gerçekleştirilecek alım veya satım emridir. Hızlı işlem garantisi verir ancak fiyat garantisi yoktur.', category: 'Emir Türleri' },
    { term: 'Limit Emir', englishTerm: 'Limit Order', definition: 'Belirtilen fiyata veya daha iyi bir fiyata ulaşıldığında gerçekleştirilecek emirdir. Fiyat kontrolü sağlar ancak işlem garantisi yoktur.', category: 'Emir Türleri' },
    { term: 'Stop Emir', englishTerm: 'Stop Order', definition: 'Fiyat belirli bir seviyeye ulaştığında otomatik olarak tetiklenen piyasa emridir. Kayıpları sınırlandırmak için kullanılır.', category: 'Emir Türleri' },
    { term: 'Stop-Loss', englishTerm: 'Stop-Loss', definition: 'Bir pozisyondaki kaybı belirli bir seviyede durdurmak için konulan otomatik satış emridir. Risk yönetiminin en temel aracıdır.', category: 'Emir Türleri' },
    { term: 'Take-Profit', englishTerm: 'Take-Profit', definition: 'Fiyat belirlenen kâr hedefine ulaştığında pozisyonu otomatik olarak kapatan emirdir.', category: 'Emir Türleri' },

    // Yatırım Araçları
    { term: 'ETF', englishTerm: 'Exchange Traded Fund', definition: 'Borsada işlem gören yatırım fonudur. Bir endeksi, sektörü veya varlık sınıfını takip eder ve hisse senedi gibi alınıp satılabilir.', category: 'Yatırım Araçları' },
    { term: 'Tahvil', englishTerm: 'Bond', definition: 'Devlet veya şirketlerin borçlanma amacıyla çıkardığı sabit getirili menkul kıymettir. Belirli bir vade sonunda anaparayı ve düzenli faiz ödemelerini garanti eder.', category: 'Yatırım Araçları' },
    { term: 'Türev Ürün', englishTerm: 'Derivative', definition: 'Değeri dayanak varlığa (hisse, emtia, döviz vb.) bağlı olan finansal sözleşmedir. Vadeli işlemler (futures) ve opsiyonlar (options) en yaygın türev ürünlerdir.', category: 'Yatırım Araçları' },
    { term: 'Opsiyon', englishTerm: 'Option', definition: 'Sahibine belirli bir varlığı belirli bir fiyattan, belirli bir tarihte veya öncesinde alma (call) veya satma (put) hakkı veren sözleşmedir. Zorunluluk değil, haktır.', category: 'Yatırım Araçları' },
    { term: 'Endeks Fon', englishTerm: 'Index Fund', definition: 'Belirli bir piyasa endeksini (örn: BIST 100, S&P 500) birebir takip eden yatırım fonudur. Düşük maliyetli pasif yatırım aracıdır.', category: 'Yatırım Araçları' },
    { term: 'Emtia', englishTerm: 'Commodity', definition: 'Altın, gümüş, petrol, buğday gibi fiziksel mal ve hammaddelerin finans piyasalarında işlem gören formudur.', category: 'Yatırım Araçları' },

    // Risk Yönetimi
    { term: 'Açığa Satış', englishTerm: 'Short Selling', definition: 'Sahip olunmayan bir varlığın ödünç alınarak satılması ve daha düşük fiyattan geri alınarak kâr elde edilmesi stratejisidir. Fiyat düşüşü beklentisinde kullanılır.', category: 'Risk Yönetimi' },
    { term: 'Kaldıraç', englishTerm: 'Leverage', definition: 'Borç alınan sermayeyle yatırım miktarını artırma yöntemidir. Kârı büyüttüğü gibi zararı da aynı oranda büyütür.', category: 'Risk Yönetimi' },
    { term: 'Marjin', englishTerm: 'Margin', definition: 'Kaldıraçlı işlem açabilmek için yatırılması gereken teminat tutarıdır. Marjin çağrısı (margin call), teminatın belirli bir seviyenin altına düşmesi durumunda ek teminat istenmesidir.', category: 'Risk Yönetimi' },
    { term: 'Çeşitlendirme', englishTerm: 'Diversification', definition: 'Riski azaltmak için yatırımları farklı varlık sınıflarına, sektörlere ve coğrafyalara dağıtma stratejisidir. "Tüm yumurtaları aynı sepete koymama" ilkesidir.', category: 'Risk Yönetimi' },
    { term: 'Hedge (Korunma)', englishTerm: 'Hedge', definition: 'Mevcut bir yatırımdaki riski azaltmak için ters yönde pozisyon almaktır. Örneğin, portföyünüzü piyasa düşüşüne karşı korumak için put opsiyonu almak.', category: 'Risk Yönetimi' },
    { term: 'Sharpe Oranı', englishTerm: 'Sharpe Ratio', definition: 'Bir yatırımın risk-getiri performansını ölçer. Riske göre düzeltilmiş getiri oranıdır. Yüksek Sharpe oranı, birim risk başına daha fazla getiri anlamına gelir.', category: 'Risk Yönetimi' },
];

const CATEGORIES: TermCategory[] = ['Genel', 'Teknik Analiz', 'Temel Analiz', 'Emir Türleri', 'Yatırım Araçları', 'Risk Yönetimi'];

const CATEGORY_COLORS: Record<TermCategory, string> = {
    'Genel': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    'Teknik Analiz': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    'Temel Analiz': 'bg-violet-500/15 text-violet-400 border-violet-500/20',
    'Emir Türleri': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    'Yatırım Araçları': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
    'Risk Yönetimi': 'bg-red-500/15 text-red-400 border-red-500/20',
};

/* ─── Page ─── */

const DictionaryPage = () => {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<TermCategory | 'Tümü'>('Tümü');
    const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
    const [expandedTerm, setExpandedTerm] = useState<string | null>(null);

    // Get unique first letters
    const availableLetters = useMemo(() => {
        const letters = new Set(DICTIONARY_TERMS.map(t => t.term[0].toLocaleUpperCase('tr-TR')));
        return [...letters].sort((a, b) => a.localeCompare(b, 'tr'));
    }, []);

    // Filter terms
    const filteredTerms = useMemo(() => {
        return DICTIONARY_TERMS.filter(t => {
            const matchSearch = search.trim() === '' ||
                t.term.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')) ||
                (t.englishTerm && t.englishTerm.toLowerCase().includes(search.toLowerCase())) ||
                t.definition.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR'));

            const matchCategory = selectedCategory === 'Tümü' || t.category === selectedCategory;

            const matchLetter = !selectedLetter ||
                t.term[0].toLocaleUpperCase('tr-TR') === selectedLetter;

            return matchSearch && matchCategory && matchLetter;
        });
    }, [search, selectedCategory, selectedLetter]);

    // Group by category for display
    const groupedTerms = useMemo(() => {
        const groups: Record<string, DictionaryTerm[]> = {};
        for (const term of filteredTerms) {
            if (!groups[term.category]) groups[term.category] = [];
            groups[term.category].push(term);
        }
        return groups;
    }, [filteredTerms]);

    const clearFilters = () => {
        setSearch('');
        setSelectedCategory('Tümü');
        setSelectedLetter(null);
    };

    const hasActiveFilters = search || selectedCategory !== 'Tümü' || selectedLetter;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <BookOpen className="text-emerald-400" size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Finans Sözlüğü</h2>
                        <p className="text-slate-400 text-sm">
                            {filteredTerms.length} / {DICTIONARY_TERMS.length} terim gösteriliyor
                        </p>
                    </div>
                </div>
                {hasActiveFilters && (
                    <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 border border-slate-700 transition-colors">
                        <X size={12} /> Filtreleri Temizle
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Terim, kavram veya açıklama ara... (Türkçe / İngilizce)"
                    className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl pl-11 pr-4 py-3.5 text-white
                               placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1
                               focus:ring-emerald-500/30 transition-all text-sm"
                />
                {search && (
                    <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setSelectedCategory('Tümü')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all
                        ${selectedCategory === 'Tümü'
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-white hover:border-slate-600'
                        }`}
                >
                    Tümü ({DICTIONARY_TERMS.length})
                </button>
                {CATEGORIES.map(cat => {
                    const count = DICTIONARY_TERMS.filter(t => t.category === cat).length;
                    return (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all
                                ${selectedCategory === cat
                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                                    : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-white hover:border-slate-600'
                                }`}
                        >
                            {cat} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Alphabet filter */}
            <div className="flex flex-wrap gap-1">
                {availableLetters.map(letter => (
                    <button
                        key={letter}
                        onClick={() => setSelectedLetter(selectedLetter === letter ? null : letter)}
                        className={`w-9 h-9 rounded-lg text-xs font-bold transition-all
                            ${selectedLetter === letter
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                : 'bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-700/30'
                            }`}
                    >
                        {letter}
                    </button>
                ))}
            </div>

            {/* Terms List */}
            {filteredTerms.length === 0 ? (
                <div className="text-center py-16">
                    <BookOpen className="mx-auto mb-3 text-slate-600" size={40} />
                    <p className="text-slate-400 text-sm">Aramanızla eşleşen terim bulunamadı.</p>
                    <p className="text-slate-500 text-xs mt-1">Farklı anahtar kelimeler veya filtreler deneyin.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedTerms).map(([category, terms]) => (
                        <div key={category}>
                            <div className="flex items-center gap-2 mb-3">
                                <Tag size={14} className="text-slate-500" />
                                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{category}</h3>
                                <span className="text-[11px] text-slate-600">({terms.length})</span>
                            </div>
                            <div className="space-y-2">
                                {terms.map(term => {
                                    const isOpen = expandedTerm === term.term;
                                    return (
                                        <div
                                            key={term.term}
                                            className={`bg-slate-800/50 backdrop-blur border rounded-xl overflow-hidden transition-all ${isOpen ? 'border-slate-600/60' : 'border-slate-700/40'
                                                }`}
                                        >
                                            <button
                                                onClick={() => setExpandedTerm(isOpen ? null : term.term)}
                                                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-700/20 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-white font-semibold">{term.term}</span>
                                                    {term.englishTerm && (
                                                        <span className="text-slate-500 text-xs font-mono">({term.englishTerm})</span>
                                                    )}
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[term.category]}`}>
                                                        {term.category}
                                                    </span>
                                                </div>
                                                {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                            </button>
                                            {isOpen && (
                                                <div className="px-5 pb-4 border-t border-slate-700/30">
                                                    <p className="text-slate-300 text-sm leading-relaxed mt-3">
                                                        {term.definition}
                                                    </p>
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
