package com.bar.gestioncocktail.security;

import com.bar.gestioncocktail.config.RateLimitProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link RateLimiterService}.
 */
class RateLimiterServiceTest {

    private RateLimitProperties properties;
    private RateLimiterService rateLimiterService;

    @BeforeEach
    void setUp() {
        properties = new RateLimitProperties();
        properties.getLogin().setEnabled(true);
        properties.getLogin().setCapacity(3);
        properties.getLogin().setRefillTokens(1);
        properties.getLogin().setRefillDurationSeconds(10);
        rateLimiterService = new RateLimiterService(properties);
    }

    @Test
    @DisplayName("tryConsumeLogin - consumes tokens up to capacity")
    void tryConsumeLogin_withinCapacity_returnsAllowedTrue() {
        RateLimitResult res1 = rateLimiterService.tryConsumeLogin("192.168.1.10");
        RateLimitResult res2 = rateLimiterService.tryConsumeLogin("192.168.1.10");
        RateLimitResult res3 = rateLimiterService.tryConsumeLogin("192.168.1.10");

        assertThat(res1.allowed()).isTrue();
        assertThat(res1.remainingTokens()).isEqualTo(2);

        assertThat(res2.allowed()).isTrue();
        assertThat(res2.remainingTokens()).isEqualTo(1);

        assertThat(res3.allowed()).isTrue();
        assertThat(res3.remainingTokens()).isEqualTo(0);
    }

    @Test
    @DisplayName("tryConsumeLogin - exceeds capacity and returns allowed false with retry wait time")
    void tryConsumeLogin_exceedsCapacity_returnsAllowedFalse() {
        rateLimiterService.tryConsumeLogin("192.168.1.20");
        rateLimiterService.tryConsumeLogin("192.168.1.20");
        rateLimiterService.tryConsumeLogin("192.168.1.20");

        RateLimitResult rejected = rateLimiterService.tryConsumeLogin("192.168.1.20");

        assertThat(rejected.allowed()).isFalse();
        assertThat(rejected.remainingTokens()).isZero();
        assertThat(rejected.nanosToWaitForRefill()).isGreaterThan(0);
        assertThat(rejected.getRetryAfterSeconds()).isGreaterThan(0);
    }

    @Test
    @DisplayName("tryConsumeLogin - distinct IPs maintain separate token buckets")
    void tryConsumeLogin_distinctIps_independentBuckets() {
        for (int i = 0; i < 3; i++) {
            rateLimiterService.tryConsumeLogin("10.0.0.1");
        }
        RateLimitResult ip1Exhausted = rateLimiterService.tryConsumeLogin("10.0.0.1");
        RateLimitResult ip2Allowed = rateLimiterService.tryConsumeLogin("10.0.0.2");

        assertThat(ip1Exhausted.allowed()).isFalse();
        assertThat(ip2Allowed.allowed()).isTrue();
        assertThat(rateLimiterService.getActiveBucketsCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("tryConsumeLogin - returns allowed true when disabled")
    void tryConsumeLogin_whenDisabled_alwaysAllowed() {
        properties.getLogin().setEnabled(false);

        for (int i = 0; i < 10; i++) {
            RateLimitResult result = rateLimiterService.tryConsumeLogin("10.0.0.5");
            assertThat(result.allowed()).isTrue();
        }
    }

    @Test
    @DisplayName("tryConsumeLogin - handles null and blank IP gracefully")
    void tryConsumeLogin_nullOrBlankIp_usesFallbackBucket() {
        RateLimitResult res1 = rateLimiterService.tryConsumeLogin(null);
        RateLimitResult res2 = rateLimiterService.tryConsumeLogin("   ");

        assertThat(res1.allowed()).isTrue();
        assertThat(res2.allowed()).isTrue();
        assertThat(rateLimiterService.getActiveBucketsCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("reset - clears all active rate limit buckets")
    void reset_clearsAllBuckets() {
        rateLimiterService.tryConsumeLogin("1.1.1.1");
        rateLimiterService.tryConsumeLogin("2.2.2.2");
        assertThat(rateLimiterService.getActiveBucketsCount()).isEqualTo(2);

        rateLimiterService.reset();

        assertThat(rateLimiterService.getActiveBucketsCount()).isZero();
    }

    @Test
    @DisplayName("reset(ip) - clears specific client IP bucket")
    void resetSpecificIp_clearsTargetBucketOnly() {
        rateLimiterService.tryConsumeLogin("1.1.1.1");
        rateLimiterService.tryConsumeLogin("2.2.2.2");

        rateLimiterService.reset("1.1.1.1");
        rateLimiterService.reset(null);

        assertThat(rateLimiterService.getActiveBucketsCount()).isEqualTo(1);
        RateLimitResult res = rateLimiterService.tryConsumeLogin("1.1.1.1");
        assertThat(res.remainingTokens()).isEqualTo(2);
    }
}
