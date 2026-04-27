# Ne Yaptik Ve Sirada Ne Var?

Bu dosya teknik bilgin olmasa bile projeyi anlayabilmen icin yazildi.

## 1. Bu projede ne kurduk?

Biz bir finans haberini okuyup iki sey soyleyen bir sistem kuruyoruz:

1. Bu haber hangi ana tur?
2. Bu haber tam olarak hangi enstrumanla ilgili?

Ornek:

`THY yeni ucak finansmani icin uluslararasi bankalarla masada`

Sistem sunu demeli:

- 1. adim: `STOCK`
- 2. adim: `THYAO`

Yani sistem once buyuk kategoriyi, sonra tam sembolu buluyor.

## 2. Neden iki asamali yapi kurduk?

Cunku tek adimda binlerce secenek arasindan dogru sembolu secmek cok zor.

Daha mantikli yol su:

1. once bunun hisse mi, kripto mu, emtia mi oldugunu bul
2. sonra sadece o grubun icinden secim yap

Bu hem gercek hayata daha yakin, hem de model icin daha saglikli.

## 3. Biz simdiye kadar ne yaptik?

Su ana kadar yaptigimiz seyler:

- `properties.text` icindeki buyuk enstruman katalogunu projeye tasidik
- bunu sistemin okuyacagi `instruments.csv` formatina cevirdik
- Turkce finans dilinde kullanilan aliaslari ekledik
- iki asamali dataset uretim hattini kurduk
- level 1 ve level 2 modellerini egittik
- type bazli alt modeller ekledik
- predictor tarafina sozluk + model hibrit mantigi koyduk
- gercek haber evaluator ekledik
- tum akisi tek komutta calistiran yardimci sinif ekledik

Kisaca:

Sadece model egitmedik.
Modelin etrafindaki tum veri, sozluk, test ve kontrol sistemini de kurduk.

## 3.5. Hangi adimlardan gectik?

Projeyi asama asama su sekilde ilerlettik:

1. Once tek amaci netlestirdik:
   finans haberini iki asamada siniflandiracagiz
   - ilk adim: ana tur
   - ikinci adim: tam sembol

2. Kucuk manuel katalogdan cikip buyuk enstruman evrenine gectik:
   - `properties.text` dosyasini projeye aldik
   - importer yazarak bunu `instruments.csv` formatina cevirdik

3. Sadece sentetik veriyle kalmayalim diye gercek haber havuzunu buyuttuk:
   - `raw_headlines.csv` tarafini genislettik
   - weak labeling mantigini daha gercekci hale getirdik

4. Sonra modeli iki katmanli kurduk:
   - `level1` ana tur tahmini
   - `level2` sembol tahmini

5. Ardindan `type` bazli alt modeller ekledik:
   - hisse gelirse hisse modelleri
   - kripto gelirse kripto modelleri
   - boylece arama alani daraldi

6. Predictor tarafini sadece modele birakmadik:
   - alias
   - sozluk
   - confidence
   - kural bazli toparlama
   ekledik

7. Sonra gercek hayat test hattini kurduk:
   - `real_eval_headlines.csv`
   - `RealNewsEvaluator`
   - `ProdShadowRunner`

8. Bundan sonra canli veri tarafini ekledik:
   - Google RSS
   - Yahoo RSS
   - XML parse
   - normalize etme
   - raw havuza promotelama

9. Son olarak tum akisi birlestirdik:
   - import
   - dataset
   - train
   - eval
   - prod shadow
   - live RSS full pipeline

Yani bugunku sistem bir tek model dosyasindan ibaret degil.
Uctan uca veri + egitim + kontrol + canli besleme hattina donustu.

## 4. `properties.text` neden bu kadar onemli?

Bu dosya buyuk bir enstruman dunyasi veriyor.

Yani sistem artik sadece 5-10 sirket degil, binlerce enstrumani taniyabilecek hale geliyor.

Bu iyi bir sey.

Ama ayni zamanda isi zorlastiriyor.

Cunku:

- secenek sayisi artiyor
- karisabilecek isim sayisi artiyor
- yanlis eslesme riski artiyor

Bu nedenle biz sadece katalog buyutmedik.
Ayni zamanda alias, test ve evaluator da ekledik.

