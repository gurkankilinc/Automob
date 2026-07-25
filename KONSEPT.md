# Automob — Konsept Dokümanı

**Sürüm:** 0.1 (fikir aşaması) · **Tarih:** 14 Temmuz 2026

---

## 1. Özet

**Automob**, oto servis ve tamirhanelerin bir aracın bakım ve parça değişim geçmişini,
müşteriye **dönebilen 3D bir araç şeması** üzerinde görselleştirerek anlatmasını sağlayan
bir araç bakım takip uygulamasıdır.

Aracın 3D şeması **sarı** renkte çizilir; **değişen veya arızalı parçalar koyu sarı** ile
vurgulanır ve her birinin yanından çıkan bir **ok/etiket** parçanın ne olduğunu açıklar.
Müşteri şemayı döndürerek her açıdan inceleyebilir.

> Asansör konuşması: *"Ustanın 'triger setini değiştirdik, ön balatalar da bitmek üzere'
> demesi yerine — müşteri, aracının 3D modelinde tam olarak neyin değiştiğini ve neyin
> yaklaştığını kendi gözüyle görür."*

---

## 2. Problem

1. **Müşteri ne yapıldığını anlamıyor.** Servis çıkışında müşteriye uzun bir fatura ve
   sözlü bir açıklama verilir; teknik terimler çoğu müşteri için anlamsızdır. Bu,
   güvensizlik ve "gereksiz parça değiştirildi mi?" şüphesi doğurur.
2. **Bakım geçmişi dağınık.** Aracın geçmişi fatura tomarlarında, ustanın hafızasında
   veya en iyi ihtimalle bir Excel'dedir. Araç el değiştirdiğinde ya da servis
   değiştirildiğinde geçmiş kaybolur.
3. **Periyodik bakım kaçıyor.** Ne müşteri ne servis, "10.000 km'de yağ, 60.000 km'de
   triger" takibini sistematik yapabiliyor. Servis için kaçan iş, müşteri için risk demek.
4. **Servisler kendini farklılaştıramıyor.** Şeffaf ve modern bir deneyim sunan servis,
   müşteri sadakatinde ciddi avantaj kazanır; ama bunun için araç yok.

## 3. Çözüm

Automob üç şeyi tek üründe birleştirir:

- **Görsel anlatım:** 3D araç şeması, yapılan/gereken işlemlerin evrensel dili olur.
  Teknik bilgi gerektirmez — koyu sarı bölge + ok + açıklama.
- **Dijital araç dosyası:** Her aracın tüm işlem geçmişi tarih/km bazlı tek bir zaman
  çizelgesinde durur; araç ve müşteri hesabına bağlıdır, kaybolmaz.
- **Proaktif takip:** Km/tarih bazlı bakım hatırlatmaları hem servise (iş fırsatı) hem
  müşteriye (araç sağlığı) gider.

---

## 4. Kullanıcılar ve Roller

### Servis işletmesi (veri giren + kullanan taraf)
- Müşteri ve araç kaydı açar (plaka/şasi ile).
- İşlem kaydeder: 3D şemada bölgeye dokunur, o bölgenin hazır bakım kalemi listesinden
  işlemi seçer; fotoğraf, not ve fiyat ekleyebilir.
- Bakım geçmişini görüntüler, müşteriye servis çıkışında ekranda anlatır.
- Servis sonunda müşteriye rapor (link/PDF) gönderir.
- Yaklaşan bakım hatırlatmalarını görür, müşteriyi arayıp randevuya çevirebilir.

### Müşteri (görüntüleyen taraf)
- Kendi hesabıyla girer; kendisine ait **araçları** listeler.
- Her aracın **son işlemlerini** ve tam bakım geçmişini görür.
- Aracının **3D şemasını** döndürerek inceler: hangi parça değişmiş, hangisi arızalı,
  ne zaman ve kaç km'de yapılmış.
- Yaklaşan bakım hatırlatmaları alır.

> Not: Bir müşterinin birden fazla aracı, bir aracın zaman içinde birden fazla işlem
> kaydı olabilir. Araç dosyası araca aittir; sahibi değişse de geçmiş korunabilir
> (ileride "geçmiş devri" özelliği).

---

## 5. 3D Araç Şeması — Ürünün Kalbi

