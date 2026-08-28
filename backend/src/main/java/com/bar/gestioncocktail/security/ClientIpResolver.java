package com.bar.gestioncocktail.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

/**
 * Utility component resolving the real client IP address from HTTP servlet requests,
 * taking proxy headers (such as {@code X-Forwarded-For} and {@code X-Real-IP}) into account.
 */
@Component
public class ClientIpResolver {

    private static final String UNKNOWN = "unknown";
    private static final String IP_LOCAL_IPV6 = "0:0:0:0:0:0:0:1";
    private static final String IP_LOCAL_IPV4 = "127.0.0.1";

    /**
     * Resolves the originating client IP address from the request.
     *
     * @param request HTTP servlet request
     * @return Resolved client IP address, or "unknown" if resolution fails
     */
    public String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return UNKNOWN;
        }

        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (isValidIpHeader(xForwardedFor)) {
            String firstIp = xForwardedFor.split(",")[0].trim();
            if (isValidIp(firstIp)) {
                return normalizeIp(firstIp);
            }
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (isValidIpHeader(xRealIp)) {
            String trimmedIp = xRealIp.trim();
            if (isValidIp(trimmedIp)) {
                return normalizeIp(trimmedIp);
            }
        }

        String remoteAddr = request.getRemoteAddr();
        if (remoteAddr != null && !remoteAddr.isBlank()) {
            return normalizeIp(remoteAddr.trim());
        }

        return UNKNOWN;
    }

    private boolean isValidIpHeader(String headerValue) {
        return headerValue != null && !headerValue.isBlank() && !UNKNOWN.equalsIgnoreCase(headerValue.trim());
    }

    private boolean isValidIp(String ip) {
        return ip != null && !ip.isBlank() && !UNKNOWN.equalsIgnoreCase(ip);
    }

    private String normalizeIp(String ip) {
        if (IP_LOCAL_IPV6.equals(ip) || "::1".equals(ip)) {
            return IP_LOCAL_IPV4;
        }
        return ip;
    }
}
