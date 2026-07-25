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
}

object Suggestions : Table("suggestions") {
    val id = integer("id").autoIncrement()
    val vehiclePlate = varchar("vehicle_plate", 20).references(Vehicles.plate)
    val region = varchar("region", 20)
    val title = varchar("title", 160)
    val price = integer("price")
    val note = varchar("note", 200).nullable()

    override val primaryKey = PrimaryKey(id)
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