## 5. `alias` ne demek?

Bir enstruman haberlerde farkli isimlerle gecebilir.

Ornek:

- `THYAO`
- `THY`
- `Turk Hava Yollari`
- `Turkish Airlines`

Bunlar aslinda ayni seyi anlatabilir.

Iste bu alternatif isimlere `alias` diyoruz.

Alias guclu degilse model gercek haberlerde zorlanir.
Bu yuzden alias tarafini ozellikle buyuttuk.

## 6. `real eval` ne demek?

Bu en kritik noktalardan biri.

Modeli egitmek ayri bir sey.
Modeli gercek haberle sinamak ayri bir sey.

`Real eval` su demek:

Elimizde etiketlenmis gercek haberler var.
Model bu haberlere bakiyor.
Sonra dogru tahmin etti mi etmedi mi olcuyoruz.

Bu bize gercek hayata ne kadar yaklastigimizi gosteriyor.

## 7. Su an durum ne?

Guncel durumda sistem su olcege geldi:

- `instruments.csv` icinde `3770` enstruman var
- `raw_headlines.csv` icinde `559` gercek haber basligi var
- `real_eval_headlines.csv` icinde `315` etiketli gercek haber var
- weak labeled gercek haber sayisi `559`
- yuksek guvenli sembol baglanan haber sayisi `276`

Son guncel evaluator sonucu:

- `Real eval size = 315`
- `Level1 accuracy = 99.68% (314/315)`
- `Level2 accuracy = 100.00% (315/315)`

Prod shadow sonucu:

- `Shadow raw total = 559`
- `Shadow labeled total = 315`
- `Shadow unlabeled = 244`
- `Shadow L1 accuracy = 99.68% (314/315)`
- `Shadow L2 accuracy = 100.00% (315/315)`

Bu cok iyi bir durum.

Ama hala bitmis degiliz.

Cunku `250` adet gercek haber henuz etiketlenmemis durumda.

Yani elimizde modeli daha da zorlayacak yeni malzeme var.

## 8. Simdi neden "next step" test setini buyutmek?

Cunku artik en buyuk risk modelin calismamasi degil.
En buyuk risk, sadece bugunku etiketli haberlerde iyi olup yeni gercek haberlerde kaymaya baslamasi.

Bu yuzden bir sonraki buyuk hedef su:

`etiketli gercek haber havuzunu 315'in de uzerine tasimak`

## 9. Bunun icin ne ekledim?

Yeni bir arac ekledim:

[`RealEvalCandidateExporter.java`](/Users/dogankaya/test/src/main/java/com/example/RealEvalCandidateExporter.java)

Bu arac sunu yapiyor:

- `raw_headlines.csv` icindeki haberleri okuyor
- zaten eval setinde olanlari cikariyor
- kalan haberler icin mevcut modelle tahmin yapiyor
- bunlari gozden gecirme dosyasina yaziyor

Yani bize yarim hazir bir kontrol listesi veriyor.

Bu dosya sayesinde sifirdan elle tek tek hazirlamayacagiz.

Ek olarak yeni RSS akisi da kuruldu:

- [RssNewsDatasetBuilder.java](/Users/dogankaya/test/src/main/java/com/example/RssNewsDatasetBuilder.java)
- [RssToRawHeadlinesPromoter.java](/Users/dogankaya/test/src/main/java/com/example/RssToRawHeadlinesPromoter.java)
- [LiveNewsFullPipelineRunner.java](/Users/dogankaya/test/src/main/java/com/example/LiveNewsFullPipelineRunner.java)
- [RealEvalReviewPackager.java](/Users/dogankaya/test/src/main/java/com/example/RealEvalReviewPackager.java)
- [ReviewedBatchPromoter.java](/Users/dogankaya/test/src/main/java/com/example/ReviewedBatchPromoter.java)

Bu yeni akis sayesinde:

1. Google ve Yahoo RSS kaynaklarindan XML haber cekiyoruz
2. bunlari normalize ediyoruz
3. ana ham haber havuzuna ekliyoruz
4. modeli yeniden egitiyoruz
5. gercek haber evaluator ve shadow raporunu tekrar aliyoruz

Ek olarak review hizlandirma araci su isi yapiyor:

1. etiketlenmemis gercek haberleri ayiriyor
2. bunlari `HIGH_CONF`, `MEDIUM_CONF`, `TYPE_ONLY`, `LOW_CONF` diye boluyor
3. `HIGH_CONF` adaylari 25'lik batch dosyalarina ayiriyor
4. boylece eval seti buyutme isi daha hizli hale geliyor

Yeni promote araci ise su isi yapiyor:

1. batch dosyasindaki `reviewDecision` kolonunu okuyor
2. `APPROVE` isaretlenen satirlari seciyor
3. sadece bunlari `real_eval_headlines.csv` icine ekliyor

## 10. Bu yeni arac neden faydali?

Cunku gercek test seti buyutmenin en pahali kismi model degil, etiketleme emegidir.

Bu arac su isi kolaylastiriyor:

1. model once tahmin yapar
2. biz sadece kontrol ederiz
3. dogruysa eval setine tasiriz
4. yanlissa duzeltiriz

Boylece 20 satirlik eval setini daha hizli sekilde 50, 100, 200 satira cikarabiliriz.

## 10.5. Su an tam olarak neleri bitirdik?

Bitmis olan ana isler:

- buyuk enstruman katalog importu
- iki asamali veri seti uretimi
- `level1` ve `level2` egitim hattı
- `type` bazli alt model mantigi
- predictor icin lexicon + model hibrit karar yapisi
- kritik alias genisletmeleri
- quoted CSV parse hatasinin duzeltilmesi
- gercek haber evaluator
- prod shadow evaluator
- RSS dataset builder
- RSS -> raw promoter
- unlabeled review packager
- reviewed batch promoter
- tek komutluk normal pipeline
- tek komutluk live RSS pipeline
- temel regression testleri

Bu su demek:

Artik "sifirdan sistem kuruyoruz" asamasini gectik.
Su an "sistemi prod seviyeye yaklastiriyoruz" asamasindayiz.

## 11. Bundan sonra calisma sirasi ne olmali?

En mantikli sira su:

1. RSS ile yeni haberleri cek
2. aday listeyi `RealEvalCandidateExporter` ile uret
3. bu listedeki haberleri kontrol et
4. dogrulanmis satirlari `real_eval_headlines.csv` icine ekle
5. sonra `RealNewsEvaluator` calistir
6. hata kalan satirlari incele
7. gerekiyorsa alias veya veri tarafini guclendir

Bu listeye bir katman daha eklemek gerekiyor:

8. hata yapan haberleri tema bazli grupla
9. ayni tip yanlislar icin toplu alias / kural duzeltmesi yap
10. tekrar train + eval + shadow kos

Boylece ilerleme satir satir degil, parti parti hizlanir.

## 11.5. Unlabeled review tarafinda son durum ne?

Su an review klasoru uretilmis durumda:

- [review_summary.txt](/Users/dogankaya/test/output/review/review_summary.txt)
- [high_conf_batch_01.csv](/Users/dogankaya/test/output/review/high_conf_batch_01.csv)
- [high_conf_batch_02.csv](/Users/dogankaya/test/output/review/high_conf_batch_02.csv)
- [high_conf_batch_03.csv](/Users/dogankaya/test/output/review/high_conf_batch_03.csv)

Son guncel review dagilimi:

- toplam unlabeled haber: `244`
- `TYPE_ONLY`: `2`
- `LOW_CONF`: `242`
- yuksek guven batch sayisi: `0`

Bu ne demek?

Artik sistemde otomatik alinabilecek `HIGH_CONF` aday kalmadi.
Kalan havuz agirlikla dusuk guvenli gercek haberlerden olusuyor.

Bu da su anki asamada en kolay genislemenin bitmis oldugunu gosterir.

## 12. Kisa ozet

Biz su an sadece model egitme asamasinda degiliz.

Aslinda 4 parcalik bir sistem kurduk:

1. buyuk enstruman sozlugu
2. iki asamali model
3. sozluk destekli karar mekanizmasi
4. gercek haber evaluator sistemi

Simdiki en onemli hedef:

`etiketli gercek haber havuzunu buyutmek ve RSS akisini duzenli beslemek`

Cunku prod seviyesine en cok bu yaklastiracak.
