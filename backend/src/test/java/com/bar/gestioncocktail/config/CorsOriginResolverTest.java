package com.bar.gestioncocktail.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CorsOriginResolverTest {

    @Test
    @DisplayName("resolveEffectiveOrigins - dev profile returns configured origins")
    void resolveEffectiveOrigins_devProfile_returnsConfiguredOrigins() {
        MockEnvironment devEnv = new MockEnvironment();
        devEnv.setActiveProfiles("dev");
        CorsOriginResolver resolver = new CorsOriginResolver(devEnv, List.of("http://localhost:4200"));

        List<String> origins = resolver.resolveEffectiveOrigins();

        assertThat(origins).containsExactly("http://localhost:4200");
    }

    @Test
    @DisplayName("resolveEffectiveOrigins - dev profile defaults to wildcard when origin list is empty")
    void resolveEffectiveOrigins_devProfile_defaultsToWildcard() {
        MockEnvironment devEnv = new MockEnvironment();
        devEnv.setActiveProfiles("dev");
        CorsOriginResolver resolver = new CorsOriginResolver(devEnv, List.of());

        List<String> origins = resolver.resolveEffectiveOrigins();

        assertThat(origins).containsExactly("*");
    }

    @Test
    @DisplayName("resolveEffectiveOrigins - dev profile defaults to wildcard when origin list is null")
    void resolveEffectiveOrigins_devProfile_nullListDefaultsToWildcard() {
        MockEnvironment devEnv = new MockEnvironment();
        devEnv.setActiveProfiles("dev");
        CorsOriginResolver resolver = new CorsOriginResolver(devEnv, null);

        List<String> origins = resolver.resolveEffectiveOrigins();

        assertThat(origins).containsExactly("*");
    }

    @Test
    @DisplayName("resolveEffectiveOrigins - prod profile filters out wildcard '*' and returns valid origins")
    void resolveEffectiveOrigins_prodProfile_filtersWildcard() {
        MockEnvironment prodEnv = new MockEnvironment();
        prodEnv.setActiveProfiles("prod");
        CorsOriginResolver resolver = new CorsOriginResolver(
                prodEnv,
                List.of("*", "https://open-bar.freeboxos.fr", "http://192.168.1.50:4200", " ")
        );

        List<String> origins = resolver.resolveEffectiveOrigins();

        assertThat(origins)
                .doesNotContain("*")
                .doesNotContain(" ")
                .containsExactly("https://open-bar.freeboxos.fr", "http://192.168.1.50:4200");
    }

    @Test
    @DisplayName("resolveEffectiveOrigins - prod profile falls back to secure default subnets when list is only wildcard")
    void resolveEffectiveOrigins_prodProfile_fallsBackToAuthorizedSubnets() {
        MockEnvironment prodEnv = new MockEnvironment();
        prodEnv.setActiveProfiles("prod");
        CorsOriginResolver resolver = new CorsOriginResolver(prodEnv, List.of("*"));

        List<String> origins = resolver.resolveEffectiveOrigins();

        assertThat(origins)
                .doesNotContain("*")
                .contains(
                        "http://localhost:[*]",
                        "http://127.0.0.1:[*]",
                        "https://open-bar.freeboxos.fr",
                        "http://192.168.*:[*]",
                        "http://10.*:[*]",
                        "http://172.16.*:[*]"
                );
    }

    @Test
    @DisplayName("resolveEffectiveOrigins - prod profile falls back to secure default subnets when list is empty or null")
    void resolveEffectiveOrigins_prodProfile_nullOrEmptyListFallsBack() {
        MockEnvironment prodEnv = new MockEnvironment();
        prodEnv.setActiveProfiles("prod");
        CorsOriginResolver resolver = new CorsOriginResolver(prodEnv, null);

        List<String> origins = resolver.resolveEffectiveOrigins();

        assertThat(origins)
                .contains(
                        "http://localhost:[*]",
                        "https://open-bar.freeboxos.fr"
                );
    }

    @Test
    @DisplayName("isProdProfile - returns true only when prod profile is active")
    void isProdProfile() {
        MockEnvironment prodEnv = new MockEnvironment();
        prodEnv.setActiveProfiles("prod");
        CorsOriginResolver prodResolver = new CorsOriginResolver(prodEnv, List.of());

        MockEnvironment devEnv = new MockEnvironment();
        devEnv.setActiveProfiles("dev");
        CorsOriginResolver devResolver = new CorsOriginResolver(devEnv, List.of());

        assertThat(prodResolver.isProdProfile()).isTrue();
        assertThat(devResolver.isProdProfile()).isFalse();
    }
}
