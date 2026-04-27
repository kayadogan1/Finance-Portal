# Model Servisi Detayli Teknik Raporu

Bu dokuman, `classification-api` modulunu sifirdan anlatmak icin hazirlanmistir. Servisin amaci, haber metinlerini finansal varlik tipine ve ilgili enstruman sembolune siniflandirmaktir. News service gibi downstream servisler bu servise HTTP istegi atar, model servisi de haberin hangi kategoriye ve hangi sembole baglanabilecegini dondurur.

## 1. Servisin Amaci

`classification-api`, finans haberlerini analiz eden bagimsiz bir Spring Boot servisidir.

Servisin temel gorevleri:

- Haber basligi veya haber metnini alir.
- Metni normalize eder.
- OpenNLP tabanli egitilmis modellerle varlik tipini tahmin eder.
- Gerekirse sozluk/alias eslesmesiyle dogrudan enstruman sembolu bulur.
- Zayif ve riskli tahminleri `UNKNOWN` yaparak yanlis sembol yazma riskini azaltir.
- Birden fazla guclu varlik geciyorsa bunlari `topCandidates` icinde raporlar.
- Gelen tahminleri audit CSV dosyasina kaydeder.

Ornek cikti:

```json
{
  "headline": "Apple stock rises ahead of earnings",
  "assetType": "STOCK",
  "symbol": "AAPL",
  "assetScore": "0.9123",
  "symbolScore": "0.7341",
  "lexiconSymbol": "AAPL",
  "topCandidates": [],
  "unknown": false,
  "modelVersion": "release-20260422-194423"
}
```

## 2. Teknoloji Stack

Servis Java 21 ve Spring Boot 3.3.5 ile yazilmistir.

Kullanilan ana teknolojiler:

- `spring-boot-starter-web`: REST API sunmak icin.
- `opennlp-tools 2.3.0`: egitilmis dokuman siniflandirma modellerini calistirmak icin.
- `junit 3.8.1`: unit testler icin.
- Java records: request/response DTO'lari icin.

Modul dosyasi:

```text
classification-api/pom.xml
```

## 3. Genel Mimari

Servis uc ana katmandan olusur:

1. API katmani
   - HTTP endpoint'leri karsilar.
   - Request validasyonu yapar.
   - Hatalari standart response'a cevirir.

2. Uygulama servis katmani
   - Gelen metni normalize eder.
   - Predictor'i cagirir.
   - Prediction sonucunu API response formatina cevirir.
   - Audit log yazar.

3. Model/prediction katmani
   - Model dosyalarini yukler ve cache'ler.
   - Level 1 model ile varlik tipini bulur.
   - Level 2 modellerle sembol skorlarini hesaplar.
   - Lexicon eslesmelerini uygular.
   - Riskli tahminleri filtreler.

Basit akiss:

```text
News Service
    |
    | POST /api/v1/news/classify
    v
ClassificationController
    |
    v
NewsClassificationService
    |
    v
NewsTextNormalizer
    |
    v
HierarchicalPredictor
    |-- InstrumentCatalog
    |-- LexiconMatcher
    |-- OpenNLP model files
    v
ClassificationResponse
    |
    v
ClassificationAuditLogger
```

## 4. API Endpointleri

Base path:

```text
/api/v1/news
```

### 4.1 GET /health

Servisin ayakta olup olmadigini kontrol eder.

Endpoint:

```http
GET /api/v1/news/health
```

Ornek response:

```json
{
  "status": "ok",
  "service": "classification-api"
}
```

Kullanim amaci:

- Kubernetes/container health check.
- Manuel servis kontrolu.
- Downstream servislerin model servisini ping etmesi.

### 4.2 POST /classify

JSON body ile haber metni alir ve normal tahmin yapar.

Endpoint:

```http
POST /api/v1/news/classify
Content-Type: application/json
```

Request:

```json
{
  "headline": "Apple stock rises ahead of earnings"
}
```

Response:

```json
{
  "headline": "Apple stock rises ahead of earnings",
  "assetType": "STOCK",
  "symbol": "AAPL",
  "assetScore": "0.9123",
  "symbolScore": "0.7341",
  "lexiconSymbol": "AAPL",
  "topCandidates": [],
  "unknown": false,
  "modelVersion": "release-20260422-194423"
}
```

Bu endpoint news-service tarafinda kullanilacak ana endpointtir.

### 4.3 POST /classify-text

Plain text body ile haber metni alir.

Endpoint:

```http
POST /api/v1/news/classify-text
Content-Type: text/plain
```

Request body:

```text
Apple stock rises ahead of earnings
```

Kullanim amaci:

- Test ve debug islemlerinde daha hizli deneme.
- JSON olusturmadan model denemesi.

### 4.4 POST /classify-safe

JSON body ile calisir, ancak conservative mod kullanir.

Endpoint:

```http
POST /api/v1/news/classify-safe
Content-Type: application/json
```

Normal mod ile farki:

- Ayni metinde birden fazla guclu enstruman gecerse tek sembol secmek yerine `UNKNOWN` donebilir.
- Yanlis tekil sembol yazma riskini azaltir.
- Daha temkinli, daha az agresif tahmin yapar.

Ornek:

```text
Apple ve Microsoft yapay zeka yatirimlariyla one cikti
```

Normal mod bir sembol secebilir. Safe mod bu tur coklu varlik durumunda `UNKNOWN` dondurmeye daha yatkindir.

### 4.5 POST /classify-safe-text

Plain text body ile conservative tahmin yapar.

Endpoint:

```http
POST /api/v1/news/classify-safe-text
Content-Type: text/plain
```

## 5. Request ve Response Modelleri

### 5.1 ClassificationRequest

Dosya:

```text
src/main/java/com/example/ClassificationRequest.java
```

Kod:

```java
public record ClassificationRequest(String headline) {
}
```

Alanlar:

- `headline`: Siniflandirilacak haber basligi veya haber metni.

Not:

