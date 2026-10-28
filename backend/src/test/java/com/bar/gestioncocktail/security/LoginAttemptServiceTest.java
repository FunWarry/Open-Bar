package com.bar.gestioncocktail.security;

import com.bar.gestioncocktail.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for {@link LoginAttemptService} verifying brute-force rate limiting and lockout behavior.
 */
class LoginAttemptServiceTest {

    @Test
    @DisplayName("Should allow attempts below threshold and block after reaching max attempts")
    void shouldBlockAfterMaxAttempts() {
        LoginAttemptService service = new LoginAttemptService(3, 60L);

        assertThat(service.isBlocked("login:alice")).isFalse();
        service.checkAllowed("login:alice");

        service.recordFailure("login:alice");
        service.recordFailure("login:alice");
        assertThat(service.isBlocked("login:alice")).isFalse();

        service.recordFailure("login:alice");
        assertThat(service.isBlocked("login:alice")).isTrue();

        assertThatThrownBy(() -> service.checkAllowed("login:alice"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Too many failed attempts");
    }

    @Test
    @DisplayName("Should reset failure count upon successful authentication")
    void shouldResetOnSuccess() {
        LoginAttemptService service = new LoginAttemptService(3, 60L);

        service.recordFailure("login:bob");
        service.recordFailure("login:bob");
        service.recordSuccess("login:bob");

        service.recordFailure("login:bob");
        service.recordFailure("login:bob");
        assertThat(service.isBlocked("login:bob")).isFalse();
    }

    @Test
    @DisplayName("Should automatically unblock after lockout window expires")
    void shouldUnblockWhenLockoutExpires() {
        LoginAttemptService service = new LoginAttemptService(2, -1L);

        service.recordFailure("roulette-pin");
        service.recordFailure("roulette-pin");

        assertThat(service.isBlocked("roulette-pin")).isFalse();
        service.checkAllowed("roulette-pin");
        service.recordFailure("roulette-pin");
        assertThat(service.isBlocked("roulette-pin")).isFalse();
    }

    @Test
    @DisplayName("Should handle null keys, default constructor, and resetAll cleanly")
    void shouldHandleNullKeyAndResetAll() {
        LoginAttemptService defaultService = new LoginAttemptService();
        assertThat(defaultService.isBlocked("login:test")).isFalse();

        LoginAttemptService service = new LoginAttemptService(1, 60L);

        service.recordFailure(null);
        assertThat(service.isBlocked(null)).isTrue();

        service.resetAll();
        assertThat(service.isBlocked(null)).isFalse();
    }
}

