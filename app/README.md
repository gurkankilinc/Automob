# Automob — Frontend (Faz 1 Prototip)

Oto servisler için araç bakım takibi: sarı **tel kafes (wireframe)** 3D araç sahnesi,
km/tarih bazlı bakım hatırlatmaları, üstten görünüm kaporta/boya durumu paneli ve
rol bazlı (işletme/müşteri) erişim. Konsept: [`../KONSEPT.md`](../KONSEPT.md).

## Çalıştırma

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # TypeScript tip kontrolü
npm run build    # üretim derlemesi (dist/)
```

### Backend

Kotlin/Ktor API'si [`../server`](../server) altındadır (bkz. o dizinin README'si).
Açıkken uygulama açılışta veriyi API'den çeker; başlıktaki rozet **API bağlı** olur.
Kapalıysa yerel tohum veriyle **çevrimdışı** çalışır. API adresi `VITE_API_BASE`
ortam değişkeniyle değiştirilebilir (varsayılan `http://localhost:8080/api`).

Demo hesapları (backend README'sinde detaylı): `servis@ustamotors.com` / `servis123`
(işletme) ve `musteri@example.com` / `musteri123` (müşteri).

## Özellikler

- **3D tel kafes sahne** — Three.js; sedan/hatchback/SUV kasa tipleri, kamera ön
  ayarları (yan/ön/üst/orbit), bölgeye dokununca vurgu + etiket.
- **Bakım bölgeleri** — motor/ön fren/arka amortisör; işlem/öneri durumu.
- **Kaporta durumu** — üstten görünüm SVG paneli (13 panel), 4 durum
  (orijinal/lokal boyalı/boyalı/değişen), tıkla-değiştir.
- **Boya özelleştirme** — kaput/kapılar/bagaj/gövde ayrı ayrı, 10 renk.
- **Km/tarih bazlı bakım hatırlatmaları** — backend çevrimdışıyken de yerel hesap.
- **Katalog + işlem sepeti + fotoğraf yükleme** — servis kaydı oluşturma akışı.
- **Müşteri raporu** — beyaz-etiket, yazdırılabilir/PDF.
- **Kimlik doğrulama** — JWT, işletme (tam erişim) / müşteri (salt kendi aracı, salt okuma) rolleri.
- **Açık/koyu tema** — varsayılan açık; 3D sahne kromu her zaman koyu kalır.

## Yapı

```
src/
  main.ts                  — DOM bağlantıları, sekme/tema/oturum yönetimi
  style.css                 — açık/koyu tema token sistemi, tüm bileşen stilleri
  api/client.ts             — backend istemcisi (JWT header, upload)
  state/
    store.ts                — sepet, geçmiş, hatırlatmalar, kaporta durumu (pub-sub)
    auth.ts                 — oturum (localStorage token, login/logout)
    theme.ts                — açık/koyu tema tercihi
  domain/reminders.ts       — bakım hatırlatma hesap mantığı (backend ile birebir)
  data/                     — katalog, bakım kuralları, kaporta panel tanımları
  scene/
    AutomobScene.ts         — Three.js sahnesi: kamera, OrbitControls, raycast, boya rengi
    carWireframe.ts         — kasa tipine göre tel kafes geometrisi + boya bölgesi sınıflandırması
    regions.ts / callouts.ts / palette.ts
  ui/                        — servis paneli, müşteri görünümü, kaporta paneli, modallar, rapor
```

## Tasarım kararları (özet)

- **Sarı yalnızca aracın dilidir** — arayüz nötr/tema-değişken; sarı ve 3D sahne kromu sabit.
- Çizgi hiyerarşisi: ana kontur / yapı / ince detay (`LineSegments2`).
- Yazı tipleri: **Chakra Petch** (başlık), **Exo 2** (gövde), **JetBrains Mono** (veri) —
  `@fontsource` ile gömülü, Türkçe tam destekli.
- `prefers-reduced-motion`: otomatik tur, nabız ve geçiş animasyonları kapanır.

## Sonraki adımlar

- Kaput/kapı/bagajın menteşeli açılıp kapanması + "kaput açık" kamera modu.
- Kaporta durumunun backend'e kalıcı yazılması (şu an oturum içi/yerel).
- Self-servis müşteri kaydı, çoklu araç desteği.
