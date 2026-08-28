package com.bar.gestioncocktail.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link RateLimitProperties}.
 */
class RateLimitPropertiesTest {

    @Test
    @DisplayName("getters and setters - correctly update configuration values")
    void gettersAndSetters_updateValues() {
        RateLimitProperties properties = new RateLimitProperties();
        RateLimitProperties.Login login = new RateLimitProperties.Login();

        login.setEnabled(false);
        login.setPath("/custom/auth/login");
        login.setCapacity(10);
        login.setRefillTokens(2);
        login.setRefillDurationSeconds(30);

        properties.setLogin(login);

        assertThat(properties.getLogin().isEnabled()).isFalse();
        assertThat(properties.getLogin().getPath()).isEqualTo("/custom/auth/login");
        assertThat(properties.getLogin().getCapacity()).isEqualTo(10);
        assertThat(properties.getLogin().getRefillTokens()).isEqualTo(2);
        assertThat(properties.getLogin().getRefillDurationSeconds()).isEqualTo(30);
    }

    @Test
    @DisplayName("defaults - have expected values")
    void defaultValues_asExpected() {
        RateLimitProperties properties = new RateLimitProperties();
        assertThat(properties.getLogin().isEnabled()).isTrue();
        assertThat(properties.getLogin().getPath()).isNull();
        assertThat(properties.getLogin().getCapacity()).isEqualTo(5);
        assertThat(properties.getLogin().getRefillTokens()).isEqualTo(1);
        assertThat(properties.getLogin().getRefillDurationSeconds()).isEqualTo(12);
    }
}