- Isim `headline` olsa da baslik + description birlestirilip gonderilebilir.
- Controller bos/null kontrolu yapar.

### 5.2 ClassificationResponse

Dosya:

```text
src/main/java/com/example/ClassificationResponse.java
```

Alanlar:

- `headline`: Normalize edilmis haber metni.
- `assetType`: Tahmin edilen varlik tipi. Ornek: `STOCK`, `CRYPTO`, `FOREX`, `COMMODITY`, `INDEX`, `BOND`, `FUND`, `VIOP`, `OTHER`.
- `symbol`: Tahmin edilen ana enstruman sembolu. Ornek: `AAPL`, `BTC`, `USDTRY`, `XAUUSD`.
- `assetScore`: Level 1 modelin varlik tipi icin verdigi skor.
- `symbolScore`: Level 2 modellerin ana sembol icin verdigi skor.
- `lexiconSymbol`: Sembol sozluk/alias eslesmesiyle bulunduysa burada yer alir.
- `topCandidates`: Metinde gercekten yakalanan diger guclu enstruman adaylari.
- `unknown`: Sembol `UNKNOWN` ise `true`.
- `modelVersion`: Response'u uretecek model surumu.

### 5.3 HealthResponse

Dosya:

```text
src/main/java/com/example/HealthResponse.java
```

Alanlar:

- `status`: Servis durumu. Su an `ok`.
- `service`: Servis adi. Su an `classification-api`.

### 5.4 ErrorResponse

Dosya:

```text
src/main/java/com/example/ErrorResponse.java
```

Alanlar:

- `code`: Hata kodu. Ornek: `BAD_REQUEST`, `INTERNAL_ERROR`.
- `message`: Hata mesaji.

## 6. Siniflar ve Gorevleri

## 6.1 ClassificationApiApplication

Dosya:

```text
src/main/java/com/example/ClassificationApiApplication.java
```

Bu sinif Spring Boot uygulamasinin giris noktasidir.

Fonksiyon:

```java
public static void main(String[] args)
```

Gorevi:

- Spring application context'i baslatir.
- Embedded Tomcat'i ayaga kaldirir.
- Controller, service ve component bean'lerini yukler.

## 6.2 ClassificationController

Dosya:

```text
src/main/java/com/example/ClassificationController.java
```

Bu sinif REST API katmanidir.

### Constructor

```java
public ClassificationController(NewsClassificationService newsClassificationService)
```

Gorevi:

- `NewsClassificationService` dependency'sini constructor injection ile alir.

### health()

```java
@GetMapping("/health")
public HealthResponse health()
```

Gorevi:

- Servisin calistigini gosteren basit response doner.

### classify()

```java
@PostMapping("/classify")
public ClassificationResponse classify(@RequestBody ClassificationRequest request)
```

Gorevi:

- JSON request alir.
- `headline` bos veya null ise `IllegalArgumentException` firlatir.
- Metni trim'leyip `newsClassificationService.classify(...)` metoduna yollar.
- Normal modda tahmin doner.

### classifyText()

```java
@PostMapping(value = "/classify-text", consumes = MediaType.TEXT_PLAIN_VALUE)
public ClassificationResponse classifyText(@RequestBody String text)
```

Gorevi:

- Plain text request alir.
- Bos kontrolu yapar.
- Normal modda tahmin doner.

### classifySafe()

```java
@PostMapping("/classify-safe")
public ClassificationResponse classifySafe(@RequestBody ClassificationRequest request)
```

Gorevi:

- JSON request alir.
- Conservative modda tahmin yapar.
- Coklu guclu enstruman durumunda yanlis tek sembol secme riskini azaltir.

### classifySafeText()

```java
@PostMapping(value = "/classify-safe-text", consumes = MediaType.TEXT_PLAIN_VALUE)
public ClassificationResponse classifySafeText(@RequestBody String text)
```

Gorevi:

- Plain text request alir.
- Conservative modda tahmin yapar.

## 6.3 NewsClassificationService

Dosya:

```text
src/main/java/com/example/NewsClassificationService.java
```

Bu sinif API ile model/predictor arasindaki uygulama servisidir.

### Constructor

```java
public NewsClassificationService(ClassificationAuditLogger auditLogger)
```

Gorevi:

- Audit logger dependency'sini alir.

### classify()

```java
public ClassificationResponse classify(String headline)
```

Gorevi:

- Gelen metni `NewsTextNormalizer.normalize(...)` ile temizler.
- `HierarchicalPredictor.predict(...)` ile normal tahmin yapar.
- Prediction sonucunu `ClassificationResponse` formatina cevirir.
- Sonucu audit log'a yazar.
- Response doner.

### classifyConservative()

```java
public ClassificationResponse classifyConservative(String headline)
```

Gorevi:

- Gelen metni normalize eder.
- `HierarchicalPredictor.predictConservative(...)` ile safe tahmin yapar.
- Response olusturur.
- Audit log yazar.

### toResponse()

```java
private ClassificationResponse toResponse(HierarchicalPredictor.Prediction prediction)
```

Gorevi:

- Internal `Prediction` record'unu dis API response'una cevirir.
- `unknown` alanini `symbol == "UNKNOWN"` kontrolu ile set eder.
- `modelVersion` alanini response'a ekler.

## 6.4 NewsTextNormalizer

Dosya:

```text
src/main/java/com/example/NewsTextNormalizer.java
```

Bu sinif haber metnini modele girmeden once temizler.

### normalize()

```java
public static String normalize(String text)
```

Gorevi:

- Null veya bos metinde bos string doner.
- HTML tag'lerini temizler.
- HTML entity'lerini cevirir:
  - `&nbsp;` -> bosluk
  - `&amp;` -> `&`
  - `&quot;` -> `"`
  - `&#39;` -> `'`
- Fazla bosluklari tek bosluga indirir.
- Bas ve sondaki bosluklari temizler.

### combine()

```java
public static String combine(String title, String description)
```

Gorevi:

- Baslik ve description alanlarini normalize edip birlestirir.
- Baslik yoksa description doner.
- Description yoksa baslik doner.
- Baslik ve description ayniysa tekrar etmez.

Not:

- Bu method su an runtime akisinda dogrudan controller tarafindan kullanilmiyor, ama news-service gibi downstream servislerin baslik + description birlestirmesi icin uygundur.

## 6.5 ClassificationAuditLogger

Dosya:

```text
src/main/java/com/example/ClassificationAuditLogger.java
```

Bu sinif model tahminlerini CSV dosyasina kaydeder.

Varsayilan dosya:

```text
output/classification_audit.csv
```

Config:

```properties
classification.audit.path=output/classification_audit.csv
```

### Constructor

```java
public ClassificationAuditLogger(@Value("${classification.audit.path:output/classification_audit.csv}") String auditPath)
```

Gorevi:

- Audit dosyasinin yolunu config'ten alir.
- Config yoksa varsayilan path kullanir.

### log()

```java
public void log(ClassificationResponse response)
```

Gorevi:

- Response null ise islem yapmaz.
- Thread-safe sekilde audit dosyasini olusturur.
- Response'u CSV satiri olarak dosyaya ekler.
- Yazma hatasinda servisi patlatmaz, stderr'e hata yazar.

### ensureFileExists()

```java
private void ensureFileExists()
```

Gorevi:

- Audit dosyasinin parent klasorunu olusturur.
- Dosya yoksa header satiri ile birlikte olusturur.

### toCsvLine()

```java
private String toCsvLine(ClassificationResponse response)
```

Gorevi:

- Response alanlarini CSV satirina cevirir.
- `createdAt` olarak `Instant.now()` ekler.
- `topCandidates` listesini `|` ile birlestirir.

### escape()

```java
static String escape(String value)
```

Gorevi:

- CSV uyumlu kacis islemi yapar.
- Virgul, tirnak veya satir sonu varsa degeri tirnak icine alir.
- Tirnaklari cift tirnaga cevirir.

Audit CSV kolonlari:

```text
createdAt,headline,assetType,symbol,assetScore,symbolScore,lexiconSymbol,topCandidates,unknown,modelVersion
```

## 6.6 ClassificationExceptionHandler

Dosya:

```text
src/main/java/com/example/ClassificationExceptionHandler.java
```

Bu sinif global hata yakalama katmanidir.

### handleIllegalArgument()

```java
@ExceptionHandler(IllegalArgumentException.class)
@ResponseStatus(HttpStatus.BAD_REQUEST)
public ErrorResponse handleIllegalArgument(IllegalArgumentException exception)
```

Gorevi:

- Bos headline gibi request hatalarini yakalar.
- HTTP 400 doner.
- Response kodu `BAD_REQUEST` olur.

### handleGeneric()

```java
@ExceptionHandler(Exception.class)
@ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
public ErrorResponse handleGeneric(Exception exception)
```

Gorevi:

- Beklenmeyen hatalari yakalar.
- HTTP 500 doner.
- Response kodu `INTERNAL_ERROR` olur.

## 6.7 InstrumentCatalog

Dosya:

```text
src/main/java/com/example/InstrumentCatalog.java
```

Bu sinif `instruments.csv` dosyasini yukler.

Kaynak dosya:

```text
src/main/resources/data/instruments.csv
```

CSV kolonlari:

```text
symbol,assetType,exchange,canonicalName,aliases,sector
```

### loadInstruments()

```java
static List<Instrument> loadInstruments(String path)
```

Gorevi:

- CSV dosyasini okur.
- Header satirini atlar.
- Her satiri `Instrument` record'una cevirir.
- Alias kolonunu `|` karakterine gore ayirir.

### openResource()

```java
static InputStream openResource(String path)
```

Gorevi:

- Once local filesystem'den dosya arar.
- Dosya yoksa classpath resource olarak arar.
- Bu sayede uygulama IDE'den de jar icinden de calisabilir.

### splitCsv()

```java
static String[] splitCsv(String line, int expectedParts)
```

Gorevi:

- Basit CSV parse islemi yapar.
- Tirnak icindeki virgulleri kolon ayraci saymaz.
- Beklenen kolon sayisina gore parcalar.

### Instrument record

```java
record Instrument(
        String symbol,
        String assetType,
        String exchange,
        String canonicalName,
        List<String> aliases,
        String sector)
```

Alanlar:

- `symbol`: Enstruman sembolu. Ornek: `AAPL`, `BTC`, `XAUUSD`.
- `assetType`: Varlik tipi.
- `exchange`: Borsa/piyasa bilgisi. Ornek: `NASDAQ`, `BIST`, `CRYPTO`.
- `canonicalName`: Resmi veya temel isim.
- `aliases`: Eslesmede kullanilan alternatif isimler.
- `sector`: Sektor bilgisi.

## 6.8 LexiconMatcher

Dosya:

```text
src/main/java/com/example/LexiconMatcher.java
```

Bu sinif haber metninde enstruman isimlerini ve alias'larini arar. Model skoru dusuk olsa bile metinde acikca `Apple`, `Bitcoin`, `Dolar/TL`, `Altin` gibi ifadeler varsa bu sinif bunlari yakalar.

### matchHeadline()

```java
static List<MatchedInstrument> matchHeadline(String headline, List<InstrumentCatalog.Instrument> instruments)
```

Gorevi:

- Haberi normalize eder.
- Tum enstrumanlarin canonical name, symbol ve alias degerlerini gezer.
- Metinde gecenleri bulur.
- Her enstruman icin en iyi alias'i secer.
- Eslesmeleri skor sirasina dizer.

### shouldSkipAliasMatch()

```java
static boolean shouldSkipAliasMatch(String headline, Instrument instrument, String alias)
```

Gorevi:

- Riskli alias eslesmelerini atlar.
- Ozellikle kisa ticker'larin normal kelime gibi gecmesini engeller.
- BIST hisseleri icin exact token kontrolu yapar.
- Yabanci 1-2 harfli ticker'larda ekstra sinyal arar.

