# Finans Haber Sınıflandırma Notları

Bu dosya, projede ne yaptığımızı sıfırdan ve sade bir dille anlatmak için hazırlandı.

## 1. Bu projede amaç ne?

Amaç, bir finans haber başlığını iki aşamada anlamlandırmak:

1. Haber hangi ana kategoriye ait?
Örnek: `STOCK`, `CRYPTO`, `FOREX`, `COMMODITY`, `INDEX`, `BOND`, `VIOP`

2. Haber tam olarak hangi enstrümanla ilgili?
Örnek:
- `THYAO`
- `GARAN`
- `BTC`
- `BRENT`
- `EURUSD`

Yani sistem şunu yapıyor:

`THY yolcu doluluk oraninda guclu performans sergiledi`

1. adım sonucu:
`STOCK`

2. adım sonucu:
`THYAO`

## 2. Neden iki aşamalı model kurduk?

Çünkü tek seferde binlerce sembol arasında seçim yapmak zor.

Örneğin model doğrudan şu seçenekler arasından karar vermeye çalışırsa:
- `GARAN`
- `THYAO`
- `BTC`
- `BRENT`
- `EURUSD`
- ve binlerce başka sembol

iş çok zorlaşır.

Bunun yerine önce geniş alan seçilir:
- bu bir hisse mi?
- kripto mu?
- emtia mı?

Sonra ikinci adımda sadece o alanın adayları arasından seçim yapılır.

Bu mantık gerçek hayatta daha doğrudur.

## 3. Projedeki ana dosyalar ne işe yarıyor?

### [InstrumentCatalogImporter.java](/Users/dogankaya/test/src/main/java/com/example/InstrumentCatalogImporter.java)

Bu dosya `properties.text` içindeki büyük katalogu okuyup mevcut sistemin anlayacağı CSV formatına çevirir.

Kaynak:
- `properties.text`

Çıktı:
- [instruments.csv](/Users/dogankaya/test/src/main/resources/data/instruments.csv)

Yani bu dosya bir çeviricidir.

###[DatasetGenerator.java](/Users/dogankaya/test/src/main/java/com/example/DatasetGenerator.java)

Eski NER ve temel veri üretim hattıdır.

Burada:
- enstrüman listesi okunur
- şablonlardan sentetik cümle üretilir
- gerçek başlıklar eklenir
- negatif örnekler eklenir

Bu dosya daha çok veri üretim ve temel eğitim mantığını taşır.

### [HierarchicalDatasetGenerator.java](/Users/dogankaya/test/src/main/java/com/example/HierarchicalDatasetGenerator.java)

Bu dosya bizim iki aşamalı sınıflandırma veri setini üretir.

Burada olanlar:
- ham haber başlıkları okunur
- enstrüman listesi ile eşleşme aranır
- yeterince güvenilir olanlar sembole bağlanır
- geri kalanlar tipe ya da `OTHER` sınıfına gider
- sentetik örnekler dengeleyici olarak eklenir
- `train/dev/test` dosyaları yazılır

Çıktılar:
- [level1_train.tsv](/Users/dogankaya/test/output/hierarchical/level1_train.tsv)
- [level1_dev.tsv](/Users/dogankaya/test/output/hierarchical/level1_dev.tsv)
- [level1_test.tsv](/Users/dogankaya/test/output/hierarchical/level1_test.tsv)
- [level2_train.tsv](/Users/dogankaya/test/output/hierarchical/level2_train.tsv)
- [level2_dev.tsv](/Users/dogankaya/test/output/hierarchical/level2_dev.tsv)
- [level2_test.tsv](/Users/dogankaya/test/output/hierarchical/level2_test.tsv)

### [HierarchicalTrainer.java](/Users/dogankaya/test/src/main/java/com/example/HierarchicalTrainer.java)

Bu dosya üretilen TSV dosyalarından modeli eğitir.

Burada iki tip eğitim var:
- genel `level1` modeli
- genel `level2` modeli

Ek olarak asset type bazlı alt modeller de üretiliyor:
- `tr-doccat-level2-STOCK.bin`
- `tr-doccat-level2-CRYPTO.bin`
- `tr-doccat-level2-COMMODITY.bin`
- vb.

