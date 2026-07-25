# Automob

Oto servisler ve tamirhaneler için araç bakım/parça takip uygulaması. Arayüzün
kalbi, dönebilen **sarı bir tel kafes (wireframe) 3D araç şeması** — değişen veya
arızalı parçalar koyu sarı ile vurgulanır. Fikrin arka planı ve ürün kararları için
[`KONSEPT.md`](KONSEPT.md) dosyasına bakın.

> Faz 1 prototipi — aktif geliştirme aşamasında.

## Repo yapısı

```
Automob/
  app/       — frontend (TypeScript + Vite + Three.js)
  server/    — backend (Kotlin + Ktor + Exposed/SQLite)
  KONSEPT.md — ürün konsept dokümanı
```

İki alt proje ayrı ayrı çalıştırılır ve geliştirilir; her birinin kendi `README.md`'si
kurulum, mimari ve uç nokta detaylarını anlatır:

- **[app/README.md](app/README.md)** — 3D sahne, kaporta paneli, hatırlatmalar, kimlik doğrulama arayüzü
- **[server/README.md](server/README.md)** — REST API, veritabanı, kimlik doğrulama, fotoğraf yükleme

## Hızlı başlangıç

Backend ve frontend ayrı terminallerde, ikisi de yerelde çalışır:

```bash
# 1) Backend (JDK 11+ gerekir)
cd server
./gradlew run          # http://localhost:8080

# 2) Frontend (ayrı terminalde)
cd app
npm install
npm run dev             # http://localhost:5173
```

Tarayıcıda `http://localhost:5173` açılınca demo hesaplarından biriyle giriş
yapılabilir (detaylar [server/README.md](server/README.md#kimlik-doğrulama-ve-yetkilendirme)):

| E-posta | Şifre | Rol |
|---|---|---|
| `servis@ustamotors.com` | `servis123` | İşletme — tam erişim |
| `musteri@example.com` | `musteri123` | Müşteri — yalnızca kendi aracı, salt okuma |

Backend kapalıyken de frontend yerel tohum veriyle çevrimdışı çalışır.

## Teknoloji

| Katman | Teknoloji |
|---|---|
| Frontend | TypeScript, Vite, Three.js |
| Backend | Kotlin, Ktor, Exposed (ORM) |
| Veritabanı | SQLite (dosya tabanlı, kalıcı) |
| Kimlik doğrulama | JWT (jBCrypt şifre hash'leme) |

## Durum

Faz 1 kapsamı: araç dosyası + 3D bölge işaretleme, bakım kataloğu + işlem sepeti,
km/tarih bazlı hatırlatmalar, kaporta/boya durumu paneli, fotoğraf yükleme, müşteri
raporu (yazdırılabilir), rol bazlı kimlik doğrulama, açık/koyu tema. Yol haritası ve
sonraki adımlar için [`KONSEPT.md`](KONSEPT.md) ve alt proje README'lerindeki
"Sonraki adımlar" bölümlerine bakın.