Ornek:

- `ON` gibi kisa ticker normal cumlede kelime olarak gecebilir.
- Bu nedenle exact ve guvenli sinyal olmadan match edilmez.

### shouldSkipCryptoSymbolAlias()

```java
static boolean shouldSkipCryptoSymbolAlias(String headline, String alias)
```

Gorevi:

- Crypto sembollerinde exact token kontrolu yapar.
- `DOT`, `ATOM`, `ONE`, `FLOW`, `NEAR` gibi sembollerin normal kelime olarak gecmesini engeller.

### isAmbiguousCryptoSymbol()

```java
static boolean isAmbiguousCryptoSymbol(String alias)
```

Gorevi:

- Belirsiz crypto sembollerini listeler.
- Su anki liste:
  - `ATOM`
  - `DOT`
  - `FLOW`
  - `ONE`
  - `NEAR`

### containsCryptoContext()

```java
static boolean containsCryptoContext(String headline)
```

Gorevi:

- Metinde crypto baglami olup olmadigini kontrol eder.
- Ornek baglam kelimeleri:
  - `crypto`
  - `kripto`
  - `bitcoin`
  - `ethereum`
  - `blockchain`
  - `coin`
  - `token`
  - `binance`
  - `wallet`
  - `usdt`

Bu kontrol sayesinde `Dot-Com Glory Days` gibi haberlerde `DOT` coin yanlis eslesmesi engellenir.

### containsExactToken()

```java
static boolean containsExactToken(String text, String token)
```

Gorevi:

- Token'in metinde tam kelime olarak gecip gecmedigini kontrol eder.
- Regex ile harf/rakam sinirlarini dikkate alir.

### containsForeignShortTickerSignal()

```java
static boolean containsForeignShortTickerSignal(String headline, String ticker)
```

Gorevi:

- Yabanci kisa ticker'lar icin guvenli sinyal arar.
- Ticker metin basinda veya parantez icinde gecerse daha guvenli kabul edilir.

### aliasKind()

```java
static String aliasKind(Instrument instrument, String alias)
```

Gorevi:

- Alias'in tipini belirler:
  - `symbol`
  - `canonical`
  - `alias`

### aliasScore()

```java
static double aliasScore(String alias)
```

Gorevi:

- Alias kalitesine skor verir.
- Uzun alias daha guvenli kabul edilir.
- Buyuk harfli ticker formatina ek puan verir.
- Bosluk iceren alias'a ek puan verir.

### allNames()

```java
static List<String> allNames(Instrument instrument)
```

Gorevi:

- Bir enstruman icin aranacak tum isimleri dondurur:
  - canonical name
  - symbol
  - aliases

### containsPhrase()

```java
static boolean containsPhrase(String normalizedHeadline, String normalizedNeedle)
```

Gorevi:

- Normalize edilmis metinde normalize edilmis alias'i kelime sinirlarini dikkate alarak arar.

### normalize()

```java
static String normalize(String text)
```

Gorevi:

- Kucuk harfe cevirir.
- Turkce karakterleri ASCII benzerlerine cevirir:
  - `ı` -> `i`
  - `ş` -> `s`
  - `ğ` -> `g`
  - `ü` -> `u`
  - `ö` -> `o`
  - `ç` -> `c`

Bu sayede `Tüpraş`, `Tupras`, `TUPRAS` gibi varyasyonlar daha kolay eslesir.

### MatchedInstrument record

Alanlar:

- `instrument`: Eslesen enstruman.
- `alias`: Eslesen alias bilgisi.

Ek method:

```java
double score()
```

Alias skorunu dondurur.

### AliasMatch record

Alanlar:

- `alias`: Eslesen ifade.
- `kind`: Alias tipi.
- `score`: Alias guven skoru.

## 6.9 HierarchicalPredictor

Dosya:

```text
src/main/java/com/example/HierarchicalPredictor.java
```

Bu sinif model servisinin cekirdegidir. Tahmin algoritmasi burada calisir.

### Model Yaklasimi

Model iki seviyeli calisir:

1. Level 1 model:
   - Haber hangi asset type'a ait?
   - Ornek: `STOCK`, `CRYPTO`, `FOREX`, `COMMODITY`.

2. Level 2 modeller:
   - Secilen asset type icinde hangi sembol?
   - Ornek: `AAPL`, `BTC`, `USDTRY`, `XAUUSD`.

Ek olarak lexicon matcher vardir:

- Metinde acik enstruman ismi gecerse model sonucunu guclendirir.
- Ornek: `Apple` -> `AAPL`, `Bitcoin` -> `BTC`.

### Sabitler

```java
MODEL_DIR = "src/main/resources/models/"
EXTERNAL_MODEL_DIR_PROP = "classification.model.dir"
```

Model dosyalarinin nereden okunacagini belirler.

```java
TYPED_FOCUSED_WEIGHT = 0.42
TYPED_WEIGHT = 0.33
GLOBAL_FOCUSED_WEIGHT = 0.15
GLOBAL_WEIGHT = 0.10
```

Level 2 sembol tahmininde farkli modellerin skor agirliklari.

```java
SYMBOL_ACCEPT_THRESHOLD = 0.18
SYMBOL_GAP_THRESHOLD = 0.05
```

Modelin sembol tahminini kabul etmesi icin gereken minimum skor ve en yakin rakiple skor farki.

```java
UNKNOWN_SYMBOL = "UNKNOWN"
```

Guvenli sembol bulunamazsa kullanilan fallback deger.

### Cache Alanlari

```java
MODEL_CACHE
INSTRUMENT_CACHE
ALLOWED_SYMBOLS_CACHE
```

Gorevleri:

- Model dosyalarini her request'te diskten okumamak.
- Instrument catalog'u tekrar tekrar parse etmemek.
- Asset type'a gore izinli sembol listelerini cache'lemek.

Bu cache'ler prod performansi icin kritiktir.

### main()

```java
public static void main(String[] args)
```

