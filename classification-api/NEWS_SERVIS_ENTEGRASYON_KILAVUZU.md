# News Servis Entegrasyon Kilavuzu

Bu dokuman, eldeki finans haber siniflandirma modelini baska bir uygulamadaki `news-service` veya `news` modulune entegre etmek icin hazirlandi.

Hedef:

- haber sisteme dusunce modeli cagir
- haberin ana turunu bul
- haberin ilgili oldugu sembolu bul
- sonucu haber kaydina veya event akisina ekle

Bu dosya teknik uygulama rehberi gibi dusunulmelidir.

## 1. Bu model ne uretir?

Model bir haber metninden su ciktilari uretir:

- `assetType`
- `symbol`
- `assetScore`
- `symbolScore`
- `lexiconSymbol`
- `topCandidates`

Ornek:

Girdi:
`THY yeni ucak finansmani icin uluslararasi bankalarla masada`

Cikti:

- `assetType = STOCK`
- `symbol = THYAO`

## 2. News servis icinde model tam olarak nereye oturur?

En dogru konum:

`news ingestion -> normalization -> classification -> persistence -> downstream publish`

Yani haberin sisteme dusme sirasi su olmali:

1. Haber RSS, API veya DB queue ile gelir
2. Baslik normalize edilir
3. Model siniflandirma yapar
4. Sonuc haber objesine islenir
5. Haber kaydedilir
6. Gerekirse downstream sistemlere event gonderilir

## 3. Entegrasyon icin su an elimizde ne var?

Teslim release klasoru:

[`output/release/release-20260422-194423`](/Users/dogankaya/test/output/release/release-20260422-194423)

Bu klasorde:

- `models/`
- `data/instruments.csv`
- `data/real_eval_headlines.csv`
- `reports/`
- `INTEGRATION_README.md`

Guncel kalite:

- `Real eval size = 315`
- `Level1 accuracy = 99.68% (314/315)`
- `Level2 accuracy = 100.00% (315/315)`
- `Shadow raw total = 559`
- `Shadow labeled total = 315`
- `Shadow unlabeled = 244`

Bu tablo, modelin artik entegrasyona verilebilir durumda oldugunu gosterir.

## 4. News servis hangi dosyalari kullanacak?

Minimum gerekli dosyalar:

1. [`output/release/release-20260422-194423/models`](/Users/dogankaya/test/output/release/release-20260422-194423/models)
2. [`output/release/release-20260422-194423/data/instruments.csv`](/Users/dogankaya/test/output/release/release-20260422-194423/data/instruments.csv)

Opsiyonel ama faydali:

1. [`output/release/release-20260422-194423/data/real_eval_headlines.csv`](/Users/dogankaya/test/output/release/release-20260422-194423/data/real_eval_headlines.csv)
2. [`output/release/release-20260422-194423/reports/prod_shadow_report.txt`](/Users/dogankaya/test/output/release/release-20260422-194423/reports/prod_shadow_report.txt)

## 5. News servis icinde hangi siniflari veya mantigi tasimaliyim?

En kritik mantik burada:

- [`src/main/java/com/example/HierarchicalPredictor.java`](/Users/dogankaya/test/src/main/java/com/example/HierarchicalPredictor.java)

Ama predictor tek basina yetmez.
Cunku predictor su yardimci mantiklara dayanir:

- instruments katalog okuma
- alias eslesme
- headline match
- guclu lexicon override
- level2 type-specific model secimi
- score combine

Bu yuzden iki dogru entegrasyon secenegi var.

## 6. En saglikli entegrasyon secenekleri

### Secenek A: Bu modeli ayri Java servis olarak calistir

Bu en guvenli yoldur.

Yapman gereken:

1. Bu projeyi bagimsiz bir `classification-service` olarak ayaga kaldir
2. `news-service` haber basligini HTTP veya message queue ile gondersin
3. classification-service sonuc dondursun

Avantajlari:

- mantigi aynen korursun
- risk daha dusuk olur
- model guncellemesi ayri yapilir
- ana projede kod kopyalama azalir

### Secenek B: Predictor mantigini news-service icine gom

Bu daha hizli calisabilir ama entegrasyon daha dikkat ister.

Yapman gereken:

1. predictor mantigini yeni projeye tasi
2. model dosyalarini local resource olarak tut
3. instruments katalogunu service startup'ta yukle
4. haber geldikce classify et

