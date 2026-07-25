package com.automob

import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.update
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
            SchemaUtils.createMissingTablesAndColumns(Vehicles, ServiceRecords, RecordItems, Suggestions, Users)
            seedVehiclesIfEmpty()
            seedUsersIfEmpty()
        }
    }

    private fun seedVehiclesIfEmpty() {
        if (Vehicles.selectAll().count() > 0) return

        val plate = "34ABC123"
        Vehicles.insert {
            it[Vehicles.plate] = plate
            it[displayPlate] = "34 ABC 123"
            it[model] = "Renault Megane"
            it[year] = 2019
            it[vin] = "VF1···847"
            it[bodyType] = "sedan"
            it[km] = 84_500
            it[nextServiceKm] = 90_000
            it[lastServiceKm] = 71_000
            it[owner] = "A. Yılmaz"
            it[phone] = "0532 ··· ·· 41"
            it[ownerEmail] = "musteri@example.com"
        }

        val rec1 = ServiceRecords.insert {
            it[vehiclePlate] = plate
            it[date] = "10 Kas 2025"
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
            it[vehiclePlate] = plate
            it[date] = "12 Mar 2026"
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
            it[vehiclePlate] = plate
            it[region] = "amortisor"
            it[title] = "Amortisör (arka çift)"
            it[price] = 3200
            it[note] = "sızıntı gözlendi"
        }

        // İkinci demo araç: başka bir müşteriye ait — yetkilendirme sınırını (musteri
        // yalnızca kendi aracına erişebilir) test etmek için. Frontend bunu kullanmaz.
        Vehicles.insert {
            it[Vehicles.plate] = "06XYZ99"
            it[displayPlate] = "06 XYZ 99"
            it[model] = "Fiat Egea"
            it[year] = 2021
            it[vin] = "NM0···512"
            it[bodyType] = "sedan"
            it[km] = 42_000
            it[nextServiceKm] = 50_000
            it[lastServiceKm] = 40_000
            it[owner] = "B. Demir"
            it[phone] = "0533 ··· ·· 12"
            it[ownerEmail] = "baska@example.com"
        }
    }

    /** Var olan (önceki oturumdan kalma) `automob.db`de vehicles doluysa da ownerEmail eksik kalabilir — tamamla. */
    private fun backfillOwnerEmail() {
        Vehicles.update({ Vehicles.plate eq "34ABC123" }) { it[ownerEmail] = "musteri@example.com" }
    }

    private fun seedUsersIfEmpty() {
        if (Users.selectAll().count() > 0) return
        backfillOwnerEmail()

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