### Görsel dil
- Araç, **sarı tel kafes (wireframe) 3D model** olarak çizilir — CAD teknik çizimi
  estetiği: gövde dolu yüzeyler yerine ince sarı çizgilerle tanımlanır; koltuklar, motor,
  süspansiyon gibi iç yapı, gövdenin içinden soluk çizgilerle görünür (gerçekçi render
  değil). Bu sayede ayrı bir "içini göster" moduna gerek kalmaz.
- **Değişen veya arızalı parça/bölge koyu sarı dolu** renkte vurgulanır — çizgi ağının
  içinde dolu tek renk olarak doğal biçimde öne çıkar.
- Teknik not: tel kafes görünüm, 3D modelin kenar geometrisinden (edge/wireframe
  materyal) otomatik üretilebilir; her kasa tipine aynı estetiği vermek ek maliyet
  gerektirmez.
- Vurgulu bölgeden bir **ok (callout çizgisi)** çıkar; ucundaki etikette parçanın adı ve
  kısa durum bilgisi yazar (örn. *"Ön fren balataları — değiştirildi, 12.03.2026, 84.500 km"*).
- Model **serbestçe döndürülebilir** ve yakınlaştırılabilir; bölgeye dokununca detay
  paneli açılır.

### Model kapsamı
- **Kasa tipine göre 4-6 jenerik model:** sedan, hatchback, SUV, station wagon, ticari
  (panelvan), pick-up. Müşterinin aracına "yeterince benzer" görünür; marka-model bazlı
  gerçek modeller ileriki sürüm hedefidir.

### Detay seviyesi: Bölge + bakım kalemleri
- Araç, önceden tanımlı **bölgelere** ayrılır: motor bölgesi, ön fren, arka fren, ön
  süspansiyon, arka süspansiyon, şanzıman/aktarma, egzoz, elektrik/akü, klima, yakıt
  sistemi, kaporta panelleri (kapı, çamurluk, tampon, kaput...), camlar, lastikler/jantlar.
- Her bölgenin altında yaygın **bakım kalemleri kataloğu** bulunur: motor yağı, yağ/hava/
  polen/yakıt filtresi, balata, disk, amortisör, triger seti, V kayışı, akü, buji,
  antifriz, fren hidroliği, lastik değişimi/rot-balans vb.
- Kalem seviyesindeki her kayıt, 3D'de bağlı olduğu bölgeyi vurgular.

### Parça/bölge durumları
| Durum | Renk | Anlam |
|---|---|---|
| Normal | Sarı (taban) | Kayıtlı sorun yok |
| Değiştirildi / arızalı | Koyu sarı | Bu serviste işlem yapıldı veya arıza tespit edildi |

*(İleride ayrışabilir: "arızalı/değişmesi önerilen" ile "değiştirildi" için iki ayrı ton,
ve "bakımı yaklaşıyor" için bir ara ton — v2 tasarım kararı.)*

---

## 6. MVP Özellikleri (v1)

1. **Araç + müşteri kaydı** — plaka/şasi ile araç, iletişim bilgileriyle müşteri; müşteri
   hesabı araçlarına bağlanır.
2. **3D şema ve bölge işaretleme** — kasa tipi seçilir, işlemler şemada vurgulanır.
3. **İşlem kaydı (servis kaydı)** — girişte km yazılır; işlem kalemleri şu yollarla eklenir:
   - 3D üzerinden bölge seçimi → bölgenin kalem listesinden seçim,
   - **hazır işlem şablonları** (örn. "Periyodik bakım 10.000 km" tek tıkla yağ + 3 filtre),
   - her kaleme **fotoğraf**, **serbest not** ve **parça/işçilik ücreti** eklenebilir.
4. **Bakım geçmişi zaman çizelgesi** — araç bazında tarih/km sıralı tüm işlemler; her
   kayıt 3D görünümüyle ilişkili.
5. **Müşteriye rapor paylaşımı** — servis çıkışında link/PDF: 3D görünüm, yapılan
   işlemler, fotoğraflar, tutarlar.
6. **Bakım hatırlatmaları** — kalem bazlı km/süre kuralları (örn. yağ: 10.000 km veya
   1 yıl); yaklaşan bakım hem servise hem müşteriye bildirilir.

