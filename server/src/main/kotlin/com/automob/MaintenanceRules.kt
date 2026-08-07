package com.automob

/**
 * Km/tarih bazlı bakım hatırlatma kuralları.
 *
 * `matchKeyword`, servis geçmişindeki kalem başlıklarıyla (büyük/küçük harf duyarsız,
 * içerir eşleşmesi) karşılaştırılır; en yeni eşleşme "son yapılan" olarak alınır ve
 * bir sonraki bakım km/tarih olarak hesaplanır. Eşleşme yoksa durum BILINMIYOR olur —
 * araç için bu kalemin hiç kaydı yok demektir.
 *
 * NOT: Bu liste frontend'deki src/data/maintenanceRules.ts ile birebir eşleşmelidir
 * (backend kapalıyken tarayıcı aynı kuralları yerel olarak uygular).
 */
data class MaintenanceRule(
    val id: String,
    val title: String,
    val region: String?,
    val matchKeyword: String,
    val intervalKm: Int?,
    val intervalMonths: Int?,
)

val MAINTENANCE_RULES = listOf(
    MaintenanceRule("yag-filtre", "Motor yağı + filtre değişimi", "motor", "yağ", 10_000, 12),
    MaintenanceRule("triger", "Triger seti + devirdaim", "motor", "triger", 60_000, 60),
    MaintenanceRule("balata", "Balata kontrolü", "fren", "balata", 20_000, 24),
    MaintenanceRule("fren-hidrolik", "Fren hidroliği değişimi", "fren", "fren hidroliği", 40_000, 24),
    MaintenanceRule("amortisor", "Amortisör kontrolü", "amortisor", "amortisör", 40_000, 48),
    MaintenanceRule("rot-balans", "Rot balans ayarı", "amortisor", "rot balans", 10_000, 12),
    MaintenanceRule("lastik-rotasyon", "Lastik rotasyonu", "lastik", "rotasyon", 10_000, 12),
    MaintenanceRule("aku-kontrol", "Akü kontrolü", "elektrik", "akü", null, 24),
    MaintenanceRule("egzoz-kontrol", "Egzoz kontrolü", "egzoz", "egzoz", 40_000, 48),
    MaintenanceRule("klima-gaz", "Klima gazı dolumu", "klima", "gaz", null, 12),
    MaintenanceRule("kabin-filtresi", "Kabin filtresi değişimi", "klima", "kabin filtresi", 15_000, 12),
)
