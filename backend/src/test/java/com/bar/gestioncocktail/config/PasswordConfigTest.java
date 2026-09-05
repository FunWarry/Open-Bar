package com.bar.gestioncocktail.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordConfigTest {

    @Test
    @DisplayName("passwordEncoder - should return BCryptPasswordEncoder instance")
    void passwordEncoder_returnsEncoder() {
        PasswordConfig config = new PasswordConfig();
        PasswordEncoder encoder = config.passwordEncoder();

        assertThat(encoder).isNotNull();
        String encoded = encoder.encode("password123");
        assertThat(encoder.matches("password123", encoded)).isTrue();
    }
}
