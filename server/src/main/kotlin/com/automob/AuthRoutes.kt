package com.automob

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.mindrot.jbcrypt.BCrypt

fun Application.configureAuthRouting() {
    routing {
        route("/api/auth") {
            post("/login") {
                val req = call.receive<LoginRequest>()
                val user = Repository.findUserByEmail(req.email)
                if (user == null || !BCrypt.checkpw(req.password, user.passwordHash)) {
                    return@post call.respond(HttpStatusCode.Unauthorized, ApiError("E-posta veya şifre hatalı."))
                }
                val token = AuthConfig.generateToken(user.email, user.role, user.displayName)
                call.respond(LoginResponse(token = token, email = user.email, role = user.role, name = user.displayName))
            }

            authenticate("auth-jwt") {
                get("/me") {
                    val p = call.principal<JWTPrincipal>()!!
                    call.respond(
                        MeResponse(
                            email = p.payload.getClaim("email").asString(),
                            role = if (p.payload.getClaim("role").asString() == "musteri") UserRole.MUSTERI else UserRole.ISLETME,
                            name = p.payload.getClaim("name").asString(),
                        ),
                    )
                }
            }
        }
    }
}
