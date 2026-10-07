package com.automob

import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.Transaction
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.select
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.statements.StatementType
import org.jetbrains.exposed.sql.transactions.transaction
import org.mindrot.jbcrypt.BCrypt

/**
 * SQLite dosya veritabanı (Exposed). Sunucu yeniden başladığında veri kaybolmaz —
 * önceki bellek-içi Repository'nin aksine. Şema boşsa tek seferlik demo verisi eklenir.
 *
 * `createMissingTablesAndColumns` kullanılır (salt `create` değil) ki önceki
 * oturumlardan kalan `automob.db` dosyasına yeni tablo/kolonlar (örn. users,
 * vehicles.owner_email) veri kaybı olmadan eklenebilsin.
 */
object DatabaseFactory {
    fun init(dbPath: String = "automob.db") {
        Database.connect("jdbc:sqlite:$dbPath", driver = "org.sqlite.JDBC")
        transaction {
            dropObsoleteColumns()
            SchemaUtils.createMissingTablesAndColumns(
                Vehicles, ServiceRecords, RecordItems, Suggestions, Users, BodyPanels,
            )
            seedVehiclesIfEmpty()
            seedUsersIfEmpty()
            seedPanelsIfEmpty()
        }
    }

    /**
     * Koddan kaldırılmış kolonlar (bkz. docs/VERITABANI.md §2.1). Hepsi NOT NULL
     * olduğundan eski bir `automob.db` içinde kalırlarsa yeni INSERT'ler hata verir.
     */
    private val OBSOLETE_COLUMNS = mapOf(
        "service_records" to listOf("date"),
        "vehicles" to listOf("next_service_km", "last_service_km"),
    )

    /**
     * `createMissingTablesAndColumns` kolon ekleyebilir ama silemez; bu yüzden
     * burada elle siliniyor. Kolon (ya da tablo) yoksa hiçbir şey yapmaz, her
     * açılışta güvenle çalışır. Flyway'e geçildiğinde (§4 adım 2) sürümlü bir göç
     * dosyasına taşınacak.
     */
    private fun Transaction.dropObsoleteColumns() {
        for ((table, columns) in OBSOLETE_COLUMNS) {
            val existing = mutableSetOf<String>()
            exec("PRAGMA table_info($table)", explicitStatementType = StatementType.SELECT) { rs ->
                while (rs.next()) existing += rs.getString("name")
            }
            for (column in columns.filter { it in existing }) {
                exec("ALTER TABLE $table DROP COLUMN $column")
            }
        }
    }

    /** İşletme "Müşteriler" arama listesi için 10 müşteri/araç — tek satır = tek müşteri (bkz. docs/VERITABANI.md §2.3). */
    private data class DemoCustomer(
        val customerId: String, val plate: String, val displayPlate: String, val model: String, val year: Int,
        val vin: String, val bodyType: String, val km: Int,
        val owner: String, val phone: String, val ownerEmail: String?,
    )

    private val DEMO_CUSTOMERS = listOf(
        DemoCustomer(
            "MST-001", "34ABC123", "34 ABC 123", "Renault Megane", 2019, "VF1···847", "sedan",
            84_500, "A. Yılmaz", "0532 ··· ·· 41", "musteri@example.com",
        ),
        DemoCustomer(
            "MST-002", "06XYZ99", "06 XYZ 99", "Fiat Egea", 2021, "NM0···512", "sedan",
            42_000, "B. Demir", "0533 ··· ·· 12", "baska@example.com",
        ),
        DemoCustomer(
            "MST-003", "34DEF456", "34 DEF 456", "Toyota Corolla", 2020, "SB1···233", "sedan",
            56_300, "C. Kaya", "0535 ··· ·· 77", null,
        ),
        DemoCustomer(
            "MST-004", "06GHI789", "06 GHI 789", "Volkswagen Golf", 2018, "WVW···104", "hatchback",
            112_800, "D. Şahin", "0536 ··· ·· 19", null,
        ),
        DemoCustomer(
            "MST-005", "35JKL321", "35 JKL 321", "Hyundai Tucson", 2022, "KMH···588", "suv",
            18_400, "E. Çelik", "0530 ··· ·· 63", null,
        ),
        DemoCustomer(
            "MST-006", "16MNO654", "16 MNO 654", "Ford Focus", 2017, "WF0···931", "hatchback",
            138_950, "F. Arslan", "0538 ··· ·· 08", null,
        ),
        DemoCustomer(
            "MST-007", "34PQR987", "34 PQR 987", "Honda CR-V", 2021, "SHH···276", "suv",
            31_200, "G. Doğan", "0532 ··· ·· 95", null,
        ),
        DemoCustomer(
            "MST-008", "07STU159", "07 STU 159", "Peugeot 301", 2016, "VF3···410", "sedan",
            164_700, "H. Aydın", "0533 ··· ·· 26", null,
        ),
        DemoCustomer(
            "MST-009", "34VWX753", "34 VWX 753", "Škoda Octavia", 2023, "TMB···829", "sedan",
            9_100, "I. Koç", "0537 ··· ·· 44", null,
        ),
        DemoCustomer(
            "MST-010", "06YZA246", "06 YZA 246", "Dacia Duster", 2019, "UU1···367", "suv",
            73_600, "J. Yıldız", "0534 ··· ·· 82", null,
        ),
    )