Bu iyi bir şey, çünkü hisse geldiğinde sadece hisse sembolleri arasında seçim yapmak daha mantıklı.

### [HierarchicalPredictor.java](/Users/dogankaya/test/src/main/java/com/example/HierarchicalPredictor.java)

Bu dosya tek bir haber metni alır ve tahmin yapar.

Mantık şu:

1. Önce `level1` ile kategori tahmini yapılır.
2. Sonra uygun `level2` modeli seçilir.
3. Eğer haberde çok açık sembol ya da güçlü alias varsa, sözlük bilgisi modele üstün gelir.

Bu son madde çok önemli.

Örnek:
- `GARAN net faiz marjindaki toparlanmayla one cikti`

Burada `GARAN` açıkça geçiyorsa, model yanlış yere kaysa bile sözlük yardımıyla sonuç toparlanır.

## 4. properties.text neden önemli?

Senin eklediğin [properties.text](/Users/dogankaya/test/properties.text) çok değerli çünkü küçük manuel listeden çok daha büyük bir enstrüman evreni veriyor.

Şu an importer sonrası:
- yaklaşık `3765` enstrüman sisteme taşındı

Bu şu açıdan iyi:
- daha fazla sembol tanınabilir
- daha fazla borsa / enstrüman tipi kapsanır
- sistem gerçek dünyaya daha çok yaklaşır

Ama şu açıdan da zorlaştırır:
- yanlış eşleşme riski artar
- çok kısa alias'lar karışabilir
- modelin seçim yapacağı aday sayısı büyür

Bu yüzden sadece katalog büyütmek yetmez; veri kalitesini de büyütmek gerekir.

## 5. raw_headlines.csv nedir?

Bu dosya gerçek haber başlıklarının olduğu havuzdur.

Dosya:
- [raw_headlines.csv](/Users/dogankaya/test/src/main/resources/data/raw_headlines.csv)

Bu dosya ne kadar zengin olursa sistem o kadar gerçekçi olur.

Çünkü sentetik cümleler faydalı olsa da gerçek haber dili gibi olmaz.

Örnek fark:

Sentetik:
`Aselsan yeni yatirim planini duyurdu`

Gerçek haber:
`Aselsan yurt disi musteriyle yeni savunma sozlesmesi imzaladi`

İkinci örnek gerçek hayata çok daha yakın.

## 6. Şu an neden bazı haberler hala zor?

Katalog artık büyük ama level 2 tarafı doğası gereği zor.

Çünkü ikinci adımda model bazen onlarca değil, yüzlerce hatta binlerce sembol arasından seçim yapıyor.

Özellikle şu durumlar zor:

- haberde sembol açık yazmıyorsa
- şirket adı kısa ve başka anlamlara da geliyorsa
- başlık çok kısa ise
- aynı sektörde benzer haber dili varsa

Bu yüzden level 2 doğruluğunu artırmak için sadece modeli eğitmek yetmez.

Birlikte kullandığımız şeyler:

- büyük sözlük
- alias eşleşmesi
- type bazlı alt model
- focused level 2 model
- gerçek haberle evaluator

En kritik nokta şudur:

`level 2 kalite = gerçek haber kalitesi + alias kalitesi + doğru karar mantığı`

## 7. Bu projede "confidence" ne demek?

`confidence`, bir haber başlığının gerçekten doğru sembolle eşleştiğine ne kadar güvendiğimizdir.

Örnek:

Yüksek güven:
- `GARAN net faiz marji...`
- `THY yolcu doluluk orani...`
- `Brent petrol yeniden 85 dolar sinirina dayandi`

Düşük güven:
- `hava yolu sirketleri primli`
- `bankacilik hisseleri yukseliste`

İlk grupta açık bir varlık var.
İkinci grupta tam hangi şirket olduğu belirsiz.

Bu yüzden düşük güvenli örnekler `level2` eğitimine körlemesine sokulmaz.

## 8. Şu an sistem nasıl çalıştırılır?

Projede artık iki farklı ana akış var:

1. Sadece mevcut veriyle eğitim ve ölçüm:

```bash
mvn -q -DskipTests compile
java -cp "target/classes:$HOME/.m2/repository/org/apache/opennlp/opennlp-tools/2.3.0/opennlp-tools-2.3.0.jar:$HOME/.m2/repository/org/slf4j/slf4j-api/2.0.16/slf4j-api-2.0.16.jar:$HOME/.m2/repository/org/slf4j/slf4j-simple/2.0.16/slf4j-simple-2.0.16.jar" com.example.FullPipelineRunner
```

2. Canlı RSS çek, havuzu büyüt, sonra yeniden eğit ve ölç:

```bash
mvn -q -DskipTests compile
java -cp "target/classes:$HOME/.m2/repository/org/apache/opennlp/opennlp-tools/2.3.0/opennlp-tools-2.3.0.jar:$HOME/.m2/repository/org/slf4j/slf4j-api/2.0.16/slf4j-api-2.0.16.jar:$HOME/.m2/repository/org/slf4j/slf4j-simple/2.0.16/slf4j-simple-2.0.16.jar" com.example.LiveNewsFullPipelineRunner
```

Bu ikinci akış şunları yapar:
- Google RSS ve Yahoo RSS kaynaklarından haber çeker
- gelen haberleri `output/rss/rss_news_dataset.csv` içine yazar
- yeni başlıkları `raw_headlines.csv` havuzuna ekler
- veri setini yeniden üretir
- modeli yeniden eğitir
- gerçek haber evaluasyonunu tekrar koşar
- prod shadow raporunu yeniler

## 9. RSS tarafında ne kurduk?

Bu tarafta iki yeni parça var:

- [RssNewsDatasetBuilder.java](/Users/dogankaya/test/src/main/java/com/example/RssNewsDatasetBuilder.java)
- [RssToRawHeadlinesPromoter.java](/Users/dogankaya/test/src/main/java/com/example/RssToRawHeadlinesPromoter.java)
- [RealEvalReviewPackager.java](/Users/dogankaya/test/src/main/java/com/example/RealEvalReviewPackager.java)
- [ReviewedBatchPromoter.java](/Users/dogankaya/test/src/main/java/com/example/ReviewedBatchPromoter.java)

`RssNewsDatasetBuilder` şu işi yapar:
- Google TR finans RSS
- Google EN finans RSS
- Yahoo EN finans RSS
- erişilebilirse Yahoo genel RSS varyantları

üzerinden XML feed çeker, parse eder, dili ayıklar, tekrar eden haberleri temizler ve dataset üretir.

`RssToRawHeadlinesPromoter` ise bu dataset içindeki yeni haberleri ana ham havuza taşır.

`RealEvalReviewPackager` ise etiketlenmemiş gerçek haberleri inceleme için hazır hale getirir.
Bu araç:
- detaylı aday CSV üretir
- güven seviyesine göre ayırır
- yüksek güvenli adayları batch dosyalarına böler
- özet rapor üretir

`ReviewedBatchPromoter` ise review edilmiş batch dosyalarını tekrar sisteme taşır.
Bu araç sadece `reviewDecision=APPROVE` olan satırları eval setine ekler.

Yani RSS servis mantığı şu hale geldi:

`RSS XML -> normalize edilmiş dataset -> raw haber havuzu -> eğitim -> evaluasyon`

Review mantığı da şu hale geldi:

`unlabeled gerçek haber -> bucket ayırma -> high-conf batch -> hızlı manuel doğrulama`

Promote mantığı ise şu hale geldi:

`high-conf batch -> reviewDecision doldurma -> APPROVE satırlarını eval setine taşıma`

## 10. Şu an sayı olarak neredeyiz?

Son güncel durumda:

- `instruments.csv` içinde `3770` enstrüman var
- `raw_headlines.csv` içinde `559` gerçek başlık var
- `real_eval_headlines.csv` içinde `315` etiketli gerçek haber var
- weak labeled gerçek haber sayısı `559`
- yüksek güvenli sembol eşleşmesi `276`
- `level1_total = 4256`
- `level2_total = 4046`
- `level2_focused_total = 353`
- `level2_focused_labels = 73`

Bu çok önemli çünkü artık sistem sadece sentetik cümlelerle değil, gerçek haber havuzuyla da besleniyor.

## 11. Son ölçüm ne diyor?

RSS ile büyütülmüş havuzdan sonra güncel gerçek ölçüm sonucu:

- `Real eval size = 315`
- `Level1 accuracy = 99.68% (314/315)`
- `Level2 accuracy = 100.00% (315/315)`

Prod shadow sonucu:

- `Shadow raw total = 559`
- `Shadow labeled total = 315`
- `Shadow unlabeled = 244`
- `Shadow L1 accuracy = 99.68% (314/315)`
- `Shadow L2 accuracy = 100.00% (315/315)`

Burada çok kritik nokta şudur:

`unlabeled = 250` demek, elimizde daha etiketlenmemiş gerçek haber stoğu olduğu anlamına gelir.

Yani bir sonraki doğruluk artışının ana kaynağı artık:
- daha fazla gerçek haber etiketlemek
- alias kalitesini artırmak
- karışan sınıflarda özel kural eklemek

## 11.2. Review batch tarafında neredeyiz?

Yeni review packager sonucunda:

- toplam unlabeled haber: `244`
- `TYPE_ONLY`: `2`
- `LOW_CONF`: `242`
- high-conf batch sayısı: `0`

Dosyalar:
- [review_summary.txt](/Users/dogankaya/test/output/review/review_summary.txt)
- [high_conf_batch_01.csv](/Users/dogankaya/test/output/review/high_conf_batch_01.csv)
- [high_conf_batch_02.csv](/Users/dogankaya/test/output/review/high_conf_batch_02.csv)
- [high_conf_batch_03.csv](/Users/dogankaya/test/output/review/high_conf_batch_03.csv)

Bu şu anlama gelir:
otomatik alinabilecek en kuvvetli adaylar eval setine tasinmis durumda.
Kalan havuz daha zor ve daha manuel inceleme isteyen haberlerden olusuyor.

## 11.5. Bu proje hangi aşamalardan geçti?

Projeyi sırasıyla şu aşamalardan geçirdik:

1. Hedefi tanımladık:
   haberden önce ana türü, sonra tam enstrümanı bulacağız.

2. Büyük katalog entegrasyonu yaptık:
   `properties.text` içeriğini importer ile sisteme taşıdık.

3. Veri üretim hattını büyüttük:
   sentetik + gerçek başlık karışımıyla iki aşamalı dataset oluşturduk.

4. Eğitim hattını böldük:
   genel modeller ve `type` bazlı alt modeller ürettik.

5. Tahmin hattını güçlendirdik:
   lexicon, alias, confidence ve fallback kuralları ekledik.

6. Gerçek dünya ölçümünü kurduk:
   `real eval` ve `prod shadow` katmanlarını ekledik.

7. Canlı veri akışını ekledik:
   Google RSS ve Yahoo RSS üzerinden XML haber çekmeye başladık.

8. Otomasyon seviyesini artırdık:
   tüm akışı tek komutla koşan runner sınıfları ekledik.

Bu yüzden proje artık sadece "bir model denemesi" değil.
Gerçek veriye dayalı, ölçülebilir ve yeniden eğitilebilir bir sınıflandırma hattı haline geldi.

## 12. Bundan sonra prod seviyesine nasıl yaklaşılır?

En doğru yol şu sıradır:

1. RSS akışı her seferinde yeni haber getirsin
2. bu haberlerden iyi adayları eval setine taşıyalım
3. karışan semboller için alias ve karar kuralları ekleyelim
4. her veri değişikliğinden sonra real eval ve prod shadow koşalım
5. hata kümelerini tema bazlı inceleyelim
6. gerekiyorsa bazı varlıklar için özel focused veri üretelim

Yani artık darboğaz model mimarisi değil.
Darboğaz daha kaliteli gerçek veri ve daha güçlü etiket kalitesi.

### 1. Büyük katalogu CSV'ye dönüştür

```bash
java -cp target/classes com.example.InstrumentCatalogImporter
```

### 2. Hiyerarşik veri setini üret

```bash
java -cp target/classes com.example.HierarchicalDatasetGenerator
```

### 3. Modelleri eğit

