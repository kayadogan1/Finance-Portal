# EC2 Deployment Notes and Lessons Learned

Bu dosya EC2 uzerinde GitHub'dan projeyi cekip Docker Compose ile calistirirken karsilasilan hatalari, kok nedenleri ve cozumleri toplamak icin tutulur.

## Ortam

- Sunucu: AWS EC2
- OS: Ubuntu 26.04 LTS
- Mimari: x86_64
- Test yaklasimi: container uzerinden calistirma
- Frontend test yaklasimi: public IP veya SSH tunnel ile browser testi

## 1. Docker Kurulu Degildi

### Belirti

```text
Command 'docker' not found
Unable to locate package docker-compose-plugin
```

### Kok Neden

EC2 Ubuntu imajinda Docker hazir gelmiyor. Ayrica Ubuntu 26.04 apt deposunda `docker-compose-plugin` paketi bulunmayabiliyor.

### Cozum

Docker kur:

```bash
sudo apt update
sudo apt install -y docker.io git ca-certificates curl gnupg
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu
```

Compose plugin'i manuel kur:

```bash
mkdir -p ~/.docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/download/v2.40.3/docker-compose-linux-x86_64 -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose
newgrp docker
```

Kontrol:

```bash
docker --version
docker compose version
docker ps
```

### Ders

README icinde EC2 icin Docker kurulum adimi net olmali. `docker-compose-plugin` paketi her Ubuntu surumunde ayni isimle bulunmayabilir.

## 2. Keycloak Database Yoktu

### Belirti

```text
FATAL: database "keycloak" does not exist
ERROR: Failed to obtain JDBC connection
```

### Kok Neden

`docker-compose.yml` icinde Keycloak `jdbc:postgresql://postgres:5432/keycloak` database'ine baglaniyor. Fakat ilk init SQL sadece `news_db` olusturuyordu.

### Gecici Cozum

Mevcut volume olustuktan sonra init script tekrar calismadigi icin EC2 uzerinde manuel database olusturuldu:

```bash
docker compose exec postgres createdb -U postgres keycloak
docker compose restart keycloak
```

Alternatif:

```bash
docker exec -it finance_db createdb -U postgres keycloak
docker compose restart keycloak
```

### Kalici Cozum

Repo icine yeni init script eklendi:

```text
init-db/02-create-keycloak-database.sql
```

Bu script yeni temiz kurulumlarda `keycloak` database'ini otomatik olusturur.

Ek olarak `postgres-bootstrap` one-shot container'i eklendi. Bu container her `docker compose up` sirasinda Postgres hazir olunca su database'leri idempotent olarak kontrol eder:

```text
finance_db
news_db
keycloak
```

Eksik olan database'i olusturur, varsa dokunmaz. Bu nedenle mevcut volume olan sunucularda da manuel `createdb` ihtiyaci azalir.

### Ders

Postgres init scriptleri sadece volume ilk kez olustugunda calisir. Volume olustuktan sonra init script degisikligi var olan database'e uygulanmaz.

## 3. Public IP + HTTP Uzerinde Keycloak JS Patladi

### Belirti

Browser console:

```text
Keycloak initialization failed: Error: Web Crypto API is not available.
Unhandled Promise Rejection: Error: Web Crypto API is not available.
```

### Kok Neden

Uygulama public IP uzerinden HTTP ile acildi:

```text
http://<EC2_PUBLIC_IP>:5173
```

Modern browser'lar Web Crypto API icin secure context ister. `localhost` guvenli sayilir, fakat public IP uzerindeki plain HTTP guvenli sayilmaz.

### Gecici Cozum

SSH tunnel ile uygulamayi lokal `localhost` olarak ac:

```bash
ssh -i <key.pem> \
  -L 5173:localhost:5173 \
  -L 9090:localhost:9090 \
  -L 8080:localhost:8080 \
  ubuntu@<EC2_PUBLIC_IP>
```

Browser:

```text
http://localhost:5173
```

### Kalici Cozum

Prod/demo icin domain + HTTPS kullanilmalidir.

Olasiliklar:

- Nginx + Certbot
- Caddy
- AWS ALB + ACM certificate
- Cloudflare proxy + SSL

### Ders

Keycloak/OIDC frontend testlerinde public HTTP IP sorun cikarabilir. Gercek demo icin HTTPS gerekir.

## 4. Keycloak Hostname Localhost Kaldi

### Belirti

Keycloak log:

```text
Base URL: http://localhost:9090
Hostname: localhost
```

### Kok Neden

Default compose local development icin ayarli. EC2 public IP ile browser testi yaparken `localhost` tarayicinin kendi makinesini ifade eder, EC2'yi degil.

### Cozum

EC2 public IP ile container'lari kaldir:

```bash
export EC2_PUBLIC_IP=$(curl -s ifconfig.me)

FRONTEND_PORT=80 \
VITE_KEYCLOAK_URL=http://$EC2_PUBLIC_IP:9090 \
KEYCLOAK_HOSTNAME_URL=http://$EC2_PUBLIC_IP:9090 \
KEYCLOAK_ISSUER_URI=http://$EC2_PUBLIC_IP:9090/realms/FinancePortal \
docker compose up -d --build
```

