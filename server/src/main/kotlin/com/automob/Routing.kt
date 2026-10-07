package com.automob

import io.ktor.http.content.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.http.content.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import java.io.File
import java.util.UUID

@Serializable
data class HealthResponse(val status: String, val service: String)

private const val MAX_UPLOAD_BYTES = 8L * 1024 * 1024 // 8 MB — basit bir sınır, prod-hardened değil

fun Application.configureRouting() {
    val uploadsDir = File("uploads").apply { mkdirs() }

    routing {
        get("/api/health") {
            call.respond(HealthResponse("ok", "automob"))
        }

        get("/api/service") {
            call.respond(Repository.service)
        }

        get("/api/catalog") {
            call.respond(Repository.catalog)
        }

        staticFiles("/uploads", uploadsDir)

        authenticate("auth-jwt") {
            get("/api/customers") {
                if (!call.requireIsletme()) return@get
                val q = call.request.queryParameters["q"]
                call.respond(Repository.customers(q))
            }

            get("/api/customers/{customerId}") {
                if (!call.requireIsletme()) return@get
                val customerId = call.parameters["customerId"]!!
                val vehicle = Repository.vehicleByCustomerId(customerId)
                    ?: return@get call.respond(HttpStatusCode.NotFound, ApiError("Müşteri bulunamadı: $customerId"))
                call.respond(vehicle)
            }

            route("/api/vehicles/{plate}") {
                get {
                    val plate = call.parameters["plate"]!!
                    if (!call.vehicleAccess(plate, write = false)) return@get
                    val vehicle = Repository.vehicle(plate)
                        ?: return@get call.respond(HttpStatusCode.NotFound, ApiError("Araç bulunamadı: $plate"))
                    call.respond(vehicle)
                }

                get("/records") {
                    val plate = call.parameters["plate"]!!
                    if (!call.vehicleAccess(plate, write = false)) return@get
                    call.respond(Repository.records(plate))
                }

                get("/suggestions") {
                    val plate = call.parameters["plate"]!!
                    if (!call.vehicleAccess(plate, write = false)) return@get
                    call.respond(Repository.suggestions(plate))
                }

                get("/reminders") {
                    val plate = call.parameters["plate"]!!
                    if (!call.vehicleAccess(plate, write = false)) return@get
                    call.respond(Repository.reminders(plate))
                }

                /**
                 * Servis girişinde okunan km ve kasa tipi düzeltmesi. Kısmi güncelleme:
                 * gövdede verilmeyen alan değişmez. Güncel araç kaydını döner — km
                 * sunucuda geriye alınmadığı için istemci yanıttaki değeri esas almalı.
                 */
                patch {
                    val plate = call.parameters["plate"]!!
                    if (!call.vehicleAccess(plate, write = true)) return@patch
                    val req = call.receive<UpdateVehicleRequest>()
                    if (req.km != null && req.km !in 0..5_000_000) {
                        return@patch call.respond(HttpStatusCode.BadRequest, ApiError("Geçersiz km değeri."))
                    }
                    val updated = Repository.updateVehicle(plate, req)
                        ?: return@patch call.respond(HttpStatusCode.NotFound, ApiError("Araç bulunamadı: $plate"))
                    call.respond(updated)
                }

                post("/records") {
                    val plate = call.parameters["plate"]!!
                    if (!call.vehicleAccess(plate, write = true)) return@post
                    val req = call.receive<CreateRecordRequest>()
                    val record = Repository.createRecord(plate, req)
                        ?: return@post call.respond(HttpStatusCode.NotFound, ApiError("Araç bulunamadı: $plate"))
                    call.respond(HttpStatusCode.Created, record)
                }

                get("/panels") {
                    val plate = call.parameters["plate"]!!
                    if (!call.vehicleAccess(plate, write = false)) return@get
                    call.respond(Repository.panels(plate))
                }

                put("/panels/{panelId}") {
                    val plate = call.parameters["plate"]!!
                    if (!call.vehicleAccess(plate, write = true)) return@put
                    val panelId = call.parameters["panelId"]!!
                    if (panelId !in BODY_PANEL_IDS) {
                        return@put call.respond(
                            HttpStatusCode.BadRequest, ApiError("Bilinmeyen kaporta paneli: $panelId"),
                        )
                    }
                    val req = call.receive<UpdatePanelRequest>()
                    val by = call.principal<JWTPrincipal>()?.payload?.getClaim("email")?.asString()
                    val saved = Repository.setPanel(plate, panelId, req.state, req.note?.take(200), by)
                        ?: return@put call.respond(HttpStatusCode.NotFound, ApiError("Araç bulunamadı: $plate"))
                    call.respond(saved)
                }
            }

            post("/api/uploads") {
                val principal = call.principal<JWTPrincipal>()!!
                if (principal.payload.getClaim("role").asString() != "isletme") {
                    return@post call.respond(
                        HttpStatusCode.Forbidden,
                        ApiError("Yalnızca işletme kullanıcıları fotoğraf yükleyebilir."),
                    )
                }

                val urls = mutableListOf<String>()
                var tooLarge = false
                val multipart = call.receiveMultipart()
                multipart.forEachPart { part ->
                    if (part is PartData.FileItem && !tooLarge) {
                        if (part.contentType?.contentType == "image") {
                            val ext = File(part.originalFileName ?: "photo.jpg").extension
                                .lowercase().filter { it.isLetterOrDigit() }.ifBlank { "jpg" }
                            val name = "${UUID.randomUUID()}.$ext"
                            val file = File(uploadsDir, name)
                            var written = 0L
                            part.streamProvider().use { input ->
                                file.outputStream().use { output ->
                                    val buf = ByteArray(8192)
                                    while (true) {
                                        val n = input.read(buf)
                                        if (n < 0) break
                                        written += n
                                        if (written > MAX_UPLOAD_BYTES) { tooLarge = true; break }
                                        output.write(buf, 0, n)
                                    }
                                }
                            }
                            if (tooLarge) file.delete() else urls.add("/uploads/$name")
                        }
                    }
                    part.dispose()
                }

                when {
                    tooLarge -> call.respond(HttpStatusCode.PayloadTooLarge, ApiError("Dosya çok büyük (azami 8 MB)."))
                    urls.isEmpty() -> call.respond(HttpStatusCode.BadRequest, ApiError("Görsel dosya bulunamadı."))
                    else -> call.respond(HttpStatusCode.Created, UploadResponse(urls))
                }
            }
        }
    }
}

