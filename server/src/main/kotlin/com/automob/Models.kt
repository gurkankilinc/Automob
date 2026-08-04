package com.automob

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Frontend TS modelleriyle birebir eşleşen veri tipleri (kotlinx.serialization). */

@Serializable
enum class BodyType {
    @SerialName("sedan") SEDAN,
    @SerialName("hatchback") HATCHBACK,
    @SerialName("suv") SUV,
}

@Serializable
data class ServiceInfo(
    val name: String,
    val tagline: String,
    val phone: String,
)

@Serializable
data class Vehicle(
    val plate: String,
    val model: String,
    val year: Int,
    val vin: String,
    val bodyType: BodyType,
    val km: Int,
    val nextServiceKm: Int,
    val lastServiceKm: Int,
    val owner: String,
    val phone: String,
    val customerId: String,
)

/** Müşteri arama sonucu satırı — araç dosyasının tam ayrıntısı olmadan liste görünümü için. */
@Serializable
data class CustomerSummary(
    val customerId: String,
    val owner: String,
    val phone: String,
    val plate: String,
    val model: String,
    val km: Int,
)

@Serializable
data class CatalogItem(
    val title: String,
    val price: Int,
    val group: String, // paket | parca | iscilik
)

@Serializable
data class Catalog(
    val regions: Map<String, List<CatalogItem>>,
    val regionLabels: Map<String, String>,
)

@Serializable
data class RecordItem(
    val region: String? = null,
    val title: String,
    val price: Int? = null,
    val photos: List<String>? = null,
)

@Serializable
data class ServiceRecord(
    val id: Int,
    val date: String,
    /** ISO 8601 (yyyy-MM-dd) — bakım hatırlatma hesaplarında kullanılır */
    val dateIso: String,
    val km: Int,
    val items: List<RecordItem>,
)

@Serializable
data class Suggestion(
    val id: Int,
    val region: String,
    val title: String,
    val price: Int,
    val note: String? = null,
)

@Serializable
data class CreateRecordRequest(
    val km: Int,
    val items: List<RecordItem>,
)

/** Bir bakım kalemi için hesaplanmış hatırlatma durumu. */
@Serializable
enum class ReminderStatus {
    @SerialName("guncel") GUNCEL,
    @SerialName("yaklasiyor") YAKLASIYOR,
    @SerialName("gecikti") GECIKTI,
    /** Bu araç için hiç kayıt bulunamadı — takip başlatılmamış */
    @SerialName("bilinmiyor") BILINMIYOR,
}

@Serializable
data class Reminder(
    val id: String,
    val title: String,
    val region: String?,
    val status: ReminderStatus,
    val intervalKm: Int? = null,
    val intervalMonths: Int? = null,
    val lastKm: Int? = null,
    val lastDate: String? = null,
    val dueKm: Int? = null,
    val dueDate: String? = null,
    val remainingKm: Int? = null,
    val remainingDays: Long? = null,
)

// ---------- Kaporta / boya durumu ----------

@Serializable
enum class PanelState {
    @SerialName("orijinal") ORIJINAL,
    @SerialName("lokal-boyali") LOKAL_BOYALI,
    @SerialName("boyali") BOYALI,
    @SerialName("degisen") DEGISEN,
}

@Serializable
data class PanelStatus(
    val panelId: String,
    val state: PanelState,
    val note: String? = null,
    val updatedAt: String? = null,
    val updatedBy: String? = null,
)

@Serializable
data class UpdatePanelRequest(
    val state: PanelState,
    val note: String? = null,
)

/**
 * Geçerli kaporta paneli kimlikleri — frontend'deki src/data/bodyPanels.ts ile
 * birebir eşleşmelidir (bilinmeyen panel kimliği 400 ile reddedilir).
 */
val BODY_PANEL_IDS: Set<String> = setOf(
    "on-tampon", "kaput", "tavan", "bagaj", "arka-tampon",
    "sol-on-camurluk", "sag-on-camurluk", "sol-arka-camurluk", "sag-arka-camurluk",
    "sol-on-kapi", "sag-on-kapi", "sol-arka-kapi", "sag-arka-kapi",
)

// ---------- Kimlik doğrulama ----------

@Serializable
enum class UserRole {
    @SerialName("isletme") ISLETME,
    @SerialName("musteri") MUSTERI,
}

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class LoginResponse(val token: String, val email: String, val role: UserRole, val name: String)

@Serializable
data class MeResponse(val email: String, val role: UserRole, val name: String)

@Serializable
data class UploadResponse(val urls: List<String>)

@Serializable
data class ApiError(val error: String)
