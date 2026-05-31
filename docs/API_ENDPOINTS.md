# Finance Portal API Endpoints

Varsayılan giriş noktası API Gateway'dir:

```text
http://localhost:8080
```

Servis portları:

- API Gateway: `8080`
- Finance Service: `8081`
- News Service: `8082`
- Classification API: `8083`
- Keycloak: `9090`

## Swagger / OpenAPI Dokümantasyonu

Her backend servis kendi OpenAPI dokümanını üretir. Gateway üzerinde Swagger UI toplu dokümantasyon ekranı olarak kullanılabilir:

| Servis | Swagger UI | OpenAPI JSON |
| --- | --- | --- |
| API Gateway | `http://localhost:8080/swagger-ui.html` | `http://localhost:8080/v3/api-docs` |
| Finance Service | `http://localhost:8081/swagger-ui.html` | `http://localhost:8081/v3/api-docs` |
| News Service | `http://localhost:8082/swagger-ui.html` | `http://localhost:8082/v3/api-docs` |
| Classification API | `http://localhost:8083/swagger-ui.html` | `http://localhost:8083/v3/api-docs` |

Gateway Swagger UI servis dokümanlarını şu proxy pathleri üzerinden listeler:

- `http://localhost:8080/finance/v3/api-docs`
- `http://localhost:8080/news/v3/api-docs`
- `http://localhost:8080/classification/v3/api-docs`

Backend response formatı genel olarak `ApiResult<T>` yapısındadır:

```json
{
  "success": true,
  "data": {},
  "message": "operation completed",
  "response": 200,
  "timestamp": "2026-05-09T12:00:00"
}
```

## Market Endpoints

Base path:

```text
/api/market
```

| Method | Endpoint | Auth | Açıklama |
| --- | --- | --- | --- |
| GET | `/api/market` | Public | Enstrümanları listeler ve filtreler. |
| GET | `/api/market/{symbol}` | Public | Sembol ile tek enstrüman getirir. |
| GET | `/api/market/movers` | Public | En çok yükselen/düşen enstrümanları getirir. |
| GET | `/api/market/candles/{symbol}` | Public | Mum grafik datası döner. |
| GET | `/api/market/line/{symbol}` | Public | Line chart datası döner. |
| GET | `/api/market/history/{symbol}` | Public | Ham tarihsel piyasa verisini döner. |
| GET | `/api/market/hypothetical-return/{symbol}` | Public | Seçilen geçmiş alım tarihine göre hipotetik getiri hesaplar. |

### GET `/api/market`

Query params:

- `q`: sembol veya isim arama metni
- `type`: `FIAT`, `STOCK`, `CRYPTO`, `COMMODITY`, `FOREX`, `INDEX`, `FUND`, `VIOP`, `BOND`
- `market`: piyasa/ülke filtresi
- `currency`: `TRY`, `USD`, `EUR`, vb.
- `page`: varsayılan `0`
- `size`: varsayılan `30`

Örnek:

```http
GET /api/market?q=THY&type=STOCK&page=0&size=20
```

