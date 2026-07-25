# Veritabanı — Mevcut Durum ve Yol Haritası

Bu not, prototipin bugünkü şemasını olduğu gibi kayda geçirir, gerçek kullanıma
giderken **ne zaman neyin kırılacağını** işaretler ve bir göç sırası önerir.
Amaç şemayı bugün baştan yazmak değil; hangi kararın ne kadar süre taşıyacağını
bilerek ilerlemek.

> Durum: Faz 1 prototipi · SQLite (dosya) + Exposed ORM · tek işletme varsayımı

---

## 1. Bugünkü şema

```
vehicles(plate PK, display_plate, model, year, vin, body_type,
         km, next_service_km, last_service_km, owner, phone, owner_email)
   │
   ├─< service_records(id PK, vehicle_plate FK, date, date_iso, km)
   │        └─< record_items(id PK, record_id FK, region, title, price, photos_json)
   ├─< suggestions(id PK, vehicle_plate FK, region, title, price, note)
   └─< body_panels(id PK, vehicle_plate FK, panel_id, state, note,
                   updated_at, updated_by)   ⟵ (vehicle_plate, panel_id) UNIQUE

users(id PK, email UNIQUE, password_hash, role, display_name)
```

Veritabanında **olmayan**, kodda sabit tutulanlar: bakım kalemi kataloğu ve
fiyatları (`Repository.catalog`), servis işletmesi bilgisi (`Repository.service`),
bakım hatırlatma kuralları (`MaintenanceRules.kt`), kaporta panel listesi
(`BODY_PANEL_IDS`). Bunlar bugün *uygulama konfigürasyonu* olduğu için bilinçli
tercih; çok işletmeli sürümde ilk üçü tabloya inmek zorunda (bkz. §3).

---

## 2. Kritik bulgular

Öncelik sırası, "ne zaman canımızı yakar" ölçütüne göre.

### 2.1 Şimdi düzeltilmeli (ucuz, sonra pahalı)

**FK kolonlarında indeks yok.** `service_records.vehicle_plate`,
`record_items.record_id`, `suggestions.vehicle_plate` indekssiz. SQLite yabancı
anahtarları otomatik indekslemez; bugün 5 kayıtla fark edilmiyor ama araç detay
sayfasının her açılışı tam tablo taraması. Tek satırlık düzeltme.

**Gösterim biçimi veritabanında.** `service_records` hem `date` ("12 Mar 2026",
Türkçe) hem `date_iso` tutuyor. Yerelleştirilmiş metin depolama katmanına
sızmış: dil değişirse veri yanlışlanır, tarihe göre sıralama/aralık sorgusu
`date` üzerinden çalışmaz. Tek `date` (DATE/ISO) yeterli, biçimleme sunum
katmanının işi.

**Türetilmiş alanlar çift kaynak.** `vehicles.next_service_km` /
`last_service_km` duruyor ama hatırlatmalar zaten `service_records`'tan
hesaplanıyor (`Repository.reminders`). İki kaynak er ya da geç çelişir. Ya
kolonları kaldır, ya hesabı tek yere sabitle.

### 2.2 Çok işletmeli (B2B SaaS) sürümden önce

**Kiracı (tenant) kavramı hiç yok.** KONSEPT Faz 4 "birden fazla servis abonelikle
kullanır" diyor; bugün `ServiceInfo` bir Kotlin sabiti ve *her* işletme kullanıcısı
*her* aracı görüyor (`vehicleAccess`: rol `isletme` ise koşulsuz `true`).
Gerekecek: `workshops` tablosu + `workshop_id` üzerinde `users`, `service_records`,
`suggestions`, katalog; ve yetki kontrolünde plaka değil **kiracı** filtresi.
Bu, sonradan eklenmesi en pahalı şey — her sorguya girer.

**Katalog ve fiyatlar kodda.** Her servisin kendi kalem listesi ve fiyatı olur.
`catalog_items(workshop_id, region, title, price, group)` gerekir. Not:
`record_items.price`'ın kaydın içinde durması **doğru** — o günkü fiyatın
anlık görüntüsü; katalog fiyatı sonradan değişince geçmiş fatura değişmemeli.

### 2.3 Gerçek veriyle üretime çıkmadan önce

**Plaka birincil anahtar.** `vehicles.plate` PK ve dört çocuk tablo ona
`ON UPDATE RESTRICT` ile bağlı. Yani plaka değişikliği (devir, yeni tescil,
düzeltme) veritabanı düzeyinde **imkânsız**. Kalıcı kimlik VIN/şasi'dir; plaka
zamanla değişen bir *nitelik*. Hedef: `vehicles(id PK, vin UNIQUE)` +
`vehicle_plates(vehicle_id, plate, valid_from, valid_to)`.

**Sahiplik zayıf ve tarihsiz.** `owner`, `phone`, `owner_email` düz metin;
`owner_email` `users`'a FK değil. KONSEPT'in açık sorusu olan "araç el
değiştirince geçmiş devri + KVKK" bu şemayla cevaplanamaz: önceki sahibin
kayıtlarını yeni sahibe göstermek/gizlemek için sahiplik **aralığı** gerekir →
`vehicle_owners(vehicle_id, user_id, from, to)`. Rapor/geçmiş erişimi bu
aralıkla kesişime göre verilir.