Gorevi:

- Komut satirindan manuel tahmin yapmaya yarar.
- API runtime'i icin zorunlu degildir.
- Debug amacli kullanilabilir.

### predict()

```java
static Prediction predict(String text)
```

Gorevi:

- Normal mod tahmin yapar.
- `predictInternal(text, false)` cagirir.

### predictConservative()

```java
static Prediction predictConservative(String text)
```

Gorevi:

- Conservative mod tahmin yapar.
- Coklu guclu lexicon eslesmesinde `UNKNOWN` dondurmeye daha yatkindir.

### predictInternal()

```java
static Prediction predictInternal(String text, boolean conservative)
```

Bu method tum tahmin akisini yonetir.

Adim adim isleyis:

1. Instrument catalog yuklenir.
2. Lexicon matcher ile metindeki enstrumanlar aranir.
3. Level 1 model yuklenir.
4. Metin token'lara ayrilir.
5. Level 1 model asset type tahmini yapar.
6. Lexicon eslesmesi varsa ve guvenliyse asset type ve symbol override edilir.
7. Crypto tahmini varsa ama crypto context yoksa asset type `OTHER` yapilir.
8. Level 2 modeller yuklenir.
9. Farkli Level 2 model skorlarinin agirlikli ortalamasi alinir.
10. Sembol threshold ve skor farki kontrolunden gecirilir.
11. Guvenli candidate listesi uretilir.
12. `Prediction` record'u donulur.

### load()

```java
static DocumentCategorizerME load(String modelName)
```

Gorevi:

- Model dosyasini `DoccatModel` olarak yukler.
- OpenNLP `DocumentCategorizerME` nesnesi olusturur.

### loadLevel2Models()

```java
static Level2Models loadLevel2Models(String assetType)
```

Gorevi:

Secilen asset type icin ilgili Level 2 modelleri yukler:

- `tr-doccat-level2-{assetType}-focused.bin`
- `tr-doccat-level2-{assetType}.bin`
- `tr-doccat-level2-focused.bin`
- `tr-doccat-level2.bin`

Ornek `STOCK` icin:

```text
tr-doccat-level2-STOCK-focused.bin
tr-doccat-level2-STOCK.bin
tr-doccat-level2-focused.bin
tr-doccat-level2.bin
```

### loadIfExists()

```java
static DocumentCategorizerME loadIfExists(String modelName)
```

Gorevi:

- Model dosyasi varsa yukler.
- Yoksa null doner.
- Bu sayede her asset type icin focused model zorunlu olmaz.

### loadModel()

```java
static DoccatModel loadModel(String modelName)
```

Gorevi:

- Model cache'inde varsa cache'ten doner.
- Yoksa model stream'ini acar, modeli yukler ve cache'e koyar.
- `putIfAbsent` ile thread-safe cache davranisi saglar.

### modelCacheKey()

```java
static String modelCacheKey(String modelName)
```

Gorevi:

- Cache anahtarini olusturur.
- External model directory varsa path'i cache key'e ekler.

### modelExists()

```java
static boolean modelExists(String modelName)
```

Gorevi:

- Model dosyasi var mi kontrol eder.
- Once external dir'e bakar.
- Sonra local `src/main/resources/models` dizinine bakar.
- Sonra classpath resource'a bakar.

### openModelStream()

```java
static InputStream openModelStream(String modelName)
```

Gorevi:

- Model dosyasini okumak icin stream acar.
- External path destekler:

```text
-Dclassification.model.dir=/path/to/models
```

Bu sayede model dosyalari jar disindan da verilebilir.

### combineScoreMaps()

```java
static Map<String, Double> combineScoreMaps(Level2Models models, String[] tokens)
```

Gorevi:

- Level 2 modellerin sembol skorlarini agirlikli olarak birlestirir.
- Ensemble benzeri bir yapi kurar.

Agirliklar:

- typed focused: 0.42
- typed: 0.33
- global focused: 0.15
- global: 0.10

### addWeightedScores()

```java
static void addWeightedScores(Map<String, Double> combined, DocumentCategorizerME model, String[] tokens, double weight)
```

Gorevi:

- Bir modelin tum sembol skorlarini alir.
- Skorlari agirlikla carpar.
- Combined map'e ekler.

### tokenize()

```java
static String[] tokenize(String text)
```

Gorevi:

- Metni bosluklara gore token'lara ayirir.
- Bos token'lari atar.

### topScore()

```java
static String topScore(double[] probs)
```

Gorevi:

- Level 1 modelin en yuksek olasilik skorunu string olarak formatlar.

### bestSymbolForType()

```java
static String bestSymbolForType(Set<String> allowedSymbols, Map<String, Double> scoreMap)
```

Gorevi:

- Secilen asset type icindeki en yuksek skorlu sembolu bulur.
- Allowed symbol icinde bir sonuc yoksa scoreMap icindeki en yuksek skoru fallback olarak alir.

### resolveSymbol()

```java
static String resolveSymbol(String assetType, Set<String> allowedSymbols, Map<String, Double> scoreMap, String lexiconSymbol)
```

Gorevi:

- Nihai sembolu belirler.
- Lexicon symbol varsa direkt onu kullanir.
- Asset type `OTHER` ise `UNKNOWN` doner.
- Model skoru dusukse veya runner-up ile fark azsa `UNKNOWN` doner.

Prod guvenligi acisindan en kritik methodlardan biridir. Yanlis sembol yazmayi azaltir.

### scoreOf()

```java
static String scoreOf(String symbol, Map<String, Double> scoreMap)
```

Gorevi:

- Secilen sembolun skorunu formatlar.
- Sembol yoksa `0.0000` doner.

### bestContextualLexiconMatch()

```java
static LexiconMatcher.MatchedInstrument bestContextualLexiconMatch(String text, List<MatchedInstrument> matches)
```

Gorevi:

- Birden fazla lexicon eslesmesi varsa haber baglamina gore en iyi olanini secer.
- Sadece alias skoruna degil, metindeki konuma ve cevre kelimelere de bakar.