```bash
java -cp 'target/classes:/Users/dogankaya/.m2/repository/org/apache/opennlp/opennlp-tools/2.3.0/opennlp-tools-2.3.0.jar:/Users/dogankaya/.m2/repository/org/slf4j/slf4j-api/2.0.16/slf4j-api-2.0.16.jar:/Users/dogankaya/.m2/repository/org/slf4j/slf4j-simple/2.0.16/slf4j-simple-2.0.16.jar' com.example.HierarchicalTrainer
```

### 4. Tahmin yap

```bash
java -cp 'target/classes:/Users/dogankaya/.m2/repository/org/apache/opennlp/opennlp-tools/2.3.0/opennlp-tools-2.3.0.jar:/Users/dogankaya/.m2/repository/org/slf4j/slf4j-api/2.0.16/slf4j-api-2.0.16.jar:/Users/dogankaya/.m2/repository/org/slf4j/slf4j-simple/2.0.16/slf4j-simple-2.0.16.jar' com.example.HierarchicalPredictor 'THY yolcu doluluk oraninda guclu performans sergiledi'
```

### 5. Gerçek haberle test et

```bash
java -cp 'target/classes:/Users/dogankaya/.m2/repository/org/apache/opennlp/opennlp-tools/2.3.0/opennlp-tools-2.3.0.jar:/Users/dogankaya/.m2/repository/org/slf4j/slf4j-api/2.0.16/slf4j-api-2.0.16.jar:/Users/dogankaya/.m2/repository/org/slf4j/slf4j-simple/2.0.16/slf4j-simple-2.0.16.jar' com.example.RealNewsEvaluator
```

### 6. Hepsini tek komutta çalıştır

```bash
java -cp 'target/classes:/Users/dogankaya/.m2/repository/org/apache/opennlp/opennlp-tools/2.3.0/opennlp-tools-2.3.0.jar:/Users/dogankaya/.m2/repository/org/slf4j/slf4j-api/2.0.16/slf4j-api-2.0.16.jar:/Users/dogankaya/.m2/repository/org/slf4j/slf4j-simple/2.0.16/slf4j-simple-2.0.16.jar' com.example.FullPipelineRunner
```

## 9. Gerçek ortam testi ne zaman yapılır?

Kısa cevap:

Her önemli değişiklikten sonra.

Yani şu olaylardan biri olunca `RealNewsEvaluator` çalıştırılır:

1. `properties.text` değiştiyse
2. `raw_headlines.csv` büyüdüyse
3. alias listesi değiştiyse
4. eğitim mantığı değiştiyse
5. predictor karar mantığı değiştiyse

Pratik çalışma düzeni şöyle olmalı:

1. yeni veri ekle
2. modeli tekrar üret
3. gerçek haber evaluator çalıştır
4. hatalı kalan haberleri not et
5. alias veya veri tarafını güçlendir

Bu sayede laboratuvar sonucu ile gerçek hayat sonucu ayrı ayrı takip edilir.

Şu an son gerçek haber testinde sonuç:

- `Level1 accuracy = 100.00% (20/20)`
- `Level2 accuracy = 100.00% (20/20)`

Bu çok iyi bir işaret ama veri seti hala küçük olduğu için yeterli değil.

Yani gerçek ortam testi başladı, ama bunu büyütmemiz lazım.
Bir sonraki hedef 20 haber değil, en az 100-200 etiketli gerçek haber olmalı.

## 10. Bundan sonra en çok ne geliştirir?

En büyük gelişim şu sırayla gelir:

1. `raw_headlines.csv` dosyasını büyütmek
2. Türkçe ve finans odaklı alias listesini güçlendirmek
3. Özellikle BIST hisseleri için gerçek haber sayısını artırmak
4. `OTHER` sınıfını daha kaliteli yapmak
5. model yerine bazı durumlarda doğrudan kural + sözlük hibriti kullanmak

## 11. Kısa özet

Bu projede şu anda üç şey birlikte çalışıyor:

1. Büyük enstrüman sözlüğü
2. İki aşamalı sınıflandırma modeli
3. Sözlük destekli tahmin mantığı

Bu iyi bir başlangıçtır.

Ama gerçek başarıyı asıl artıracak şey:
- daha fazla gerçek haber
- daha temiz etiket
- Türkçe finans diline özel alias zenginliği

Yani bundan sonraki ana odak:

`daha fazla gerçek veri + daha iyi weak labeling`

olmalı.
