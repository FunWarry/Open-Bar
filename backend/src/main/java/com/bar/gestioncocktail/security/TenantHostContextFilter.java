package com.bar.gestioncocktail.security;

import com.bar.gestioncocktail.config.CloudRelayProperties;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.service.AppSettingsService;
import com.bar.gestioncocktail.service.relay.CloudRelayAccessService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Locale;
import java.util.Map;

/**
 * Multi-tenant subdomain and custom domain host-resolution middleware.
 * <p>
 * Extracts the venue slug from {@code X-Forwarded-Host} or {@code Host} headers
 * (e.g. {@code le-shaker.open-bar.eu -> le-shaker}) or matches white-label CNAME hostnames,
 * and rejects misdirected tunnel traffic with HTTP 421 when a configured venue host does not match.
 */
@Component
public class TenantHostContextFilter extends OncePerRequestFilter {

    /** Request attribute storing the normalized effective host header. */
    public static final String ATTR_RESOLVED_HOST = "openbar.resolvedHost";
    /** Request attribute storing the resolved venue subdomain slug if present. */
    public static final String ATTR_RESOLVED_VENUE_SLUG = "openbar.resolvedVenueSlug";

    private static final int SC_MISDIRECTED_REQUEST = 421;

    private final AppSettingsService appSettingsService;
    private final CloudRelayAccessService cloudRelayAccessService;
    private final CloudRelayProperties cloudRelayProperties;
    private final ObjectMapper objectMapper;

    /**
     * Constructs TenantHostContextFilter with settings, relay access service, and properties.
     *
     * @param appSettingsService      Establishment settings service
     * @param cloudRelayAccessService Tunnel verification service
     * @param cloudRelayProperties    Cloud Relay properties
     * @param objectMapper            Jackson JSON serializer
     */
    public TenantHostContextFilter(
            AppSettingsService appSettingsService,
            CloudRelayAccessService cloudRelayAccessService,
            CloudRelayProperties cloudRelayProperties,
            ObjectMapper objectMapper) {
        this.appSettingsService = appSettingsService;
        this.cloudRelayAccessService = cloudRelayAccessService;
        this.cloudRelayProperties = cloudRelayProperties;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String rawHost = resolveRawHost(request);
        String normalizedHost = stripPort(rawHost);
        if (normalizedHost != null) {
            request.setAttribute(ATTR_RESOLVED_HOST, normalizedHost);
            String baseDomain = normalizeBaseDomain(cloudRelayProperties.getBaseDomain());
            String extractedSlug = extractSubdomainSlug(normalizedHost, baseDomain);
            if (extractedSlug != null) {
                request.setAttribute(ATTR_RESOLVED_VENUE_SLUG, extractedSlug);
            }

            if (cloudRelayAccessService.isTunnelRequest(request) && !isHostAuthorizedForVenue(normalizedHost, baseDomain)) {
                response.setStatus(SC_MISDIRECTED_REQUEST);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                objectMapper.writeValue(response.getWriter(), Map.of(
                        "status", SC_MISDIRECTED_REQUEST,
                        "error", "Misdirected Request",
                        "errorCode", "TENANT_HOST_MISMATCH",
                        "message", "Incoming public host does not match configured venue subdomain or custom domain"
                ));
                return;
            }
        }
        filterChain.doFilter(request, response);
    }

    /**
     * Extracts the subdomain slug when {@code host} is a direct child of {@code baseDomain}.
     *
     * @param host       Normalized lowercase host without port
     * @param baseDomain Base Cloud Relay domain (e.g. {@code open-bar.eu})
     * @return Subdomain slug or {@code null} if not a matching subdomain
     */
    public static String extractSubdomainSlug(String host, String baseDomain) {
        if (host == null || baseDomain == null || baseDomain.isBlank()) {
            return null;
        }
        String suffix = "." + baseDomain;
        if (!host.endsWith(suffix) || host.length() <= suffix.length()) {
            return null;
        }
        String candidate = host.substring(0, host.length() - suffix.length());
        return candidate.contains(".") ? null : candidate;
    }

    private boolean isHostAuthorizedForVenue(String normalizedHost, String baseDomain) {
        AppSettings settings = appSettingsService.getSettings();
        if (settings == null) {
            return true;
        }
        String customDomain = normalizeDomain(settings.getCustomDomain());
        if (customDomain != null && customDomain.equals(normalizedHost)) {
            return true;
        }
        String configuredSlug = settings.getVenueSlug() != null
                ? settings.getVenueSlug().trim().toLowerCase(Locale.ROOT)
                : null;
        if (configuredSlug != null && !configuredSlug.isBlank()) {
            String expectedSubdomain = configuredSlug + "." + baseDomain;
            return expectedSubdomain.equals(normalizedHost);
        }
        return customDomain == null;
    }

    private static String resolveRawHost(HttpServletRequest request) {
        String forwardedHost = request.getHeader(CloudRelayAccessService.HEADER_FORWARDED_HOST);
        if (forwardedHost != null && !forwardedHost.isBlank()) {
            int commaIdx = forwardedHost.indexOf(',');
            return commaIdx >= 0 ? forwardedHost.substring(0, commaIdx) : forwardedHost;
        }
        return request.getHeader("Host");
    }

    private static String stripPort(String host) {
        if (host == null || host.isBlank()) {
            return null;
        }
        String trimmed = host.trim().toLowerCase(Locale.ROOT);
        int colonIdx = trimmed.indexOf(':');
        return colonIdx > 0 ? trimmed.substring(0, colonIdx) : trimmed;
    }

    private static String normalizeDomain(String domain) {
        if (domain == null || domain.isBlank()) {
            return null;
        }
        return domain.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeBaseDomain(String domain) {
        String normalized = normalizeDomain(domain);
        return normalized != null ? normalized : "open-bar.eu";
    }
}