### contextualLexiconScore()

```java
static double contextualLexiconScore(String text, MatchedInstrument match)
```

Gorevi:

- Lexicon eslesmesine baglamsal skor verir.
- Metnin basinda gecen varliklara ek puan verir.
- `stock`, `hisse`, `earnings`, `ceo`, `dividend` gibi cevre kelimeler varsa stock eslesmesini guclendirir.
- Benchmark comparison varsa index eslesmesini zayiflatir.

Ornek:

```text
Apple stock ... compared with S&P 500
```

Bu metinde `AAPL` ana sembol olmali, `SPX` sadece karsilastirma benchmark'i olarak kalmalidir.

### relatedLexiconCandidates()

```java
static List<String> relatedLexiconCandidates(String text, List<MatchedInstrument> matches, String selectedSymbol)
```

Gorevi:

- Ana sembol disindaki guclu lexicon eslesmelerini candidate olarak dondurur.
- Artik zayif model tahminlerini candidate diye dondurmez.
- Bu, downstream servislerde alakasiz enstruman iliskisi kurulmasini engeller.

### isHighConfidenceRelatedMatch()

```java
static boolean isHighConfidenceRelatedMatch(String text, MatchedInstrument match)
```

Gorevi:

- Candidate olarak donulecek eslesmenin yeterince guvenli olup olmadigini kontrol eder.
- Crypto'da belirsiz sembol ve context kontrolu yapar.

### normalizedIndexOf()

```java
static int normalizedIndexOf(String text, String alias)
```

Gorevi:

- Normalize edilmis metinde alias'in pozisyonunu bulur.
- Context scoring icin kullanilir.

### hasStockContextNearAlias()

```java
static boolean hasStockContextNearAlias(String text, String alias)
```

Gorevi:

- Alias cevresinde stock/hisse/earnings/ceo/dividend gibi kelimeler var mi kontrol eder.
- Stock eslesmesinin guvenini artirir.

### isBenchmarkComparisonContext()

```java
static boolean isBenchmarkComparisonContext(String text, String alias)
```

Gorevi:

- Alias'in bir benchmark karsilastirmasi icinde gecip gecmedigini kontrol eder.
- `compared with`, `compared to`, `versus`, `vs`, `kiyasla` gibi ifadeleri arar.
- Bu durumda index sembolunu ana sembol secme riskini azaltir.

### looksLikeTickerAlias()

```java
static boolean looksLikeTickerAlias(String alias)
```

Gorevi:

- Alias'in 3-5 karakterli buyuk harf ticker formatinda olup olmadigini kontrol eder.

### isHighConfidenceLexiconMatch()

```java
static boolean isHighConfidenceLexiconMatch(MatchedInstrument bestMatch, List<MatchedInstrument> allMatches)
```

Gorevi:

- Lexicon eslesmesinin nihai tahmini override edecek kadar guvenli olup olmadigini belirler.
- Symbol ve canonical match'leri guclu kabul eder.
- Uzun alias ve BIST alias'lari icin ozel kurallar uygular.

### hasAmbiguousCompetingLexiconMatch()

```java
static boolean hasAmbiguousCompetingLexiconMatch(MatchedInstrument bestMatch, List<MatchedInstrument> allMatches)
```

Gorevi:

- Conservative modda ayni metinde birden fazla guclu varlik var mi kontrol eder.
- Ornek: `Apple ve Microsoft ...`

### isStrongCompetingEntityMatch()

```java
static boolean isStrongCompetingEntityMatch(MatchedInstrument match)
```

Gorevi:

- Bir eslesmenin ana tahmine rakip sayilacak kadar guclu olup olmadigini belirler.

### allowedSymbols()

```java
static Set<String> allowedSymbols(String assetType)
```

Gorevi:

- Asset type'a ait sembol listesini doner.
- Ornek: `STOCK` icin sadece stock sembolleri.
- Cache kullanir.

### loadInstruments()

```java
static List<InstrumentCatalog.Instrument> loadInstruments(String path)
```

Gorevi:

- Instrument catalog'u yukler.
- Cache kullanir.

### Prediction record

Internal tahmin sonucudur.

Alanlar:

- `text`
- `assetType`
- `symbol`
- `assetScore`
- `symbolScore`
- `lexiconSymbol`
- `topCandidates`

### Level2Models record

Level 2 model setini tutar.

Alanlar:

- `typedFocused`
- `typed`
- `globalFocused`
- `global`

## 7. Model Dosyalari

Model dosyalari:

```text
src/main/resources/models/
```

### 7.1 Level 1 Model

```text
tr-doccat-level1.bin
```

Gorevi:

- Haber metninden asset type tahmini yapar.

Ornek asset type'lar:

- `STOCK`
- `CRYPTO`
- `FOREX`
- `COMMODITY`
- `BOND`
- `FUND`
- `INDEX`
- `VIOP`
- `OTHER`

### 7.2 Level 2 Global Modeller

```text
tr-doccat-level2.bin
tr-doccat-level2-focused.bin
```

Gorevi:

- Tum semboller genelinde sembol skoru uretir.
- Focused model daha secilmis/guclu orneklerden gelen sinyali temsil eder.

### 7.3 Level 2 Asset-Type Modelleri

Ornek:

```text
tr-doccat-level2-STOCK.bin
tr-doccat-level2-STOCK-focused.bin
tr-doccat-level2-CRYPTO.bin
tr-doccat-level2-CRYPTO-focused.bin
```

Gorevi:

- Secilen asset type icinde daha dar kapsamli sembol tahmini yapar.
- Bu modeller, global model ile beraber agirliklandirilir.

### 7.4 tr-ner-stock.bin

```text
tr-ner-stock.bin
```

Not:

- Mevcut sade runtime akisinda aktif kullanilmamaktadir.
- Eski NER denemelerinden kalmis model olabilir.
- Runtime icin kritik model seti doccat modelleridir.

## 8. Instrument Catalog

