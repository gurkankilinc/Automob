package com.automob

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import java.util.Date

/**
 * JWT ayarları ve token üretimi.
 *
 * NOT: `secret` burada sabit kodlanmıştır — yalnızca yerel prototip için kabul
 * edilebilir. Üretime giderken ortam değişkeninden okunmalı (örn. `System.getenv("JWT_SECRET")`)
 * ve asla kaynak koduna yazılmamalıdır.
 */
object AuthConfig {
    const val REALM = "automob"
    const val ISSUER = "automob-server"
    const val AUDIENCE = "automob-clients"
    private const val SECRET = "automob-dev-secret-do-not-use-in-production"
    private const val EXPIRY_MS = 7L * 24 * 60 * 60 * 1000 // 7 gün — prototip kolaylığı

    val algorithm: Algorithm = Algorithm.HMAC256(SECRET)

    fun generateToken(email: String, role: UserRole, name: String): String =
        JWT.create()
            .withIssuer(ISSUER)
            .withAudience(AUDIENCE)
            .withClaim("email", email)
            .withClaim("role", role.name.lowercase())
            .withClaim("name", name)
            .withExpiresAt(Date(System.currentTimeMillis() + EXPIRY_MS))
            .sign(algorithm)
}
