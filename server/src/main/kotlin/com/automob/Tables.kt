package com.automob

import org.jetbrains.exposed.sql.Table

/**
 * Exposed tablo tanımları. Plaka anahtarı her yerde normalize (boşluksuz, büyük harf)
 * tutulur — bkz. Repository.norm(). Katalog ve servis işletmesi bilgisi (statik/konfig
 * niteliğinde) burada değil, Repository içinde sabit değer olarak kalır.
 */

object Vehicles : Table("vehicles") {
    val plate = varchar("plate", 20)
    val displayPlate = varchar("display_plate", 20)
    val model = varchar("model", 80)
    val year = integer("year")
    val vin = varchar("vin", 40)
    val bodyType = varchar("body_type", 20)
    val km = integer("km")
    val nextServiceKm = integer("next_service_km")
    val lastServiceKm = integer("last_service_km")
    val owner = varchar("owner", 80)
    val phone = varchar("phone", 40)
    /** Müşteri hesabı e-postası — musteri rolündeki kullanıcı yalnızca kendi aracına erişebilir. */
    val ownerEmail = varchar("owner_email", 120).nullable()

    override val primaryKey = PrimaryKey(plate)
}

object ServiceRecords : Table("service_records") {
    val id = integer("id").autoIncrement()
    val vehiclePlate = varchar("vehicle_plate", 20).references(Vehicles.plate)
    val date = varchar("date", 20)
    val dateIso = varchar("date_iso", 12)
    val km = integer("km")

    override val primaryKey = PrimaryKey(id)

    init {
        // SQLite yabancı anahtarları otomatik indekslemez; araç geçmişi her
        // görüntülemede bu kolonla sorgulanıyor (bkz. docs/VERITABANI.md §2.1).
        index(false, vehiclePlate)
    }
}

object RecordItems : Table("record_items") {
    val id = integer("id").autoIncrement()
    val recordId = integer("record_id").references(ServiceRecords.id)
    val region = varchar("region", 20).nullable()
    val title = varchar("title", 160)
    val price = integer("price").nullable()
    /** JSON dizisi (List<String>) — yüklenen fotoğrafların /uploads yolları */
    val photosJson = text("photos_json").nullable()

    override val primaryKey = PrimaryKey(id)

    init {
        index(false, recordId)
    }
}

object Suggestions : Table("suggestions") {
    val id = integer("id").autoIncrement()
    val vehiclePlate = varchar("vehicle_plate", 20).references(Vehicles.plate)
    val region = varchar("region", 20)
    val title = varchar("title", 160)
    val price = integer("price")
    val note = varchar("note", 200).nullable()

    override val primaryKey = PrimaryKey(id)

    init {
        index(false, vehiclePlate)
    }
}

/**
 * Kaporta/boya durumu — araç başına panel (kaput, çamurluk, kapı...) durumu.
 * Her (araç, panel) çifti için tek satır tutulur; güncel durum modeli.
 * Kim/ne zaman değiştirdi bilgisi ekspertiz tartışmalarında önemli olduğu için
 * updated_at / updated_by ile birlikte saklanır.
 */
object BodyPanels : Table("body_panels") {
    val id = integer("id").autoIncrement()
    val vehiclePlate = varchar("vehicle_plate", 20).references(Vehicles.plate)
    val panelId = varchar("panel_id", 40)
    /** orijinal | lokal-boyali | boyali | degisen */
    val state = varchar("state", 24)
    val note = varchar("note", 200).nullable()
    /** ISO-8601 zaman damgası */
    val updatedAt = varchar("updated_at", 32)
    val updatedBy = varchar("updated_by", 120).nullable()

    override val primaryKey = PrimaryKey(id)

    init {
        uniqueIndex(vehiclePlate, panelId)
    }
}

/** İşletme (usta/danışman) ve müşteri hesapları. Şifre jBCrypt ile hash'lenir. */
object Users : Table("users") {
    val id = integer("id").autoIncrement()
    val email = varchar("email", 120).uniqueIndex()
    val passwordHash = varchar("password_hash", 100)
    /** "isletme" | "musteri" */
    val role = varchar("role", 20)
    val displayName = varchar("display_name", 80)

    override val primaryKey = PrimaryKey(id)
}
