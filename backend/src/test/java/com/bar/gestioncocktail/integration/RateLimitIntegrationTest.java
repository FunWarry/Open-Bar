package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.LoginRequest;
import com.bar.gestioncocktail.security.RateLimiterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end integration tests for authentication rate limiting.
 */
class RateLimitIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private RateLimiterService rateLimiterService;

    @BeforeEach
    void resetRateLimiter() {
        rateLimiterService.reset();
    }

    @Test
    @DisplayName("rateLimiting_exceedingLoginThreshold_returns429TooManyRequests")
    void rateLimiting_exceedingLoginThreshold_returns429TooManyRequests() throws Exception {
        String clientIp = "198.51.100.1";

        LoginRequest badCredentials = new LoginRequest();
        badCredentials.setUsername("admin");
        badCredentials.setPassword("wrong_password");

        // First 5 attempts within default capacity should reach authentication layer (401 Unauthorized)
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .header("X-Forwarded-For", clientIp)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badCredentials)))
                    .andExpect(status().isUnauthorized());
        }

        // 6th attempt from same IP exceeds capacity and must return 429 Too Many Requests
        mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", clientIp)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badCredentials)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(header().string("X-Rate-Limit-Retry-After-Seconds", notNullValue()))
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.error").value("Too Many Requests"))
                .andExpect(jsonPath("$.message").value(containsString("Too many login attempts")))
                .andExpect(jsonPath("$.retryAfterSeconds").isNumber());

        // A different IP address has its own bucket and should still reach authentication (401, not 429)
        String otherClientIp = "198.51.100.2";
        mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", otherClientIp)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badCredentials)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("rateLimiting_validLoginWithinLimit_returns200Ok")
    void rateLimiting_validLoginWithinLimit_returns200Ok() throws Exception {
        String clientIp = "198.51.100.10";

        LoginRequest validCredentials = new LoginRequest();
        validCredentials.setUsername("admin");
        validCredentials.setPassword("admin123");

        mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", clientIp)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCredentials)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    @DisplayName("rateLimiting_reset_clearsExhaustedBucketAndAllowsSubsequentAttempt")
    void rateLimiting_reset_clearsExhaustedBucketAndAllowsSubsequentAttempt() throws Exception {
        String clientIp = "198.51.100.20";

        LoginRequest badCredentials = new LoginRequest();
        badCredentials.setUsername("admin");
        badCredentials.setPassword("wrong_password");

        // Exhaust tokens
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .header("X-Forwarded-For", clientIp)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badCredentials)))
                    .andExpect(status().isUnauthorized());
        }

        // Verify throttled
        mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", clientIp)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badCredentials)))
                .andExpect(status().isTooManyRequests());

        // Reset rate limiter for this specific IP
        rateLimiterService.reset(clientIp);

        // Next attempt should reach authentication again
        mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", clientIp)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badCredentials)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("rateLimiting_xRealIpHeader_enforcesRateLimiting")
    void rateLimiting_xRealIpHeader_enforcesRateLimiting() throws Exception {
        String clientIp = "198.51.100.30";

        LoginRequest badCredentials = new LoginRequest();
        badCredentials.setUsername("admin");
        badCredentials.setPassword("wrong_password");

        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .header("X-Real-IP", clientIp)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badCredentials)))
                    .andExpect(status().isUnauthorized());
        }

        mockMvc.perform(post("/api/auth/login")
                        .header("X-Real-IP", clientIp)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badCredentials)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));
    }
}