Not: Public HTTP IP Web Crypto sorunu cikarabilecegi icin SSH tunnel daha pratik test cozumudur.

### Ders

Localhost tabanli ayarlar lokal Docker icin iyi, EC2 browser testi icin yanilticidir.

## 5. Registration Kapaliydi

### Belirti

Keycloak ekraninda:

```text
Registration not allowed
```

### Kok Neden

Realm export icinde:

```json
"registrationAllowed": false
```

### Gecici Cozum

Calisan Keycloak realm'inde registration ac:

```bash
docker exec finance_keycloak /bin/sh -c '
/opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user admin \
  --password admin

/opt/keycloak/bin/kcadm.sh update realms/FinancePortal \
  -s registrationAllowed=true
'
```

### Kalici Cozum

Realm export guncellendi:

```json
"registrationAllowed": true
```

Ek olarak `keycloak-bootstrap` one-shot container'i eklendi. Keycloak hazir oldugunda calisir ve mevcut realm uzerinde `registrationAllowed=true` ayarini tekrar uygular. Bu sayede realm daha once import edilmis olsa bile ayar otomatik duzeltilir.

### Ders

Realm import basarili olsa bile export icindeki login/register ayarlari demo akisini dogrudan etkiler.

## 6. USER Rolu Tanimliydi Ama Yeni Kullanicida Yoktu

### Belirti

Portfolio create islemi basarisiz oldu.

Backend log:

```text
resource_access: {account={roles=[manage-account, manage-account-links, view-profile]}}
```

Beklenen:

```text
resource_access: {finance-gateway-client={roles=[USER]}, account={...}}
```

### Kok Neden

Realm export icinde `finance-gateway-client` altinda `USER` ve `ADMIN` rolleri vardi. Fakat `default-roles-financeportal` composite role'u yeni kullaniciya `finance-gateway-client.USER` rolunu otomatik vermiyordu.

### Gecici Cozum

Mevcut kullaniciya `USER` rolunu ekle:

```bash
docker exec finance_keycloak /bin/sh -c '
/opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user admin \
  --password admin

/opt/keycloak/bin/kcadm.sh add-roles \
  -r FinancePortal \
  --uusername <username> \
  --cclientid finance-gateway-client \
  --rolename USER
'
```

Yeni kayit olan kullanicilara otomatik `USER` gelsin:

```bash
docker exec finance_keycloak /bin/sh -c '
/opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user admin \
  --password admin

/opt/keycloak/bin/kcadm.sh add-roles \
  -r FinancePortal \
  --rname default-roles-financeportal \
  --cclientid finance-gateway-client \
  --rolename USER
'
```

Komuttan sonra logout/login gerekir. Eski token icinde rol gorunmez.

### Kalici Cozum

Realm export icinde `default-roles-financeportal` composite role'una su mapping eklendi:

```json
"finance-gateway-client": [
  "USER"
]
```

Ek olarak `keycloak-bootstrap` one-shot container'i mevcut realm icin:

- `default-roles-financeportal` role'una `finance-gateway-client.USER` rolunu ekler.
- Mevcut kullanicilara da `USER` rolunu uygulamaya calisir.

Bu nedenle yeni kullanicilar ve daha once olusturulmus kullanicilar manuel role assignment gerektirmeden calisabilir. Rol token'a yansisin diye kullanicinin logout/login yapmasi yine gerekir.

### Ders

Rolun tanimli olmasi yetmez. Yeni kullaniciya default olarak atanmasi icin composite/default role mapping gerekir.

## 7. OTLP / Grafana Hatalari

### Belirti

Loglarda `OtlpMeterRegistry` stack trace goruldu.

### Kok Neden

Remote observability sunucusu kapali veya ulasilamaz durumda. Metric export denemeleri hata uretiyor.

### Etki

Ana uygulama akisini bozmaz. Sadece metric/trace export basarisiz olur ve log kirliligi olusur.

### Ders

Demo ortaminda observability endpointleri opsiyonel olmali veya export hatalari daha sessiz hale getirilmeli.

## 8. Security Group Notlari

EC2 uzerinde container portlari host'a publish ediliyor. AWS Security Group dogru ayarlanmazsa servisler public internete acilabilir.

Public acilmamasi gereken portlar:

```text
5432 PostgreSQL
6379 Redis
389  LDAP
636  LDAPS
8085 phpLDAPadmin
9200 Elasticsearch
5601 Kibana
3000 Grafana
4317 OTLP gRPC
4318 OTLP HTTP
```

Test icin acilabilecek portlar:

```text
22   sadece kendi IP
80   demo gerekiyorsa
5173 sadece FRONTEND_PORT=80 kullanilmiyorsa
8080 sadece kendi IP
9090 sadece kendi IP
```

### Ders

Docker Compose port publish etse bile asil dis erisim AWS Security Group ile sinirlanmalidir.

## 9. News Service Kontrolu

### Belirti

`docker ps` ciktisinda `news-service` gorunmedi.

### Yapilacak Kontrol

```bash
docker compose ps -a
docker compose logs --tail=100 news-service
```