Avantaji:

- tek servis icinde cozulur

Riski:

- model mantigi ve servis mantigi ic ice gecer
- ileride model update etmek daha zor olabilir

Benim onerim:

Ilk asamada `Secenek A`, sonra ihtiyac varsa `Secenek B`.

## 7. News servis icin onerilen domain modeli

News servis icinde asagidaki gibi bir sonuc modeli kullan:

```java
public record NewsClassificationResult(
        String assetType,
        String symbol,
        String assetScore,
        String symbolScore,
        String lexiconSymbol,
        List<String> topCandidates,
        boolean classified,
        String modelVersion) {
}
```

`classified` mantigi icin:

- `symbol != UNKNOWN` ise genelde `true`
- ama sadece `assetType` doluysa ve sembol `UNKNOWN` ise yari sinifli gibi dusunebilirsin

## 8. News entity veya DTO nasil genisletilmeli?

Eger elinde bir `NewsItem` veya `NewsArticle` varsa su alanlari ekle:

```java
private String predictedAssetType;
private String predictedSymbol;
private String assetScore;
private String symbolScore;
private String modelVersion;
private boolean classificationApplied;
private String classificationSource;
```

`classificationSource` icin degerler:

- `MODEL`
- `LEXICON_OVERRIDE`
- `MANUAL`

## 9. News servis akisi nasil olmali?

Onerilen akis:

1. Haber kaynaktan gelsin
2. Baslik bos mu kontrol et
3. Normalize et
4. Model classify etsin
5. Sonucu entity'ye yaz
6. DB'ye kaydet
7. Event publish et

Pseudo akisi:

```java
public NewsItem processIncomingNews(RawNewsMessage raw) {
    NewsItem item = mapper.map(raw);

    String text = normalizeHeadline(item.getTitle());
    NewsClassificationResult result = classifier.classify(text);

    item.setPredictedAssetType(result.assetType());
    item.setPredictedSymbol(result.symbol());
    item.setAssetScore(result.assetScore());
    item.setSymbolScore(result.symbolScore());
    item.setClassificationApplied(true);
    item.setModelVersion(result.modelVersion());

    repository.save(item);
    eventPublisher.publish(item);

    return item;
}
```

## 10. Startup sirasinda ne yapmaliyim?

Modeli her haberde yeniden yukleme.

Dogru yol:

1. servis ayaga kalkarken model dosyalarini yukle
2. instruments katalogunu bir kere oku
3. memory'de tut
4. classify cagrilarinda tekrar tekrar disk I/O yapma

Yani bir `NewsClassificationService` veya `ModelRuntime` sinifi olmali.

## 11. Onerilen sinif yapisi

News servis icinde su yapi temiz olur:

### `NewsClassificationService`

Sorumlulugu:

- `classify(headline)` cagrisi yapmak

### `ModelRuntime`

Sorumlulugu:

- model dosyalarini yuklemek
- categorizer objelerini memory'de tutmak

### `InstrumentCatalogService`

Sorumlulugu:

- `instruments.csv` okumak
- alias map hazirlamak

### `NewsClassificationMapper`

Sorumlulugu:

- model sonucunu news entity veya DTO'ya yazmak

## 12. API seviyesi entegrasyon ornegi

Eger news-service disari sonuc donuyorsa API response'a su yapida alan ekleyebilirsin:

```json
{
  "id": "news-123",
  "title": "THY yeni ucak finansmani icin uluslararasi bankalarla masada",
  "predictedAssetType": "STOCK",
  "predictedSymbol": "THYAO",
  "assetScore": "0.9812",
  "symbolScore": "0.7421",
  "classificationApplied": true,
  "modelVersion": "release-20260422-194423"
}
```

## 13. DB tasariminda nasil saklamaliyim?

Onerilen minimum kolonlar:

- `predicted_asset_type`
- `predicted_symbol`
- `asset_score`
- `symbol_score`
- `classification_applied`
- `model_version`
- `classification_source`
- `classified_at`

Boylece ileride model drift analizi de yapabilirsin.

## 14. Event veya Kafka cikti ornegi

Eger news-service event gonderiyorsa payload su sekilde olabilir:

```json
{
  "newsId": "123",
  "headline": "Bitcoin and ethereum prices today...",
  "assetType": "CRYPTO",
  "symbol": "ETH",
  "assetScore": "0.9303",
  "symbolScore": "0.0328",
  "modelVersion": "release-20260422-194423"
}
```

## 15. UNKNOWN sonucu gelirse ne yapmaliyim?

Bu cok onemli.

Model bazen bilincli olarak `UNKNOWN` donebilir.
Bu kotu degil, zorla yanlis sembol secmekten daha iyidir.

Onerilen davranis:

1. `assetType` varsa onu sakla
2. `symbol = UNKNOWN` ise haberi yine kaydet
3. ama asagidaki gibi isaretle:

- `classificationApplied = true`
- `predictedSymbol = UNKNOWN`
- `classificationSource = MODEL`

Boylece ileride tekrar isleyebilirsin.

## 16. News servis icin confidence yorumu nasil olmali?

Bu projede:

- `assetScore` ana tur guveni
- `symbolScore` sembol secim guveni

Ama asagidaki nokta onemli:

`lexiconSymbol` varsa bazi durumlarda dusuk gorunen score'a ragmen sonuc dogru olabilir.

Yani sadece `symbolScore`a bakip sonucu cope atma.
Lexicon override mantigini da koru.

## 17. Entegrasyonda en kritik hata ne olur?

En buyuk hata sunlar olur:

1. sadece `.bin` dosyalarini tasiyip predictor mantigini eksik kurmak
2. `instruments.csv` olmadan modeli kullanmaya calismak
3. her request'te modeli yeniden yuklemek
4. `UNKNOWN` donuslerini hata saymak
5. lexicon override mantigini atlamak

Bu bes hata, performansi ve kaliteyi ciddi bozar.

## 18. Spring Boot benzeri bir servis icinde nasil gorunur?

Kabaca su sekilde:

```java
@Service
public class NewsClassificationService {

    private final ModelRuntime runtime;
    private final InstrumentCatalogService catalogService;

    public NewsClassificationResult classify(String headline) {
        // predictor mantigi burada cagrilir
        return runtime.predict(headline, catalogService.getInstruments());
    }
}
```

Startup yuklemesi:

```java
@PostConstruct
public void init() {
    runtime.loadModels();
    catalogService.load();
}
```

## 19. En hizli canliya alma yolu ne?

En hizli ve en guvenli yol:

1. Bu projeyi ayri Java servis olarak ayaga kaldir
2. `news-service` sadece headline gondersin
3. servis sonucu geri dondursun

Boylece:

- mevcut mantik bozulmaz
- ana projeye daha az mudahale edersin
- model update'i kolay olur

## 20. Entegrasyon oncesi minimum test listesi

Ana projeye baglamadan once sunlari dene:

1. `THY yolcu doluluk oraninda guclu performans sergiledi -> STOCK / THYAO`
2. `Bitcoin ETF girisleri sonrasi yukselisini surdurdu -> CRYPTO / BTC`
3. `Brent petrol fiyatlari arz endiseleriyle yukseliyor -> COMMODITY / BRENT`
4. `EUR/USD paritesi ECB mesajlari sonrasi geriledi -> FOREX / EURUSD`
5. anlamsiz veya genel ekonomi haberi icin gerekirse `OTHER / UNKNOWN`

## 21. Entegrasyon icin tam checklist

1. Release klasorunu al:
   [`output/release/release-20260422-194423`](/Users/dogankaya/test/output/release/release-20260422-194423)
2. `models/` klasorunu yeni projeye koy
3. `data/instruments.csv` dosyasini yeni projeye koy
4. predictor mantigini yeni projeye tasi veya Java classification service kur
5. startup'ta model ve katalog yukle
6. haber ingest akisinda classify adimi ekle
7. sonucu entity, DB ve response modeline yaz
8. `UNKNOWN` sonucunu destekle
9. smoke test yap
10. canli loglama ekle

## 22. Bugun itibariyla ne kaldı?

Model tarafinda ana gelistirme isi bitti.

News servisine entegrasyon tarafinda kalan seyler:

- kendi proje yapina gore sinif isimlerini uyarlamak
- persistence katmaninda alanlari eklemek
- varsa Kafka veya webhook payload'ini genisletmek

Yani bundan sonraki is esas olarak entegrasyon isidir.
Model teslimi hazirdir.