/**
 * Müşteri listesi/arama diğer müşterilerin ad+telefon bilgisini taşıdığından yalnızca
 * isletme rolüne açık — musteri kendi aracı dışında hiçbir kayda erişememeli.
 */
private suspend fun ApplicationCall.requireIsletme(): Boolean {
    val principal = principal<JWTPrincipal>()!!
    if (principal.payload.getClaim("role").asString() == "isletme") return true
    respond(HttpStatusCode.Forbidden, ApiError("Bu işlem için işletme yetkisi gerekir."))
    return false
}

/**
 * isletme rolü her araca tam erişir; musteri rolü yalnızca kendi aracına (ownerEmail
 * eşleşmesi) ve yalnızca okumaya (write=false) erişebilir. Yanıtı kendi yazar; false
 * dönerse çağıran taraf işlemi durdurmalı (`return@get` / `return@post`).
 */
private suspend fun ApplicationCall.vehicleAccess(plate: String, write: Boolean): Boolean {
    val principal = principal<JWTPrincipal>()!!
    val role = principal.payload.getClaim("role").asString()
    if (role == "isletme") return true
    if (write) {
        respond(HttpStatusCode.Forbidden, ApiError("Bu işlem için işletme yetkisi gerekir."))
        return false
    }
    val email = principal.payload.getClaim("email").asString()
    val owner = Repository.ownerEmail(plate)
    if (owner == null || !owner.equals(email, ignoreCase = true)) {
        respond(HttpStatusCode.Forbidden, ApiError("Bu araca erişim yetkiniz yok."))
        return false
    }
    return true
}
