package com.bar.gestioncocktail.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtPropertiesTest {

    @Test
    void validate_secretValideDe32CaracteresOuPlus_neLevePasException() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("a".repeat(32));
        properties.setExpiration(86400000);

        assertThat(properties.getSecret()).hasSizeGreaterThanOrEqualTo(32);
        assertThatCode(properties::validate).doesNotThrowAnyException();
    }

    @Test
    void validate_secretNull_leveIllegalStateException() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret(null);

        assertThatThrownBy(properties::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
    }

    @Test
    void validate_secretVide_leveIllegalStateException() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("   ");

        assertThatThrownBy(properties::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
    }

    @Test
    void validate_placeholderNonResolu_leveIllegalStateException() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("${JWT_SECRET}");

        assertThatThrownBy(properties::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
    }

    @Test
    void validate_secretTropCourt_leveIllegalStateExceptionAvecTailleMinimale() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("trop-court");

        assertThatThrownBy(properties::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("256 bits");
    }

    @Test
    void validate_secretNonAsciiAvecMoinsDe32CaracteresMaisAssezDOctets_neLevePasException() {
        // "é" = 2 octets en UTF-8 : 20 caractères = 40 octets (≥ 32), doit être accepté
        // même si le nombre de caractères est inférieur au seuil.
        JwtProperties properties = new JwtProperties();
        properties.setSecret("é".repeat(20));

        assertThat(properties.getSecret()).hasSize(20);
        assertThatCode(properties::validate).doesNotThrowAnyException();
    }

    @Test
    void toString_neContientPasLeSecretEnClair() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("secret-tres-confidentiel-32-caracteres");

        assertThat(properties.toString()).doesNotContain("secret-tres-confidentiel-32-caracteres");
    }
}
