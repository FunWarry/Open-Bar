package com.bar.gestioncocktail.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtPropertiesTest {

    @Test
    void validate_validSecretOf32CharsOrMore_doesNotThrowException() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("a".repeat(32));
        properties.setExpiration(86400000);

        assertThat(properties.getSecret()).hasSizeGreaterThanOrEqualTo(32);
        assertThatCode(properties::validate).doesNotThrowAnyException();
    }

    private static Stream<Arguments> invalidSecrets() {
        return Stream.of(
                Arguments.of(null, "JWT_SECRET"),
                Arguments.of("", "JWT_SECRET"),
                Arguments.of("   ", "JWT_SECRET"),
                Arguments.of("${JWT_SECRET}", "JWT_SECRET"),
                Arguments.of("trop-court", "256 bits")
        );
    }

    @ParameterizedTest
    @MethodSource("invalidSecrets")
    void validate_invalidSecret_throwsIllegalStateException(String secret, String expectedMessagePart) {
        JwtProperties properties = new JwtProperties();
        properties.setSecret(secret);

        assertThatThrownBy(properties::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining(expectedMessagePart);
    }

    @Test
    void validate_nonAsciiSecretWithFewerThan32CharsButSufficientBytes_doesNotThrow() {
        // "é" = 2 bytes in UTF-8: 20 characters = 40 bytes (>= 32), must be accepted
        // even if the character count is below the threshold.
        JwtProperties properties = new JwtProperties();
        properties.setSecret("é".repeat(20));

        assertThat(properties.getSecret()).hasSize(20);
        assertThatCode(properties::validate).doesNotThrowAnyException();
    }

    @Test
    void toString_doesNotContainPlainSecret() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("secret-tres-confidentiel-32-caracteres");

        assertThat(properties.toString()).doesNotContain("secret-tres-confidentiel-32-caracteres");
    }

    @Test
    void expiration_supportsFourHoursLifespan() {
        JwtProperties properties = new JwtProperties();
        properties.setExpiration(14400000L);

        assertThat(properties.getExpiration()).isEqualTo(14400000L);
    }
}