    private fun seedVehiclesIfEmpty() {
        if (Vehicles.selectAll().count() > 0) return

        for (c in DEMO_CUSTOMERS) {
            Vehicles.insert {
                it[plate] = c.plate
                it[customerId] = c.customerId
                it[displayPlate] = c.displayPlate
                it[model] = c.model
                it[year] = c.year
                it[vin] = c.vin
                it[bodyType] = c.bodyType
                it[km] = c.km
                it[owner] = c.owner
                it[phone] = c.phone
                it[ownerEmail] = c.ownerEmail
            }
        }

        // MST-001 (demo müşteri hesabının aracı) — dolu geçmiş, servis panelinin boş
        // görünmemesi için.
        val rec1 = ServiceRecords.insert {
            it[vehiclePlate] = "34ABC123"
            it[dateIso] = "2025-11-10"
            it[km] = 71_000
        } get ServiceRecords.id
        RecordItems.insert {
            it[recordId] = rec1
            it[region] = "motor"
            it[title] = "Periyodik bakım — yağ + 3 filtre"
            it[price] = 2200
        }
        val rec2 = ServiceRecords.insert {
            it[vehiclePlate] = "34ABC123"
            it[dateIso] = "2026-03-12"
            it[km] = 78_200
        } get ServiceRecords.id
        RecordItems.insert {
            it[recordId] = rec2
            it[region] = "fren"
            it[title] = "Fren diski (ön çift)"
            it[price] = 2600
        }
        RecordItems.insert {
            it[recordId] = rec2
            it[region] = null
            it[title] = "Rot balans + lastik rotasyonu"
            it[price] = 700
        }
        Suggestions.insert {
            it[vehiclePlate] = "34ABC123"
            it[region] = "amortisor"
            it[title] = "Amortisör (arka çift)"
            it[price] = 3200
            it[note] = "sızıntı gözlendi"
        }

        // MST-004 — yüksek km, gecikmiş bakım senaryosu (arama listesinde çeşitlilik için).
        val rec3 = ServiceRecords.insert {
            it[vehiclePlate] = "06GHI789"
            it[dateIso] = "2025-01-02"
            it[km] = 100_000
        } get ServiceRecords.id
        RecordItems.insert {
            it[recordId] = rec3
            it[region] = "motor"
            it[title] = "Triger seti + devirdaim"
            it[price] = 4900
        }

        // MST-008 — eski/yüksek km araç, kaporta geçmişi olan (bkz. seedPanelsIfEmpty).
        val rec4 = ServiceRecords.insert {
            it[vehiclePlate] = "07STU159"
            it[dateIso] = "2025-08-20"
            it[km] = 160_000
        } get ServiceRecords.id
        RecordItems.insert {
            it[recordId] = rec4
            it[region] = "fren"
            it[title] = "Balata seti (ön)"
            it[price] = 1870
        }
    }

    /**
     * Demo araçların kaporta geçmişi — özellik boş bir diyagramla değil, gerçekçi bir
     * ekspertiz tablosuyla açılsın diye. Kayıtsız panel "orijinal" sayılır.
     */
    private fun seedPanelsIfEmpty() {
        if (BodyPanels.selectAll().count() > 0) return

        val now = java.time.Instant.now().toString()
        val byPlate = mapOf(
            "34ABC123" to listOf(
                Triple("sol-on-camurluk", "boyali", "önceki sahibinde onarım"),
                Triple("on-tampon", "degisen", "park çarpması sonrası"),
                Triple("sol-on-kapi", "lokal-boyali", "çizik rötuşu"),
            ),
            // MST-008 — eski/yüksek km araç, daha ağır kaporta geçmişi.
            "07STU159" to listOf(
                Triple("arka-tampon", "degisen", "kaza sonrası değişim"),
                Triple("sag-arka-kapi", "boyali", "pas onarımı"),
            ),
        )
        for ((plate, entries) in byPlate) {
            if (Vehicles.select { Vehicles.plate eq plate }.empty()) continue
            for ((panel, state, note) in entries) {
                BodyPanels.insert {
                    it[vehiclePlate] = plate
                    it[panelId] = panel
                    it[BodyPanels.state] = state
                    it[BodyPanels.note] = note
                    it[updatedAt] = now
                    it[updatedBy] = "servis@ustamotors.com"
                }
            }
        }
    }

    private fun seedUsersIfEmpty() {
        if (Users.selectAll().count() > 0) return

        Users.insert {
            it[email] = "servis@ustamotors.com"
            it[passwordHash] = BCrypt.hashpw("servis123", BCrypt.gensalt())
            it[role] = "isletme"
            it[displayName] = "Usta Motors"
        }
        Users.insert {
            it[email] = "musteri@example.com"
            it[passwordHash] = BCrypt.hashpw("musteri123", BCrypt.gensalt())
            it[role] = "musteri"
            it[displayName] = "A. Yılmaz"
        }
    }
}
