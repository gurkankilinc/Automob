package com.automob

import com.auth0.jwt.JWT
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.callloging.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.plugins.defaultheaders.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.response.*
import kotlinx.serialization.json.Json

fun main() {
    val port = System.getenv("PORT")?.toIntOrNull() ?: 8080
    embeddedServer(Netty, port = port, host = "0.0.0.0", module = Application::module).start(wait = true)
}

fun Application.module() {
    DatabaseFactory.init()
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            ignoreUnknownKeys = true
            encodeDefaults = true
        })
    }
    install(CallLogging)
    install(DefaultHeaders)
    install(CORS) {
        allowHost("localhost:5173")
        allowHost("127.0.0.1:5173")
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Options)
        allowHeader(HttpHeaders.ContentType)
        allowHeader(HttpHeaders.Authorization)
    }
    install(Authentication) {
        jwt("auth-jwt") {
            realm = AuthConfig.REALM
            verifier(
                JWT.require(AuthConfig.algorithm)
                    .withIssuer(AuthConfig.ISSUER)
                    .withAudience(AuthConfig.AUDIENCE)
                    .build(),
            )
            validate { credential ->
                if (credential.payload.getClaim("email").asString() != null) JWTPrincipal(credential.payload) else null
            }
            challenge { _, _ ->
                call.respond(HttpStatusCode.Unauthorized, ApiError("Giriş gerekli."))
            }
        }
    }
    install(StatusPages) {
        exception<Throwable> { call, cause ->
            call.respond(HttpStatusCode.InternalServerError, ApiError(cause.message ?: "Sunucu hatası"))
        }
    }
    configureAuthRouting()
    configureRouting()
}
