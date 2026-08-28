package com.bar.gestioncocktail.security;

import com.bar.gestioncocktail.config.RateLimitProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

/**
 * Servlet filter intercepting authentication requests targeting {@code /api/auth/login}
 * and enforcing IP-based token-bucket rate limiting to protect against brute-force and DoS attacks.
 */
@Component
public class LoginRateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(LoginRateLimitingFilter.class);

    private final RateLimiterService rateLimiterService;
    private final ClientIpResolver clientIpResolver;
    private final RateLimitProperties rateLimitProperties;
    private final ObjectMapper objectMapper;

    /**
     * Constructs the filter with rate limiting dependencies.
     *
     * @param rateLimiterService   Service evaluating rate limits
     * @param clientIpResolver     Resolver extracting client IP addresses
     * @param rateLimitProperties Rate limit configuration properties
     */
    public LoginRateLimitingFilter(
            RateLimiterService rateLimiterService,
            ClientIpResolver clientIpResolver,
            RateLimitProperties rateLimitProperties) {
        this.rateLimiterService = rateLimiterService;
        this.clientIpResolver = clientIpResolver;
        this.rateLimitProperties = rateLimitProperties;
        this.objectMapper = new ObjectMapper();
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        if (!isLoginRequest(request) || !rateLimitProperties.getLogin().isEnabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = clientIpResolver.resolveClientIp(request);
        RateLimitResult result = rateLimiterService.tryConsumeLogin(clientIp);

        if (result.allowed()) {
            filterChain.doFilter(request, response);
            return;
        }

        long retryAfterSeconds = result.getRetryAfterSeconds();
        log.warn("Rate limit exceeded for login attempts from IP: {}. Retry after {} seconds.", clientIp, retryAfterSeconds);

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        response.setHeader("X-Rate-Limit-Retry-After-Seconds", String.valueOf(retryAfterSeconds));

        Map<String, Object> errorBody = Map.of(
                "status", HttpStatus.TOO_MANY_REQUESTS.value(),
                "error", "Too Many Requests",
                "message", "Too many login attempts. Please try again in " + retryAfterSeconds + " seconds.",
                "retryAfterSeconds", retryAfterSeconds
        );

        response.getWriter().write(objectMapper.writeValueAsString(errorBody));
    }

    private boolean isLoginRequest(HttpServletRequest request) {
        String configuredPath = rateLimitProperties.getLogin().getPath();
        return HttpMethod.POST.matches(request.getMethod())
                && (configuredPath != null && configuredPath.equals(request.getRequestURI()));
    }
}
