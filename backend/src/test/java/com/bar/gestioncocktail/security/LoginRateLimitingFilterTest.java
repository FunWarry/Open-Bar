package com.bar.gestioncocktail.security;

import com.bar.gestioncocktail.config.RateLimitProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link LoginRateLimitingFilter}.
 */
@ExtendWith(MockitoExtension.class)
class LoginRateLimitingFilterTest {

    @Mock
    private RateLimiterService rateLimiterService;

    @Mock
    private ClientIpResolver clientIpResolver;

    @Mock
    private FilterChain filterChain;

    private RateLimitProperties rateLimitProperties;
    private LoginRateLimitingFilter filter;

    @BeforeEach
    void setUp() {
        rateLimitProperties = new RateLimitProperties();
        rateLimitProperties.getLogin().setEnabled(true);
        rateLimitProperties.getLogin().setPath("/api/auth/login");
        filter = new LoginRateLimitingFilter(rateLimiterService, clientIpResolver, rateLimitProperties);
    }

    @Test
    @DisplayName("doFilter - ignores non-login requests and invokes filter chain")
    void doFilter_nonLoginPath_passesThrough() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/cocktails");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(rateLimiterService);
    }

    @Test
    @DisplayName("doFilter - ignores GET requests on login endpoint")
    void doFilter_loginGetMethod_passesThrough() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/login");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(rateLimiterService);
    }

    @Test
    @DisplayName("doFilter - allows POST login request when rate limit permits")
    void doFilter_loginPostAllowed_invokesFilterChain() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(clientIpResolver.resolveClientIp(request)).thenReturn("192.168.1.50");
        when(rateLimiterService.tryConsumeLogin("192.168.1.50"))
                .thenReturn(new RateLimitResult(true, 4, 0));

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("doFilter - rejects POST login request with 429 when rate limit exceeded")
    void doFilter_loginPostExceeded_returns429TooManyRequests() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(clientIpResolver.resolveClientIp(request)).thenReturn("192.168.1.50");
        when(rateLimiterService.tryConsumeLogin("192.168.1.50"))
                .thenReturn(new RateLimitResult(false, 0, 12_000_000_000L));

        filter.doFilter(request, response, filterChain);

        verify(filterChain, never()).doFilter(any(), any());
        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getHeader("Retry-After")).isEqualTo("12");
        assertThat(response.getHeader("X-Rate-Limit-Retry-After-Seconds")).isEqualTo("12");
        assertThat(response.getContentAsString()).contains("\"status\":429");
        assertThat(response.getContentAsString()).contains("\"error\":\"Too Many Requests\"");
        assertThat(response.getContentAsString()).contains("\"retryAfterSeconds\":12");
    }

    @Test
    @DisplayName("doFilter - passes through when rate limiting is disabled")
    void doFilter_disabled_passesThrough() throws ServletException, IOException {
        rateLimitProperties.getLogin().setEnabled(false);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(rateLimiterService);
    }
}
