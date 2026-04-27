# News Classification API Kullanim Kilavuzu

Bu dokuman, modeli Spring Boot tabanli HTTP servis olarak nasil ayaga kaldiracagini ve ana uygulamandan nasil cagiracagini anlatir.

## 1. Bu API ne yapiyor?

Bu servis bir haber basligi alir ve sunlari doner:

- `assetType`
- `symbol`
- `assetScore`
- `symbolScore`
- `lexiconSymbol`
- `topCandidates`
- `unknown`
- `modelVersion`

Endpointler:

- `GET /api/v1/news/health`
- `POST /api/v1/news/classify`

## 2. Servis nasil calistirilir?

Gelistirme modunda:

```bash
mvn spring-boot:run
```

Jar olarak:

```bash
mvn -DskipTests package
java -jar target/test-1.0-SNAPSHOT.jar
```

## 3. API nasil test edilir?

Health:

```bash
curl http://localhost:8080/api/v1/news/health
```

Classify:

```bash
curl -X POST http://localhost:8080/api/v1/news/classify \
  -H "Content-Type: application/json" \
  -d '{"headline":"THY yolcu doluluk oraninda guclu performans sergiledi"}'
```

## 4. Ana uygulama nasil kullanir?

News servisin veya ana uygulaman sadece headline'i gonderir.
Bu API cevap olarak kategori ve sembol dondurur.

DB'ye yazman gereken minimum alanlar:

- `assetType`
- `symbol`
- `assetScore`
- `symbolScore`
- `modelVersion`

## 5. Neden bu yol iyi?

Bu yapi sayesinde:

- `.bin` dosyalarini direkt endpoint olarak kullanmis olursun
- ana uygulamaya predictor logic gommek zorunda kalmazsin
- AI fallback'i sonra rahat eklersin
- `java -jar` ile tek basina da acabilirsin
