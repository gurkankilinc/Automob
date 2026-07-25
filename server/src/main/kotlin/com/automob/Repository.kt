package com.automob

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.select
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.update
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale

/** Giriş doğrulaması için dahili kullanıcı kaydı — API'ye asla doğrudan serileştirilmez. */
data class UserRecord(val email: String, val passwordHash: String, val role: UserRole, val displayName: String)

/**
 * Veri erişim katmanı — SQLite (Exposed) üzerinden kalıcı depolama.
 * Katalog ve servis işletmesi bilgisi statik/konfig niteliğinde olduğu için
 * veritabanına değil, burada sabit değer olarak tutulur.
 */
object Repository {

    val service = ServiceInfo("USTA MOTORS", "Oto Servis & Bakım", "0212 000 00 00")

    private val trDate = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale("tr"))

    val catalog = Catalog(
        regions = mapOf(
            "motor" to listOf(
                CatalogItem("Motor yağı + 3 filtre", 2450, "paket"),
                CatalogItem("Triger seti + devirdaim", 4900, "paket"),
                CatalogItem("Buji seti (4)", 900, "parca"),
                CatalogItem("V kayışı", 650, "parca"),
                CatalogItem("Motor takozu", 1250, "parca"),
                CatalogItem("Enjektör temizliği", 800, "iscilik"),
            ),
            "fren" to listOf(
                CatalogItem("Balata seti (ön)", 1870, "parca"),
                CatalogItem("Balata seti (arka)", 1650, "parca"),
                CatalogItem("Fren diski (ön çift)", 2600, "parca"),
                CatalogItem("Fren diski (arka çift)", 2400, "parca"),
                CatalogItem("Fren hidroliği", 480, "iscilik"),
                CatalogItem("ABS sensörü", 1100, "parca"),
            ),
            "amortisor" to listOf(
                CatalogItem("Amortisör (arka çift)", 3200, "parca"),
                CatalogItem("Amortisör (ön çift)", 3400, "parca"),
                CatalogItem("Amortisör takozu", 550, "parca"),
                CatalogItem("Salıncak (alt çift)", 2100, "parca"),
                CatalogItem("Rotil + z-rot", 1300, "parca"),
                CatalogItem("Rot balans ayarı", 700, "iscilik"),
            ),
        ),
        regionLabels = mapOf(
            "motor" to "Motor bölgesi",
            "fren" to "Ön fren",
            "amortisor" to "Arka süspansiyon",
        ),
    )

    private fun norm(plate: String) = plate.uppercase(Locale.ROOT).replace(" ", "")

    private fun rowToVehicle(row: ResultRow) = Vehicle(
        plate = row[Vehicles.displayPlate],
        model = row[Vehicles.model],
        year = row[Vehicles.year],
        vin = row[Vehicles.vin],
        bodyType = when (row[Vehicles.bodyType]) {
            "hatchback" -> BodyType.HATCHBACK
            "suv" -> BodyType.SUV
            else -> BodyType.SEDAN
        },
        km = row[Vehicles.km],
        nextServiceKm = row[Vehicles.nextServiceKm],
        lastServiceKm = row[Vehicles.lastServiceKm],
        owner = row[Vehicles.owner],
        phone = row[Vehicles.phone],
    )

    fun vehicle(plate: String): Vehicle? = transaction {
        Vehicles.select { Vehicles.plate eq norm(plate) }.map(::rowToVehicle).firstOrNull()
    }

    /** Aracın sahibi müşteri e-postası — yetkilendirme kontrolünde kullanılır, API'ye dönmez. */
    fun ownerEmail(plate: String): String? = transaction {
        Vehicles.select { Vehicles.plate eq norm(plate) }.map { it[Vehicles.ownerEmail] }.firstOrNull()
    }

    fun findUserByEmail(email: String): UserRecord? = transaction {
        Users.select { Users.email eq email.trim().lowercase() }
            .map {
                UserRecord(
                    email = it[Users.email],
                    passwordHash = it[Users.passwordHash],
                    role = if (it[Users.role] == "musteri") UserRole.MUSTERI else UserRole.ISLETME,
                    displayName = it[Users.displayName],
                )
            }.firstOrNull()
    }

    fun records(plate: String): List<ServiceRecord> = transaction {
        val key = norm(plate)
        ServiceRecords.select { ServiceRecords.vehiclePlate eq key }
            .orderBy(ServiceRecords.id, SortOrder.DESC)
            .map { rec ->
                val recId = rec[ServiceRecords.id]
                val items = RecordItems.select { RecordItems.recordId eq recId }
                    .map {
                        RecordItem(
                            region = it[RecordItems.region], title = it[RecordItems.title], price = it[RecordItems.price],
                            photos = it[RecordItems.photosJson]?.let { j -> Json.decodeFromString(j) },
                        )
                    }
                ServiceRecord(
                    id = recId,
                    date = rec[ServiceRecords.date],
                    dateIso = rec[ServiceRecords.dateIso],
                    km = rec[ServiceRecords.km],
                    items = items,
                )
            }
    }

    fun suggestions(plate: String): List<Suggestion> = transaction {
        Suggestions.select { Suggestions.vehiclePlate eq norm(plate) }
            .map {
                Suggestion(
                    id = it[Suggestions.id], region = it[Suggestions.region], title = it[Suggestions.title],
                    price = it[Suggestions.price], note = it[Suggestions.note],
                )
            }
    }

    /** Yeni servis kaydı: geçmişe eklenir, aracın km'si güncellenir. */
    fun createRecord(plate: String, req: CreateRecordRequest): ServiceRecord? = transaction {
        val key = norm(plate)
        if (Vehicles.select { Vehicles.plate eq key }.empty()) return@transaction null

        val today = LocalDate.now()
        val recId = ServiceRecords.insert {
            it[vehiclePlate] = key
            it[date] = today.format(trDate)
            it[dateIso] = today.toString()
            it[km] = req.km
        } get ServiceRecords.id

        for (item in req.items) {
            RecordItems.insert {
                it[recordId] = recId
                it[region] = item.region
                it[title] = item.title
                it[price] = item.price
                it[photosJson] = item.photos?.takeIf { it.isNotEmpty() }?.let { Json.encodeToString(it) }
            }
        }
        Vehicles.update({ Vehicles.plate eq key }) { it[km] = req.km }

        ServiceRecord(id = recId, date = today.format(trDate), dateIso = today.toString(), km = req.km, items = req.items)
    }

    /**
     * Km/tarih bazlı bakım hatırlatmaları. Her kural için servis geçmişindeki en yeni
     * eşleşen kalem "son yapılan" baseline'ı olur; eşleşme yoksa BILINMIYOR döner.
     */
    fun reminders(plate: String): List<Reminder> {
        val vehicle = vehicle(plate) ?: return emptyList()
        val recs = records(plate) // yeniden eskiye sıralı
        val today = LocalDate.now()

        return MAINTENANCE_RULES.map { rule ->
            val match = recs.firstNotNullOfOrNull { rec ->
                rec.items.firstOrNull { it.title.contains(rule.matchKeyword, ignoreCase = true) }
                    ?.let { rec to it }
            }
            if (match == null) {
                return@map Reminder(
                    id = rule.id, title = rule.title, region = rule.region,
                    status = ReminderStatus.BILINMIYOR,
                    intervalKm = rule.intervalKm, intervalMonths = rule.intervalMonths,
                )
            }

            val (rec, _) = match
            val dueKm = rule.intervalKm?.let { rec.km + it }
            val dueDate = rule.intervalMonths?.let { LocalDate.parse(rec.dateIso).plusMonths(it.toLong()) }
            val remainingKm = dueKm?.let { it - vehicle.km }
            val remainingDays = dueDate?.let { ChronoUnit.DAYS.between(today, it) }

            Reminder(
                id = rule.id, title = rule.title, region = rule.region,
                status = combineStatus(remainingKm, remainingDays),
                intervalKm = rule.intervalKm, intervalMonths = rule.intervalMonths,
                lastKm = rec.km, lastDate = rec.dateIso,
                dueKm = dueKm, dueDate = dueDate?.toString(),
                remainingKm = remainingKm, remainingDays = remainingDays,
            )
        }
    }

    private fun combineStatus(remainingKm: Int?, remainingDays: Long?): ReminderStatus {
        fun kmStatus() = remainingKm?.let {
            when { it <= 0 -> ReminderStatus.GECIKTI; it <= 1000 -> ReminderStatus.YAKLASIYOR; else -> ReminderStatus.GUNCEL }
        }
        fun dateStatus() = remainingDays?.let {
            when { it <= 0 -> ReminderStatus.GECIKTI; it <= 30 -> ReminderStatus.YAKLASIYOR; else -> ReminderStatus.GUNCEL }
        }
        val severity = mapOf(
            ReminderStatus.GECIKTI to 3, ReminderStatus.YAKLASIYOR to 2,
            ReminderStatus.GUNCEL to 1, ReminderStatus.BILINMIYOR to 0,
        )
        return listOfNotNull(kmStatus(), dateStatus()).maxByOrNull { severity.getValue(it) }
            ?: ReminderStatus.BILINMIYOR
    }
}