Dosya:

```text
src/main/resources/data/instruments.csv
```

Bu dosya modelin ve lexicon matcher'in hangi finansal varliklari tanidigini belirler.

Ornek satir mantigi:

```text
AAPL,STOCK,NASDAQ,Apple Inc.,AAPL|Apple,Unknown
BTC,CRYPTO,CRYPTO,Bitcoin,BTC|Bitcoin|BTCUSDT|BTC/USD,Crypto
XAUUSD,COMMODITY,COMMODITY,Gold,XAUUSD|Altin|Altın|Ons altın,Commodity
```

Alanlar:

- `symbol`: Sistem icinde kullanilan sembol.
- `assetType`: Haber kategorisi.
- `exchange`: Piyasa bilgisi.
- `canonicalName`: Temel isim.
- `aliases`: Metinde aranacak alternatif isimler.
- `sector`: Sektor.

Bu dosya dogru olmazsa model iyi olsa bile downstream eslestirmeleri zayiflar.

## 9. Tahmin Karar Mantigi

Servis sadece model skoruna bakmaz. Uc ana sinyal birlikte kullanilir:

1. Model sinyali
   - Level 1 asset type skoru.
   - Level 2 sembol skoru.

2. Lexicon sinyali
   - Metinde acik enstruman adi/sembolu geciyor mu?

3. Guardrail sinyali
   - Crypto context var mi?
   - Sembol skoru yeterli mi?
   - Runner-up ile fark yeterli mi?
   - Benchmark comparison mi?
   - Birden fazla guclu varlik mi var?

Bu sayede modelin "bir sey secmek zorundayim" davranisi yumusatilmis olur.

## 10. Yanlis Tahminleri Azaltmak Icin Eklenen Koruma Kurallari

### 10.1 Dusuk Skor Koruması

Sembol skoru `SYMBOL_ACCEPT_THRESHOLD` altindaysa `UNKNOWN` donulur.

### 10.2 Skor Farki Koruması

En iyi sembol ile ikinci sembol arasinda yeterli fark yoksa `UNKNOWN` donulur.

### 10.3 Crypto Context Koruması

Model `CRYPTO` dese bile metinde crypto baglami yoksa asset type `OTHER` yapilir.

Ornek sorun:

```text
Review & Preview: Dot-Com Glory Days
```

Burada `Dot` kelimesi `DOT` coin anlamina gelmemelidir.

### 10.4 Benchmark Comparison Koruması

Ornek:

```text
Apple stock lagged compared with S&P 500
```

Burada haberin ana varligi Apple'dir. S&P 500 sadece benchmark'tir. Context scoring ile `AAPL` secimi guclendirilir, `SPX` ana sembol olma ihtimali dusurulur.

### 10.5 Zayif Candidate Koruması

Eski yaklasimda modelin softmax uzerinden urettiği dusuk skorlu ilk 3 sembol candidate gibi donebiliyordu. Bu downstream servislerde alakasiz enstruman iliskisi yaratabilirdi.

Yeni yaklasim:

- `topCandidates` sadece metinde gercekten lexicon ile yakalanan guclu eslesmeleri dondurur.
- Zayif model tahminleri candidate listesine girmez.

## 11. Normal Mod ve Conservative Mod Farki

### Normal Mod

Endpointler:

- `/classify`
- `/classify-text`

Davranis:

- Guclu bir primary sembol bulursa onu doner.
- Ayni metinde baska varliklar varsa bunlari `topCandidates` icinde raporlayabilir.

### Conservative Mod

Endpointler:

- `/classify-safe`
- `/classify-safe-text`

Davranis:

- Birden fazla guclu varlik geciyorsa tek sembol secmekten kacinir.
- Daha fazla `UNKNOWN` donebilir.
- Prod'da yanlis tekil sembol yazma riskini azaltir.

News-service icin tercih:

- Eger haber birden fazla enstrumana baglanabiliyorsa ve iliski listesi tutuluyorsa normal mod daha kullanisli olabilir.
- Eger sadece tek sembol tutulacaksa safe mod daha temkinlidir.

## 12. Audit Log Mekanizmasi

Her tahmin CSV olarak kaydedilir.

Varsayilan path:

```text
output/classification_audit.csv
```

Bu dosya ile sonradan su analizler yapilabilir:

- Model hangi haberlerde `UNKNOWN` donuyor?
- Hangi haberlerde yanlis sembol secilmis?
- Top candidate listesi ne kadar faydali?
- Hangi asset type'larda hata yogun?
- Gercek haberlerden yeni egitim verisi nasil toplanabilir?

Bu mekanizma model iyilestirme dongusu icin onemlidir.

## 13. Testler

Test dosyalari:

```text
src/test/java/com/example/
```

### AppTest

Basit uygulama testi.

### BistAliasCoverageTest

Gorevi:

- Kritik BIST alias'larinin catalog icinde oldugunu test eder.
- Ornek:
  - `THY` -> `THYAO`
  - `Garanti BBVA` -> `GARAN`
  - `Tüpraş` -> `TUPRS`
  - `Türk Telekom` -> `TTKOM`

### ClassificationAuditLoggerTest

Gorevi:

- CSV escape davranisini test eder.
- Audit logger'in dosya yazma davranisini test eder.

### HierarchicalPredictorRuleTest

Gorevi:

- Model guardrail kurallarini test eder.
- Dusuk guven sembollerin `UNKNOWN` oldugunu test eder.
- Apple/Microsoft gibi coklu entity durumlarini test eder.
- `DOT` ve `ATOM` crypto false-positive problemlerini test eder.
- Apple vs S&P 500 benchmark context problemini test eder.
- Zayif candidate'larin donmedigini test eder.

### NewsTextNormalizerTest

Gorevi:

- HTML temizleme ve text normalize davranisini test eder.

Son test sonucu:

```text
mvn -pl classification-api clean test
Tests run: 26, Failures: 0, Errors: 0
```

## 14. Servis Konfigurasyonu