### v1 kapsam DIŞI (bilinçli olarak)
Randevu yönetimi, parça envanteri/stok, muhasebe-fatura entegrasyonu, çoklu şube,
marka-modele özel 3D modeller, OBD/arıza kodu entegrasyonu, ekspertiz (boya/değişen)
raporu modu. Bunlar yol haritasında (bkz. §9).

---

## 7. Platform ve Teknoloji Yaklaşımı

- **Servis tarafı:** Web paneli (masaüstü + tablet). 3D için WebGL/Three.js — tarayıcıda
  olgun, kurulumsuz.
- **Müşteri tarafı:** Mobil uygulama (cross-platform: Flutter veya React Native) +
  rapor linklerinin tarayıcıda da açılabilmesi (uygulama indirmeyen müşteri için).
- **Ortak altyapı:** Tek backend API; 3D sahne bileşeni web ve mobilde ortak kullanılacak
  şekilde tasarlanır (WebView/ortak WebGL bileşeni ya da platform bileşeni — prototipte
  netleşecek teknik karar).
- **Fikir aşaması notu:** Prototip yalnızca web üzerinde yapılır (tek kod tabanı, hızlı
  doğrulama); mobil uygulama konsept doğrulandıktan sonra başlar.

## 8. Veri Modeli (yüksek seviye)

- **İşletme** → kullanıcıları (usta/danışman/yönetici) olan servis hesabı
- **Müşteri** → hesap; bir müşterinin *n* aracı olur
- **Araç** → plaka/şasi, marka/model/yıl, **kasa tipi** (3D model seçimi), güncel km
- **Bölge & Bakım Kalemi kataloğu** → sistem geneli sabit sözlük; 3D vurgu eşlemesi burada
- **Servis Kaydı (işlem)** → araç + tarih + km; altında **işlem kalemleri** (katalog
  kalemi + durum + not + fiyat + fotoğraflar)
- **Hatırlatma kuralı** → kalem bazlı km/süre aralığı → yaklaşan bakım bildirimi

## 9. Yol Haritası

| Faz | Hedef | İçerik |
|---|---|---|
| **0 — Doğrulama** | Fikri sahada test et | Bu doküman + 3-5 servisle görüşme; basit 3D görsel taslakla tepki ölçümü |
| **1 — Prototip** | Çekirdek deneyimi kanıtla | Tek jenerik 3D model, web'de: araç kaydı → bölge işaretleme → rapor görünümü. Veri tabanı bile şart değil; amaç "vay be" anı |
| **2 — MVP (v1)** | İlk gerçek serviste kullanım | §6'daki tüm özellikler, kasa tipi modelleri, çok kullanıcılı işletme hesabı |
| **3 — Müşteri mobil** | Müşteri tarafını büyüt | Mobil uygulama, bildirimler, çoklu araç |
| **4 — Genişleme** | Ürünleşme | Randevu, envanter, ekspertiz modu, marka-model modelleri, OBD, B2B SaaS modeli kararı |

## 10. Riskler ve Açık Sorular

- **Veri girişi alışkanlığı:** Ustalar yoğunlukta veri girmeyi atlarsa ürün değersizleşir.
  Panzehir: 3D'den dokunarak seçim + şablonlar ile girişin 30 saniyeden kısa sürmesi.
  *(Prototipte gerçek bir ustayla test edilecek.)*
- **3D model üretimi:** Jenerik modellerin temini/üretimi (hazır asset mi, sıfırdan mı)
  ve bölge parçalamasının (mesh ayrımı) iş yükü — Faz 1'de netleşecek.
- **Bölge-kalem kataloğunun kapsamı:** Çok dar olursa "benim işlemim listede yok",
  çok geniş olursa seçim yorucu. İlk katalog gerçek servis fişlerinden çıkarılmalı.
- **Açık soru:** Araç el değiştirdiğinde geçmiş devri nasıl olacak (KVKK boyutu dahil)?
- **Açık soru:** Rapor linki herkese açık mı, süreli mi, müşteri hesabına mı kilitli?

## 11. Başarı Ölçütleri (fikir aşaması için)

- Görüşülen servislerin en az yarısının "bunu kullanırım" demesi,
- Prototipte bir işlem kaydının **< 1 dakikada** girilebilmesi,
- Rapor gösterilen müşterilerin işlemi anlamada belirgin fark hissetmesi (basit anket).
