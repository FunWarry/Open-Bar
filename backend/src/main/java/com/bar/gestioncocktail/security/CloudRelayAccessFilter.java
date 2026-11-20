package com.bar.gestioncocktail.security;

import com.bar.gestioncocktail.service.relay.CloudRelayAccessService;
import com.bar.gestioncocktail.service.relay.CloudRelayAccessService.RelayAccessDecision;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

/**
 * Security filter enforcing configurable Cloud Relay tunnel access policies
 * (global client/staff/admin/hardware toggles, allowed roles, and per-user overrides).
 */
@Component
public class CloudRelayAccessFilter extends OncePerRequestFilter {

    private final CloudRelayAccessService cloudRelayAccessService;
    private final ObjectMapper objectMapper;

    /**
     * Constructs CloudRelayAccessFilter with policy evaluation service and JSON serializer.
     *
     * @param cloudRelayAccessService Tunnel access policy evaluation service
     * @param objectMapper            Jackson object mapper
     */
    public CloudRelayAccessFilter(CloudRelayAccessService cloudRelayAccessService, ObjectMapper objectMapper) {
        this.cloudRelayAccessService = cloudRelayAccessService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        RelayAccessDecision decision = cloudRelayAccessService.evaluateRequest(request, authentication);
        if (!decision.allowed()) {
            response.setStatus(decision.statusCode());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(), Map.of(
                    "status", decision.statusCode(),
                    "error", decision.statusCode() == 503 ? "Service Unavailable" : "Forbidden",
                    "errorCode", decision.errorCode(),
                    "message", decision.message()
            ));
            return;
        }
        filterChain.doFilter(request, response);
    }
}
