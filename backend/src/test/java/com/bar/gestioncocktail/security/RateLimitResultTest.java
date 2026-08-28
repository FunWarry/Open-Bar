package com.bar.gestioncocktail.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link RateLimitResult}.
 */
class RateLimitResultTest {

    @Test
    @DisplayName("getRetryAfterSeconds - zero nanos returns zero")
    void getRetryAfterSeconds_zeroNanos_returnsZero() {
        RateLimitResult result = new RateLimitResult(true, 5, 0);
        assertThat(result.getRetryAfterSeconds()).isZero();
    }

    @Test
    @DisplayName("getRetryAfterSeconds - negative nanos returns zero")
    void getRetryAfterSeconds_negativeNanos_returnsZero() {
        RateLimitResult result = new RateLimitResult(true, 5, -100);
        assertThat(result.getRetryAfterSeconds()).isZero();
    }

    @Test
    @DisplayName("getRetryAfterSeconds - fractional seconds round up to ceiling")
    void getRetryAfterSeconds_fractionalSeconds_roundsUp() {
        RateLimitResult result1 = new RateLimitResult(false, 0, 100_000_000L); // 0.1s
        RateLimitResult result2 = new RateLimitResult(false, 0, 1_500_000_000L); // 1.5s
        RateLimitResult result3 = new RateLimitResult(false, 0, 12_000_000_000L); // 12s

        assertThat(result1.getRetryAfterSeconds()).isEqualTo(1);
        assertThat(result2.getRetryAfterSeconds()).isEqualTo(2);
        assertThat(result3.getRetryAfterSeconds()).isEqualTo(12);
    }
}