Örnek response:

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "symbol": "THYAO",
        "name": "Turk Hava Yollari",
        "type": "STOCK",
        "currentPrice": 300.25,
        "baseCurrency": "TRY"
      }
    ],
    "number": 0,
    "size": 20,
    "totalElements": 1
  },
  "message": "instruments fetched",
  "response": 200
}
```

### GET `/api/market/candles/{symbol}`

Query params:

- `slot`: zaman aralığı, örnek `M1`, `D1`, `W1`
- `from`: ISO date-time, örnek `2026-01-01T00:00:00`

Örnek:

```http
GET /api/market/candles/BTCUSDT?slot=D1&from=2026-01-01T00:00:00
```

Örnek response:

```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2026-01-01T00:00:00",
      "open": 43000.0,
      "high": 44100.0,
      "low": 42500.0,
      "close": 43800.0
    }
  ],
  "message": "all candle data fetched",
  "response": 200
}
```

### GET `/api/market/hypothetical-return/{symbol}`

Query params:

- `purchaseDate`: zorunlu, ISO date
- `quantity`: varsayılan `1`
- `displayCurrency`: opsiyonel

Örnek:

```http
GET /api/market/hypothetical-return/AAPL?purchaseDate=2025-01-10&quantity=5&displayCurrency=TRY
```

## Portfolio Endpoints

Base path:

```text
/api/portfolio
```

Bu endpointler Bearer token ister.

| Method | Endpoint | Auth | Açıklama |
| --- | --- | --- | --- |
| GET | `/api/portfolio` | ADMIN | Tüm portföyleri listeler. |
| GET | `/api/portfolio/myPortfolios` | USER | Giriş yapan kullanıcının portföylerini listeler. |
| GET | `/api/portfolio/{portfolioId}` | USER, ADMIN | Tek portföy detayını getirir. |
| POST | `/api/portfolio/create` | USER, ADMIN | Yeni portföy oluşturur. |
| GET | `/api/portfolio/{portfolioId}/history` | USER, ADMIN | Portföy performans geçmişini döner. |
| POST | `/api/portfolio/deposit` | USER, ADMIN | Portföye nakit yatırır. |
| POST | `/api/portfolio/buy` | USER, ADMIN | Enstrüman alım işlemi yapar. |
| POST | `/api/portfolio/sell` | USER, ADMIN | Enstrüman satış işlemi yapar. |
| GET | `/api/portfolio/value/{portfolioId}` | USER, ADMIN | Enstrüman bazlı portföy dağılımı döner. |
| GET | `/api/portfolio/allocation/type/{portfolioId}` | USER, ADMIN | Varlık tipi bazlı portföy dağılımı döner. |
| GET | `/api/portfolio/currentProfit/{portfolioId}` | USER | Güncel kar/zarar bilgisi döner. |
| GET | `/api/portfolio/transactions` | USER, ADMIN | Kullanıcı işlem geçmişini döner. |

### POST `/api/portfolio/create`

Request:

```json
{
  "portfolioName": "Uzun Vadeli",
  "riskTolerance": "MODERATE",
  "purpose": "RETIREMENT"
}
```

### POST `/api/portfolio/deposit`

Request:

```json
{
  "portfolioId": "11111111-1111-1111-1111-111111111111",
  "amount": 10000
}
```

### POST `/api/portfolio/buy`

Request:

```json
{
  "portfolioId": "11111111-1111-1111-1111-111111111111",
  "instrumentSymbol": "BTCUSDT",
  "quantity": 0.05
}
```

### POST `/api/portfolio/sell`

Request:

```json
{
  "portfolioId": "11111111-1111-1111-1111-111111111111",
  "instrumentSymbol": "BTCUSDT",
  "quantity": 0.01
}
```

## News Endpoints

Base path:

```text
/api/news
```

| Method | Endpoint | Auth | Açıklama |
| --- | --- | --- | --- |
| GET | `/api/news` | Public | Haberleri konu/ülke filtresiyle listeler. |
| POST | `/api/news/refresh` | ADMIN | RSS kaynaklarından manuel haber yenileme başlatır. |
| GET | `/api/news/topics` | Public | Desteklenen haber konularını döner. |

### GET `/api/news`

Query params:

- `topic`: `GENERAL`, `CRYPTO`, `STOCK`, `BOND`, `COMMODITY`, `FOREX`, `FUND`
- `country`: `TR`, `US`, vb.

Örnek:

```http
GET /api/news?topic=STOCK&country=TR
```

Örnek response:

```json
{
  "success": true,
  "data": [
    {
      "source": {
        "id": "",
        "name": "Sozcu RSS"
      },
      "title": "Piyasalarda son durum",
      "country": "TR",
      "category": "STOCK",
      "description": "Haber özeti",
      "content": "Haber içeriği",
      "url": "https://example.com/news",
      "publishedAt": "2026-05-09T12:00:00",
      "modelName": "classification-api",
      "instrumentSymbol": "THYAO",
      "instruments": [
        {
          "symbol": "THYAO",
          "assetType": "STOCK",
          "score": "0.87",
          "rankOrder": 1,
          "primaryMatch": true,
          "matchSource": "MODEL"
        }
      ]
    }
  ],
  "message": "all news articles fetched",
  "response": 200
}
```

## Admin Endpoints

Finance admin base path:

```text
/api/admin
```

| Method | Endpoint | Auth | Açıklama |
| --- | --- | --- | --- |
| GET | `/api/admin/totalMember` | ADMIN | Toplam kullanıcı sayısını döner. |
| GET | `/api/admin/nonactiveInstruments` | ADMIN | Pasif enstrümanları listeler. |
| PATCH | `/api/admin/instruments/{symbol}/active` | ADMIN | Enstrüman aktiflik durumunu günceller. |
| GET | `/api/admin/providers/status` | ADMIN | Finance veri sağlayıcı durumlarını döner. |

### PATCH `/api/admin/instruments/{symbol}/active`

Request:

```json
{
  "active": true
}
```

News admin:

| Method | Endpoint | Auth | Açıklama |
| --- | --- | --- | --- |
| GET | `/api/news/admin/providers/status` | ADMIN | Haber sağlayıcı durumlarını döner. |

## Classification API Endpoints

Classification API gateway arkasına alınmayabilir; doğrudan servis portu üzerinden kullanılabilir.

Base path:

```text
/api/v1/news
```

| Method | Endpoint | Auth | Açıklama |
| --- | --- | --- | --- |
| GET | `/api/v1/news/health` | Public | Classification servis sağlık kontrolü. |
| POST | `/api/v1/news/classify` | Public/Internal | JSON haber metni sınıflandırır. |
| POST | `/api/v1/news/classify-text` | Public/Internal | Plain text haber metni sınıflandırır. |
| POST | `/api/v1/news/classify-safe` | Public/Internal | Güvenli JSON sınıflandırma endpointi. |
| POST | `/api/v1/news/classify-safe-text` | Public/Internal | Güvenli plain text sınıflandırma endpointi. |

### POST `/api/v1/news/classify`

Request:

```json
{
  "headline": "Borsa Istanbul'da banka hisseleri yükselişte"
}
```

Örnek response:

```json
{
  "headline": "Borsa Istanbul'da banka hisseleri yükselişte",
  "assetType": "STOCK",
  "symbol": "AKBNK",
  "assetScore": "0.87",
  "symbolScore": "0.81",
  "lexiconSymbol": "AKBNK",
  "topCandidates": ["AKBNK", "GARAN", "YKBNK"],
  "unknown": false,
  "modelVersion": "classification-api"
}
```

## Gateway Routing

API Gateway üzerinden yönlenen ana pathler:

- `/api/news/**` -> `news-service`
- `/api/v1/news/**` -> `classification-api`
- `/api/market/**` -> `finance-service`
- `/api/portfolio/**` -> `finance-service`
- `/api/admin/**` -> `finance-service`
- `/finance/v3/api-docs` -> `finance-service` OpenAPI JSON
- `/news/v3/api-docs` -> `news-service` OpenAPI JSON
- `/classification/v3/api-docs` -> `classification-api` OpenAPI JSON

Frontend API istekleri `VITE_API_BASE_URL` tanımlıysa bu base URL'e, değilse aynı origin üzerinden gateway'e gider.
