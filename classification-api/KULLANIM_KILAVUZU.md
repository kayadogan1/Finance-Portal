# Finans Haber Modeli Kullanim Kilavuzu

Bu dosya, eldeki modeli baska bir projede kullanmak icin pratik bir teslim kilavuzu olarak hazirlandi.

## 1. Su an elimizde tam olarak ne var?

Su an calisan bir iki asamali finans haber siniflandirma sistemi var.

Bu sistem bir haber basligi icin iki sey uretir:

1. `assetType`
2. `symbol`

Ornek:

Haber:
`THY yeni ucak finansmani icin uluslararasi bankalarla masada`

Beklenen cikti:

- `assetType = STOCK`
- `symbol = THYAO`

## 2. Modelin bugunku durumu ne?

Guncel durumda:

- `raw_headlines.csv`: `559` gercek haber
- `real_eval_headlines.csv`: `315` etiketli gercek haber
- `Real eval Level1`: `99.68% (314/315)`
- `Real eval Level2`: `100.00% (315/315)`
- `Prod shadow labeled`: `315`
- `Prod shadow unlabeled`: `244`
- `Prod shadow Level1`: `99.68% (314/315)`
- `Prod shadow Level2`: `100.00% (315/315)`

Bu ne demek?

Model entegrasyona verilebilir durumda.
Kalan is artik modelin kurulmasi degil, daha zor haberleri etiketleyip ileride daha da sertlestirmektir.

## 3. Ana projeye tasiyacagim ana teslim klasoru hangisi?

Ana teslim klasoru:

[`output/release/release-20260422-194423`](/Users/dogankaya/test/output/release/release-20260422-194423)

En guncel release pointer:

[`output/release/LATEST.txt`](/Users/dogankaya/test/output/release/LATEST.txt)

Bu klasorun icinde sunlar var:

- `models/`
- `data/instruments.csv`
- `data/real_eval_headlines.csv`
- `reports/dataset_report.txt`
- `reports/prod_shadow_report.txt`
- `reports/prod_shadow_predictions.csv`
- `reports/review_summary.txt`
- `INTEGRATION_README.md`

## 4. Baska projede hangi dosyalari tasimaliyim?

Minimum olarak su dosyalari tasiman yeterli:

1. `models/` altindaki tum `.bin` dosyalari
2. `data/instruments.csv`

Opsiyonel ama faydali dosyalar:

1. `data/real_eval_headlines.csv`
2. `reports/prod_shadow_report.txt`
3. `reports/review_summary.txt`

## 5. Model nasil calisiyor?

Calisma mantigi su:

1. Haber metni tokenlara ayrilir.
2. `level1` modeli haberin ana turunu tahmin eder.
   Ornek: `STOCK`, `CRYPTO`, `FOREX`, `COMMODITY`, `INDEX`
3. Enstruman katalogundan alias ve sembol eslesmeleri aranir.
4. Eger guclu bir lexicon eslesmesi varsa bu bilgi modele ustun gelebilir.
5. Secilen `assetType` icin uygun `level2` modelleri yuklenir.
6. Global ve type-specific skorlar agirlikli sekilde birlestirilir.
7. En yuksek sembol skoru yeterince gucluyse sembol secilir.
8. Guven dusukse `UNKNOWN` donulebilir.

Bu mantigin ana kodu burada:

- [`src/main/java/com/example/HierarchicalPredictor.java`](/Users/dogankaya/test/src/main/java/com/example/HierarchicalPredictor.java)

## 6. Baska projede minimum entegrasyon nasil olmali?

Ana projende asagidaki mantigi kur:

1. `instruments.csv` dosyasini oku
2. tum `.bin` model dosyalarini bir model klasorunde tut
3. bir `predict(newsText)` fonksiyonu yaz
4. bu fonksiyon su akisi uygulasin:

- level1 modelini yukle
- haber turunu tahmin et
- katalogta lexicon eslesmesi ara
- secilen type icin ilgili level2 modellerini yukle
- skor birlestir
- sembol sec
- sonuc olarak `assetType`, `symbol`, `assetScore`, `symbolScore` don

## 7. Java tarafinda nasil kullanirim?

Eger ayni mantigi Java ile kullanacaksan en kolay yol su:

