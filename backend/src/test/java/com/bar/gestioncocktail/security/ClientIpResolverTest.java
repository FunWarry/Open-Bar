package com.bar.gestioncocktail.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link ClientIpResolver}.
 */
class ClientIpResolverTest {

    private ClientIpResolver clientIpResolver;

    @BeforeEach
    void setUp() {
        clientIpResolver = new ClientIpResolver();
    }

    @Test
    @DisplayName("resolveClientIp - extracts first IP from X-Forwarded-For when multiple IPs present")
    void resolveClientIp_withMultipleXForwardedFor_returnsFirstIp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "203.0.113.195, 70.41.3.18, 150.172.238.178");
        request.setRemoteAddr("10.0.0.1");

        String ip = clientIpResolver.resolveClientIp(request);
        assertThat(ip).isEqualTo("203.0.113.195");
    }

    @Test
    @DisplayName("resolveClientIp - extracts single IP from X-Forwarded-For")
    void resolveClientIp_withSingleXForwardedFor_returnsIp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "198.51.100.42");
        request.setRemoteAddr("10.0.0.1");

        String ip = clientIpResolver.resolveClientIp(request);
        assertThat(ip).isEqualTo("198.51.100.42");
    }

    @Test
    @DisplayName("resolveClientIp - falls back to X-Real-IP when X-Forwarded-For is missing")
    void resolveClientIp_withXRealIp_returnsRealIp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Real-IP", "192.0.2.1");
        request.setRemoteAddr("10.0.0.1");

        String ip = clientIpResolver.resolveClientIp(request);
        assertThat(ip).isEqualTo("192.0.2.1");
    }

    @Test
    @DisplayName("resolveClientIp - falls back to remoteAddr when headers are missing")
    void resolveClientIp_withoutHeaders_returnsRemoteAddr() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.100");

        String ip = clientIpResolver.resolveClientIp(request);
        assertThat(ip).isEqualTo("192.168.1.100");
    }

    @Test
    @DisplayName("resolveClientIp - normalizes IPv6 localhost to 127.0.0.1")
    void resolveClientIp_withLocalIpv6_normalizesToIpv4() {
        MockHttpServletRequest request1 = new MockHttpServletRequest();
        request1.setRemoteAddr("0:0:0:0:0:0:0:1");

        MockHttpServletRequest request2 = new MockHttpServletRequest();
        request2.setRemoteAddr("::1");

        assertThat(clientIpResolver.resolveClientIp(request1)).isEqualTo("127.0.0.1");
        assertThat(clientIpResolver.resolveClientIp(request2)).isEqualTo("127.0.0.1");
    }

    @Test
    @DisplayName("resolveClientIp - returns unknown when request is null or empty")
    void resolveClientIp_nullOrEmpty_returnsUnknown() {
        assertThat(clientIpResolver.resolveClientIp(null)).isEqualTo("unknown");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("");
        assertThat(clientIpResolver.resolveClientIp(request)).isEqualTo("unknown");
    }

    @Test
    @DisplayName("resolveClientIp - skips unknown string header values")
    void resolveClientIp_unknownHeaders_skipsToNext() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "unknown");
        request.addHeader("X-Real-IP", "unknown");
        request.setRemoteAddr("10.0.0.5");

        String ip = clientIpResolver.resolveClientIp(request);
        assertThat(ip).isEqualTo("10.0.0.5");
    }
}