Dosya:

```text
src/main/resources/application.properties
```

Icerik:

```properties
spring.application.name=classification-api
server.port=8083
classification.audit.path=output/classification_audit.csv
```

Anlami:

- Servis adi: `classification-api`
- Port: `8083`
- Audit CSV path: `output/classification_audit.csv`

## 15. Downstream News Service Entegrasyonu

News service tarafinda model servisine POST istegi atilir.

Onerilen request:

```json
{
  "headline": "title description"
}
```

Onerilen endpoint:

```text
http://localhost:8083/api/v1/news/classify
```

Response'tan kullanilacak alanlar:

- `assetType`: Haber kategorisini belirlemek icin.
- `symbol`: Primary instrument.
- `lexiconSymbol`: Symbol lexicon ile bulundu mu anlamak icin.
- `topCandidates`: Iliskili diger enstrumanlar.
- `unknown`: Guvenli sembol bulunamadi mi?
- `modelVersion`: Hangi model surumuyle tahmin yapildi?

News service tarafinda dikkat edilmesi gerekenler:

- Eski kayitlar reclassify edilmezse DB'de eski yanlis semboller kalabilir.
- `topCandidates` artik sadece guclu lexicon eslesmelerini dondurur; dusuk skorlu softmax tahminleri candidate olmaz.
- Primary symbol null/UNKNOWN ise haberi sembolsuz kaydetmek daha guvenlidir.

## 16. Ornek Senaryolar

### 16.1 Apple Haberi

Input:

```text
Goldman Sachs reassesses Apple stock ahead of earnings compared with S&P 500
```

Beklenen:

```text
assetType = STOCK
symbol = AAPL
```

Aciklama:

- Apple metnin ana konusu.
- S&P 500 benchmark karsilastirmasi olarak algilanir.

### 16.2 Dot-Com Haberi

Input:

```text
Review & Preview: Dot-Com Glory Days
```

Beklenen:

```text
assetType = OTHER
symbol = UNKNOWN
```

Aciklama:

- `Dot` kelimesi Polkadot coin anlamina gelmez.
- Crypto context yoktur.

### 16.3 Bitcoin Haberi

Input:

```text
Bitcoin sessiz ralli ile 80 bin dolar sinirina yaklasti
```

Beklenen:

```text
assetType = CRYPTO
symbol = BTC
```

Aciklama:

- Bitcoin lexicon ile guclu eslesir.
- Crypto context vardir.

### 16.4 Altin Haberi

Input:

```text
Altin fiyatlari haftanin son gununde yukseldi
```

Beklenen:

```text
assetType = COMMODITY
symbol = XAUUSD
```

### 16.5 Coklu Sirket Haberi

Input:

```text
Amazon, Microsoft, Meta ve Apple bilanco aciklayacak
```

Beklenen:

- Primary symbol bir tanesi olabilir.
- Diger guclu eslesmeler `topCandidates` icinde doner.

Bu durumda downstream servis birden fazla instrument iliskisi kurabilir.

## 17. Operasyonel Notlar

### 17.1 Model Dosyalarinin Commit Edilmesi

Doccat model dosyalari runtime icin gereklidir:

```text
src/main/resources/models/tr-doccat-*.bin
```

Bunlar commit edilmezse servis jar icinde model bulamaz.

### 17.2 Output Klasoru Commit Edilmemeli

Audit, eval, training output gibi uretilmis dosyalar commit edilmemelidir.

`.gitignore` icinde:

```gitignore
**/output/
```

### 17.3 External Model Directory

Model dosyalari jar disindan verilebilir:

```bash
java -Dclassification.model.dir=/opt/models -jar classification-api.jar
```

Bu durumda servis once `/opt/models` altina bakar.

## 18. Bilinen Limitasyonlar

- Model sentiment analizi yapmaz; haber olumlu mu olumsuz mu karar vermez.
- `symbolScore` sadece model skorudur; lexicon ile gelen primary sembollerde skor dusuk gorunebilir.
- `topCandidates` icinde asset type bilgisi yoktur; sadece string formatinda sembol ve skor vardir.
- `tr-ner-stock.bin` mevcut runtime akisinda aktif kullanilmamaktadir.
- Audit log dosyasi lokal dosyaya yazar; distributed ortamda merkezi log veya DB tercih edilebilir.

## 19. Gelecek Iyilestirme Onerileri

1. `topCandidates` alanini string yerine structured DTO yapmak.

Ornek:

```json
{
  "symbol": "MSFT",
  "assetType": "STOCK",
  "score": "0.8231",
  "source": "LEXICON"
}
```

2. Audit log'u DB tablosuna yazmak.

Boylece manuel dogrulama ve feedback dongusu daha kolay olur.

3. `modelVersion` bilgisini config'ten almak.

Su an kod icinde sabit:

```text
release-20260422-194423
```

4. Model confidence policy'yi config'e almak.

Threshold degerleri deploy ortaminda ayarlanabilir hale gelebilir.

5. Eski kayitlar icin reclassification job yazmak.

News-service DB'sindeki eski `DOT`, `ATOM`, `SPX` gibi hatali tahminler yeni model ile tekrar islenebilir.

## 20. Kisa Sunum Ozeti

Bu servis, finans haberlerini otomatik olarak varlik tipi ve enstruman sembolune baglayan bagimsiz bir model servisidir. Iki seviyeli OpenNLP siniflandirma modeli kullanir: once haberin asset type'i bulunur, sonra ilgili sembol tahmin edilir. Model tahminleri, sozluk/alias eslesmeleri ve guvenlik kurallariyla desteklenir. Bu sayede Apple haberinin S&P 500 benchmark'i olarak yanlis siniflandirilmasi veya Dot-Com ifadesinin DOT coin olarak algilanmasi gibi production riski tasiyan hatalar azaltilmistir. Servis REST API olarak calisir, her tahmini audit dosyasina kaydeder ve downstream news service tarafindan haber-enstruman iliskisi kurmak icin kullanilir.
