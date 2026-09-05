package com.bar.gestioncocktail.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.web.csrf.CsrfToken;

import static org.assertj.core.api.Assertions.assertThat;

class PassthroughCsrfTokenRepositoryTest {

    private final PassthroughCsrfTokenRepository repository = new PassthroughCsrfTokenRepository();

    @Test
    @DisplayName("generateToken - should return non-null token with expected header and parameter name")
    void generateToken_returnsValidToken() {
        CsrfToken token = repository.generateToken(null);

        assertThat(token).isNotNull();
        assertThat(token.getHeaderName()).isEqualTo("X-XSRF-TOKEN");
        assertThat(token.getParameterName()).isEqualTo("_csrf");
        assertThat(token.getToken()).isEqualTo("stateless-jwt-token");
    }

    @Test
    @DisplayName("loadToken - should return matching token for passthrough validation")
    void loadToken_returnsMatchingToken() {
        CsrfToken token = repository.loadToken(null);

        assertThat(token).isNotNull();
        assertThat(token.getToken()).isEqualTo("stateless-jwt-token");
    }

    @Test
    @DisplayName("loadToken - with request header should return header value")
    void loadToken_withHeader_returnsHeaderValue() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-XSRF-TOKEN", "custom-token");

        CsrfToken token = repository.loadToken(request);

        assertThat(token).isNotNull();
        assertThat(token.getToken()).isEqualTo("custom-token");
    }

    @Test
    @DisplayName("loadToken - with empty request should return null token for matching null header")
    void loadToken_withoutHeader_returnsNullToken() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        CsrfToken token = repository.loadToken(request);

        assertThat(token).isNotNull();
        assertThat(token.getToken()).isNull();
    }

    @Test
    @DisplayName("saveToken - should execute without error as no-op")
    void saveToken_doesNotThrow() {
        org.assertj.core.api.Assertions.assertThatNoException()
                .isThrownBy(() -> repository.saveToken(null, null, null));
    }
}