**Fotoğraflar JSON blob.** `record_items.photos_json` bir metin dizisi. Sonucu:
referans bütünlüğü yok, "bu aracın tüm fotoğrafları" sorgulanamaz, yükleyen/boyut/
MIME bilgisi yok ve `uploads/` klasöründe **öksüz dosyalar** birikir (kalem
silinince dosya kalır). Hedef: `photos(id, record_item_id FK, path, mime, bytes,
uploaded_by, created_at)`.

**Öneri (suggestion) yaşam döngüsü yok.** Durum alanı, oluşturulma zamanı,
"müşteri onayladı/reddetti" ve "hangi servis kaydı bunu karşıladı" bağı yok.
KONSEPT §04'teki "onayla / şimdi değil" akışı bunlar olmadan yazılamaz.

**Denetim izi eksik.** Yalnızca `body_panels` `updated_at/updated_by` taşıyor.
Servis kaydını kimin girdiği bilinmiyor — fatura niteliğindeki veride bu
gerekli. En az `created_at` + `created_by` her tabloya.

**Para `INT`.** Birim örtük (TL). Kuruş mu, TL mi, KDV dahil mi belirsiz.
Açıkça *minor unit* (kuruş) + `currency` + KDV alanı; ya da `DECIMAL`.

**Şema göçü aracı yok.** `SchemaUtils.createMissingTablesAndColumns` tablo ve
kolon *ekleyebilir*; **yeniden adlandırma, silme, tip değiştirme ve veri
dönüştürme yapamaz.** Yukarıdaki değişikliklerin çoğu tam da bunları gerektiriyor.
Üretimden önce Flyway (veya Liquibase) + sürümlenmiş SQL göçleri şart.

---

## 3. Hedef şema (özet)

```
workshops(id, name, tagline, phone)
users(id, workshop_id?, email UNIQUE, password_hash, role, display_name, created_at)

vehicles(id, vin UNIQUE, model, year, body_type, km, created_at)
vehicle_plates(id, vehicle_id, plate, valid_from, valid_to)      -- plaka geçmişi
vehicle_owners(id, vehicle_id, user_id, from_date, to_date)      -- sahiplik geçmişi

catalog_items(id, workshop_id, region, title, price_minor, group)

service_records(id, vehicle_id, workshop_id, service_date, km,
                created_by, created_at)
record_items(id, record_id, region, title, price_minor, catalog_item_id?)
photos(id, record_item_id, path, mime, bytes, uploaded_by, created_at)

suggestions(id, vehicle_id, workshop_id, region, title, price_minor, note,
            status, created_at, decided_at, fulfilled_by_record_id?)

body_panels(id, vehicle_id, panel_id, state, note, updated_at, updated_by)
   UNIQUE(vehicle_id, panel_id)
```

Kaporta durumu için not: bugünkü model *güncel durum*. Ekspertiz tartışmalarında
"ne zaman kim işaretledi" delil değeri taşıdığından, ileride
`body_panel_events(panel_id, state, note, at, by)` şeklinde **ekle-only** bir
kayıt defteri + güncel durumun ondan türetilmesi daha güçlü olur.

---

## 4. Göç sırası

1. **Şimdi:** FK indeksleri, `date` sadeleştirmesi, türetilmiş km kolonlarının
   kaldırılması. (Kırıcı değil, tek oturumluk iş.)
2. **Flyway'e geç.** Mevcut şemayı `V1__baseline.sql` olarak dondur; bundan
   sonraki her değişiklik sürümlü göç dosyası. Bu adım atlanırsa 3 ve 4 riskli.
3. **Kimlik düzeltmesi:** `vehicle_id` + VIN'e geçiş, `vehicle_plates` /
   `vehicle_owners`, `photos` tablosu, `suggestions` yaşam döngüsü, denetim
   alanları.
4. **Çok kiracılılık:** `workshops`, `workshop_id` yayılımı, `catalog_items`,
   yetkilendirmenin plaka yerine kiracı bazına çevrilmesi.
5. **PostgreSQL'e geçiş.** Exposed sayesinde uygulama kodu aynı kalır;
   `DatabaseFactory` bağlantı satırı + sürücü değişir. Ölçek gelmeden önce
   yapılması gereken asıl iş 2–4; motor değişimi en kolay adım.

---

## 5. Bilinçli olarak ertelenenler

Prototip aşamasında **doğru** olan, üretimde değişmesi gereken kararlar:

| Karar | Neden şimdi doğru | Ne zaman değişmeli |
|---|---|---|
| SQLite | Kurulum yok, dosya tabanlı, gerçek SQL | Eşzamanlı yazma / çok kullanıcı |
| Katalog kodda | Tek işletme, hızlı iterasyon | İkinci işletme geldiğinde |
| JWT secret sabit | Yerel geliştirme | Üretimden önce (ortam değişkeni) |
| Fotoğraf yerel diskte | Tek sunucu | Yatay ölçek / yedekleme (S3) |
| Kaporta = güncel durum | Ekran ihtiyacını karşılıyor | Delil/itiraz süreci gerekirse |
