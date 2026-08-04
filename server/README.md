# Automob — Backend (Kotlin + Ktor)

Faz 1 REST API'si: araç dosyası, bakım kalemi kataloğu, servis geçmişi ve kayıt
oluşturma. Veri **SQLite** dosyasında (Exposed ORM) kalıcı tutulur — sunucu
yeniden başlasa da kayıtlar kaybolmaz. Çalıştırılan dizinde `automob.db` dosyası
oluşur (ilk çalıştırmada boşsa demo verisiyle doldurulur, `.gitignore`'da).

Neden SQLite: sunucu kurulumu gerektirmeyen, dosya tabanlı, gerçek bir
veritabanı — prototip aşamasında PostgreSQL kurup yönetmek gereksiz bir
operasyonel yük. Exposed katmanı sayesinde ileride Postgres'e geçiş yalnızca
`DatabaseFactory.kt`'deki bağlantı satırını ve sürücü bağımlılığını değiştirmek;
`Repository` arayüzü ve üstündeki her şey aynı kalır.

## Çalıştırma

JDK 11+ gerekir. Gradle wrapper projeyle birlikte gelir.

```bash
./gradlew run          # http://localhost:8080  (PORT ile değiştirilebilir)
./gradlew build        # derleme + testler
./gradlew test         # yalnız testler
```

Windows'ta JDK yolu `gradle.properties` içinde `org.gradle.java.home` ile sabitlenmiştir
(gerekirse kendi JDK 11+ yolunuzla güncelleyin).

## Uç noktalar

| Metot | Yol | Açıklama |
|------|-----|----------|
| GET  | `/api/health` | Sağlık kontrolü |
| GET  | `/api/service` | Servis işletmesi bilgisi (rapor başlığı) |
| GET  | `/api/catalog` | Bölge → bakım kalemi kataloğu + etiketler |
| GET  | `/api/customers` | Müşteri arama listesi (`?q=` — ID/ad/plaka alt dizesi) — yalnızca `isletme` |
| GET  | `/api/customers/{customerId}` | Müşteri ID'sinden araç dosyası — yalnızca `isletme` |
| GET  | `/api/vehicles/{plate}` | Araç dosyası |
| GET  | `/api/vehicles/{plate}/records` | Servis geçmişi (yeniden eskiye) |
| GET  | `/api/vehicles/{plate}/suggestions` | Bekleyen öneriler |
| GET  | `/api/vehicles/{plate}/reminders` | Km/tarih bazlı bakım hatırlatmaları |
| GET  | `/api/vehicles/{plate}/panels` | Kaporta/boya durumu (kayıtsız panel = `orijinal`) |
| PUT  | `/api/vehicles/{plate}/panels/{panelId}` | Panel durumu yaz (gövde: `{ state, note? }`) — yalnızca `isletme` |
| POST | `/api/vehicles/{plate}/records` | Yeni servis kaydı (gövde: `{ km, items[] }`) |
| POST | `/api/auth/login` | Giriş (gövde: `{ email, password }`) → JWT |
| GET  | `/api/auth/me` | Geçerli oturumun bilgisi |
| POST | `/api/uploads` | Fotoğraf yükleme (multipart, alan adı `file`) — yalnızca `isletme` |

`/api/health`, `/api/service`, `/api/catalog` ve `/api/auth/*` dışındaki tüm
`/api/vehicles/**` ve `/api/uploads` uç noktaları **JWT gerektirir**
(`Authorization: Bearer <token>`).

## Kimlik doğrulama ve yetkilendirme

İki rol: **`isletme`** (usta/danışman — tüm araçlara tam erişim, kayıt/fotoğraf
yazabilir) ve **`musteri`** (yalnızca kendi aracını görüntüler, yazamaz).
Sahiplik `vehicles.owner_email` ile eşleştirilir; bir müşteri başka bir aracın
plakasını denerse `403` döner (`Routing.kt` → `vehicleAccess()`).

Demo hesapları (ilk açılışta boşsa otomatik oluşturulur):

| E-posta | Şifre | Rol |
|---|---|---|
| `servis@ustamotors.com` | `servis123` | isletme |
| `musteri@example.com` | `musteri123` | musteri (34ABC123'ün sahibi) |

Şifreler jBCrypt ile hash'lenir. JWT süresi 7 gün (prototip kolaylığı).

**NOT:** `AuthConfig.kt`'deki JWT secret sabit kodlanmıştır — yalnızca yerel
prototip için. Üretime giderken ortam değişkenine taşınmalı.

## Fotoğraf yükleme

`POST /api/uploads` çok parçalı (multipart) bir görsel dosyası alır, `uploads/`
klasörüne (`.gitignore`'da) UUID adıyla kaydeder ve `/uploads/{ad}` yolunu
döner; bu yol `staticFiles("/uploads", ...)` ile doğrudan servis edilir. Azami
boyut 8 MB, yalnızca `image/*` içerik türü kabul edilir — bu basit bir sınır,
üretim sertleştirmesi değildir (virüs taraması, CDN, boyutlandırma yok).

Servis kaydındaki her kalem artık `photos: string[]` taşıyabilir
(`record_items.photos_json` — JSON dizisi olarak saklanır).

## Kaporta / boya durumu

`body_panels` tablosu araç başına panel durumunu tutar (13 panel × 4 durum:
`orijinal` · `lokal-boyali` · `boyali` · `degisen`). `(vehicle_plate, panel_id)`
üzerinde tekil indeks vardır; yazma bir **upsert**'tir. Kayıt bulunmayan panel
istemci tarafında `orijinal` sayılır — yani "hepsi orijinal" durumu sıfır satır
demektir.

Ekspertiz niteliğinde bir veri olduğu için `updated_at` / `updated_by` birlikte
saklanır: bir panelin ne zaman ve hangi kullanıcı tarafından işaretlendiği
sonradan tartışma konusu olabilir. Geçerli panel kimlikleri `BODY_PANEL_IDS`
ile sınırlıdır (frontend'deki `src/data/bodyPanels.ts` ile birebir eşleşir);
bilinmeyen kimlik veya geçersiz durum değeri `400` ile reddedilir.

## Bakım hatırlatmaları

`MaintenanceRules.kt` içindeki sabit kural listesi (motor yağı, triger, balata,
fren hidroliği, amortisör, rot balans — her biri km ve/veya ay aralığıyla) servis
geçmişiyle eşleştirilir: her kural için geçmişteki en yeni eşleşen kalem "son
yapılan" kabul edilir ve bir sonraki bakım km/tarihi hesaplanır. Eşleşme yoksa
durum `bilinmiyor` döner (araç için hiç kayıt yok demektir).

Durumlar: `guncel` · `yaklasiyor` (≤1000 km veya ≤30 gün) · `gecikti` (aşıldı) ·
`bilinmiyor`. Bu kural seti frontend'deki `src/data/maintenanceRules.ts` ile
birebir eşleşmelidir — backend çevrimdışıyken tarayıcı aynı hesabı yerel olarak
yapar (bkz. `src/domain/reminders.ts`).

`{plate}` boşluk/duyarsız: `34ABC123` = `34 ABC 123`.

CORS, Vite dev sunucusuna (`localhost:5173`) açıktır. Frontend `VITE_API_BASE`
tanımlı değilse `http://localhost:8080/api` adresini kullanır ve backend
kapalıysa yerel tohum veriyle çevrimdışı çalışır.

## Yapı

```
src/main/kotlin/com/automob/
  Application.kt       — embeddedServer, eklentiler (JSON, CORS, Authentication/JWT, StatusPages, CallLogging)
  AuthConfig.kt         — JWT secret/issuer + token üretimi
  AuthRoutes.kt          — /api/auth/login, /api/auth/me
  DatabaseFactory.kt   — SQLite bağlantısı, şema göçü (createMissingTablesAndColumns), boşsa demo veri ekleme
  Tables.kt            — Exposed tablo tanımları (vehicles, service_records, record_items, suggestions, users, body_panels)
  Repository.kt        — veri erişimi (transaction { } içinde Exposed DSL) + reminders() hesabı
  Routing.kt           — uç nokta tanımları + JWT yetkilendirme kontrolleri + /api/uploads
  Models.kt            — @Serializable DTO'lar (frontend TS ile eşleşir) — DB tablolarından ayrı katman
  MaintenanceRules.kt  — bakım hatırlatma kuralları
```

Katalog (`Catalog`) ve servis işletmesi bilgisi (`ServiceInfo`) bilinçli olarak
veritabanına değil `Repository` içinde sabit değer olarak tutulur — bunlar
kullanıcı verisi değil, uygulama konfigürasyonu.

## Sonraki adımlar

- Self-servis müşteri kaydı (şu an yalnızca 2 demo hesap var, register uç noktası yok).
- Fotoğraf silme/nesne depolama (S3 vb.) — şu an yerel diske yazılıyor.
- Gerçek ölçekte PostgreSQL'e geçiş (bkz. yukarıdaki not).
- Çoklu işletme (multi-tenant) — şu an tek işletme tüm araçları görür.