### Ders

`docker ps` sadece ayakta olan container'lari gosterir. Dusen servisleri gormek icin `docker compose ps -a` kullanmak gerekir.

## 10. LDAP Icinde Kullanici Gorunmedi

### Belirti

EC2 uzerinde OpenLDAP container icinde sorgu calistirildi:

```bash
docker exec finance_openldap ldapsearch \
  -x \
  -H ldap://localhost \
  -D "cn=admin,dc=finance,dc=local" \
  -w admin \
  -b "dc=finance,dc=local" \
  "(objectClass=person)" \
  cn uid mail sn givenName
```

Cikti:

```text
result: 0 Success
numResponses: 1
```

Bu sonuc sorgunun basarili oldugunu ama LDAP icinde `person` objesi bulunmadigini gosterir.

### Kok Neden

OpenLDAP container calisiyor, fakat Keycloak realm export icinde LDAP user federation provider tanimi yok. Bu nedenle Keycloak yeni kayit olan kullanicilari LDAP'e yazmiyor; kendi PostgreSQL database'i icinde tutuyor.

Backend servisleri de kullaniciyi LDAP'ten okumuyor. JWT geldikten sonra `UserService` kullaniciyi finance/news servislerinin kendi `users` tablolarinda lazy-create ediyor.

### Etki

Bu durum uygulamanin login/portfolio/news akisini bozmaz. Kullanici kimligi Keycloak token'i ile gelir, backend kendi tablosuna kullanici kaydini olusturur.

LDAP sadece container olarak ayakta duruyor; aktif user federation veya write-back akisi yok.

### Cozum Secenekleri

Secenek 1: Mevcut durumu dokumante et.

- Keycloak kullanicilari PostgreSQL'de tutar.
- LDAP bu teslimde aktif user store degildir.

Secenek 2: Keycloak LDAP federation ekle.

- Keycloak Admin Console -> `User federation` -> `ldap`
- Connection URL: `ldap://openldap:389`
- Bind DN: `cn=admin,dc=finance,dc=local`
- Bind credential: `admin`
- Users DN: `dc=finance,dc=local`
- Edit mode: ihtiyaca gore `WRITABLE` veya `READ_ONLY`
- Vendor: `Other`
- Username LDAP attribute: `uid`
- RDN LDAP attribute: `uid`
- UUID LDAP attribute: `entryUUID`
- User object classes: `inetOrgPerson, organizationalPerson`

Secenek 3: LDAP seed dosyasi ekle.

- OpenLDAP'e baslangic kullanicilari LDIF ile import edilir.
- Bu durumda Keycloak federation gerekir; aksi halde LDAP'teki kullanicilar login akisi icin kullanilmaz.

### Ders

LDAP container'in ayakta olmasi, Keycloak'in LDAP'e kullanici yazdigi anlamina gelmez. Bunun icin realm export icinde user federation provider ve mapper ayarlari gerekir.

## 11. Keycloak Theme Default Geldi

### Belirti

EC2 uzerinde Keycloak login/register ekrani custom `finance` temasi yerine default Keycloak temasiyla acildi.

### Kok Neden

Tema dosyalari container'a mount ediliyordu:

```text
./keycloak/themes:/opt/keycloak/themes
```

Fakat realm export icinde login theme secimi yoktu. Bu nedenle Keycloak realm import edilse bile `loginTheme` default kaldi.

### Kalici Cozum

Realm export'a su alan eklendi:

```json
"loginTheme": "finance"
```

Ek olarak `keycloak-bootstrap` container'i her acilista mevcut realm icin su ayari uygular:

```bash
kcadm.sh update realms/FinancePortal -s registrationAllowed=true -s loginTheme=finance
```

Bu sayede realm daha once import edilmis olsa bile login theme otomatik `finance` olarak duzeltilir.

### EC2 Uzerinde Manuel Kontrol

```bash
docker exec finance_keycloak /bin/sh -c '
/opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user admin \
  --password admin

/opt/keycloak/bin/kcadm.sh get realms/FinancePortal --fields loginTheme,registrationAllowed
'
```

### Ders

Theme dosyalarini mount etmek tek basina yetmez. Realm ayarinda `loginTheme` olarak ilgili tema adi secilmelidir.

## Genel Kalici Aksiyonlar

- [x] `keycloak` database init script eklendi.
- [x] Realm export'ta registration acildi.
- [x] Realm export'ta default `USER` role mapping eklendi.
- [x] Postgres bootstrap container eklendi.
- [x] Keycloak bootstrap container eklendi.
- [x] Realm export ve bootstrap icinde `loginTheme=finance` ayari eklendi.
- [ ] EC2 README bolumune Docker/Compose kurulum notu eklenebilir.
- [ ] Demo icin HTTPS/domain kurulumu yapilabilir.
- [ ] Observability export'u remote sunucu yokken daha sessiz hale getirilebilir.
- [ ] News service dusme sebebi logdan incelenmeli.
- [ ] LDAP aktif kullanilacaksa Keycloak LDAP federation export'a eklenmeli veya LDAP'in sadece demo container oldugu dokumante edilmeli.