1. `opennlp-tools` bagimliligini ekle
2. bu projedeki predictor mantigini tası
3. release klasorundeki model dosyalarini kullan

Basit kullanim sekli:

```java
HierarchicalPredictor.Prediction prediction =
        HierarchicalPredictor.predict("THY yolcu doluluk oraninda guclu performans sergiledi");

String assetType = prediction.assetType();
String symbol = prediction.symbol();
String assetScore = prediction.assetScore();
String symbolScore = prediction.symbolScore();
```

Eger mevcut sinifi aynen tasimayacaksan bile su veri formatini koruman yeterli:

```text
input  -> haber metni
output -> assetType, symbol, assetScore, symbolScore
```

## 8. Python veya baska dilde kullanmak istersem ne yapmaliyim?

Iki secenek var:

### Secenek A
Java predictor mantigini microservice olarak ayaga kaldir.

Bu en hizli yoldur.
Ana projen HTTP veya queue ile Java servisine haber gonderir.
Servis sonuc olarak `assetType` ve `symbol` doner.

### Secenek B
Mantigi yeniden yaz.

Bu daha zahmetlidir cunku sadece model dosyasini tasimak yetmez.
Asagidaki seyleri de yeniden uygulaman gerekir:

- tokenization
- instruments katalog okuma
- alias matching
- lexicon override
- level2 model secimi
- weighted score combine
- `UNKNOWN` esik kontrolu

En hizli ve en dusuk riskli entegrasyon yontemi `Secenek A` dir.

## 9. Hangi model dosyalari ne ise yariyor?

Temel dosyalar:

- `tr-doccat-level1.bin`
- `tr-doccat-level2.bin`
- `tr-doccat-level2-focused.bin`

Type bazli dosyalar:

- `tr-doccat-level2-STOCK.bin`
- `tr-doccat-level2-STOCK-focused.bin`
- `tr-doccat-level2-CRYPTO.bin`
- `tr-doccat-level2-CRYPTO-focused.bin`
- `tr-doccat-level2-COMMODITY.bin`
- `tr-doccat-level2-COMMODITY-focused.bin`
- `tr-doccat-level2-FOREX.bin`
- `tr-doccat-level2-FOREX-focused.bin`
- `tr-doccat-level2-INDEX.bin`
- `tr-doccat-level2-INDEX-focused.bin`
- `tr-doccat-level2-BOND.bin`
- `tr-doccat-level2-BOND-focused.bin`
- `tr-doccat-level2-FUND.bin`
- `tr-doccat-level2-VIOP.bin`

Ek model:

- `tr-ner-stock.bin`

Ama ana siniflandirma icin asil kritik olanlar `level1` ve `level2` doccat modelleridir.

## 10. Entegrasyon icin en pratik yol nedir?

En pratik yol:

1. Bu projeden release bundle'i al
2. Java predictor mantigini aynen tasi veya bu projeyi ayri servis olarak kullan
3. `models/` ve `instruments.csv` dosyalarini yeni projeye koy
4. Haber geldikce predictor cagir

## 11. Kisa entegrasyon checklist

En kisa checklist:

1. Release klasorunu al:
   [`output/release/release-20260422-194423`](/Users/dogankaya/test/output/release/release-20260422-194423)
2. `models/` klasorunu yeni projeye tasi
3. `data/instruments.csv` dosyasini yeni projeye tasi
4. `HierarchicalPredictor` mantigini yeni projeye tasi veya Java servis olarak calistir
5. Bir haber metni verip su sonucu bekle:
   `assetType + symbol`
6. Ornek smoke test:
   `THY yolcu doluluk oraninda guclu performans sergiledi -> STOCK / THYAO`

## 12. Bundan sonra ne yapmaliyim?

Ana projeye entegrasyon icin artik beklenen tek sey:

- release bundle'i kullanmak
- predictor mantigini baglamak

Ek gelistirme yapmak istersen sonraki mantikli alanlar:

1. kalan `LOW_CONF` haberleri etiketlemek
2. daha fazla gercek haberle eval setini buyutmek
3. ana projede loglayip gercek trafik ustunden drift kontrolu yapmak

Ama bugun itibariyla entegrasyon icin gerekli paket hazir.
