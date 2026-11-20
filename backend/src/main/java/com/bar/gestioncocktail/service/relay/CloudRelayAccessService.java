package com.bar.gestioncocktail.service.relay;

import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import com.bar.gestioncocktail.repository.UserRepository;
import com.bar.gestioncocktail.service.AppSettingsService;
import com.bar.gestioncocktail.service.EstablishmentConfigService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Set;

/**
 * Service evaluating configurable universal access control policies for requests arriving
 * through the outbound Cloud Relay tunnel across 3 levels:
 * global scope toggles (clients, staff, admin, remote TPE, remote printing),
 * allowed staff roles, and per-user {@code remoteAccessEnabled} overrides.
 */
@Service
public class CloudRelayAccessService {

    /** HTTP header marking requests proxied from the Cloud Relay gateway. */
    public static final String HEADER_VIA_RELAY = "X-OpenBar-Via-Relay";
    /** Internal cryptographic token header authenticating local tunnel dispatcher traffic. */
    public static final String HEADER_RELAY_TOKEN = "X-OpenBar-Relay-Token";
    /** Original public hostname forwarded by the Cloud Relay gateway. */
    public static final String HEADER_FORWARDED_HOST = "X-Forwarded-Host";

    private static final int SC_FORBIDDEN = 403;
    private static final int SC_SERVICE_UNAVAILABLE = 503;

    private final AppSettingsService appSettingsService;
    private final EstablishmentConfigService establishmentConfigService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final String internalTunnelToken;

    /**
     * Constructs CloudRelayAccessService with settings, module config, user lookup, and JSON mapper.
     *
     * @param appSettingsService         Establishment settings service
     * @param establishmentConfigService Modular capability config service
     * @param userRepository             User repository for per-user remote access overrides
     * @param objectMapper               Jackson object mapper
     */
    public CloudRelayAccessService(
            AppSettingsService appSettingsService,
            EstablishmentConfigService establishmentConfigService,
            UserRepository userRepository,
            ObjectMapper objectMapper) {
        this.appSettingsService = appSettingsService;
        this.establishmentConfigService = establishmentConfigService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        byte[] randomBytes = new byte[32];
        new SecureRandom().nextBytes(randomBytes);
        this.internalTunnelToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    /**
     * Returns the per-instance internal token attached by {@link RelayLocalDispatcher}.
     *
     * @return Base64-encoded random secret
     */
    public String getInternalTunnelToken() {
        return internalTunnelToken;
    }

    /**
     * Determines whether the given HTTP request legitimately originated from the Cloud Relay tunnel.
     *
     * @param request Incoming servlet request
     * @return {@code true} if marked with {@code X-OpenBar-Via-Relay: true} and valid relay token
     */
    public boolean isTunnelRequest(HttpServletRequest request) {
        if (request == null) {
            return false;
        }
        String viaRelay = request.getHeader(HEADER_VIA_RELAY);
        if (!"true".equalsIgnoreCase(viaRelay)) {
            return false;
        }
        String providedToken = request.getHeader(HEADER_RELAY_TOKEN);
        if (providedToken == null || providedToken.isBlank()) {
            return false;
        }
        if (constantTimeEquals(internalTunnelToken, providedToken)) {
            return true;
        }
        AppSettings settings = appSettingsService.getSettings();
        String pairingToken = settings != null ? settings.getRelayPairingToken() : null;
        return pairingToken != null && !pairingToken.isBlank() && constantTimeEquals(pairingToken, providedToken);
    }

    /**
     * Evaluates whether the current HTTP request (if originating from Cloud Relay) is allowed
     * according to module state, scope toggles, hardware policies, role allowlist, and user override.
     *
     * @param request        Incoming HTTP request
     * @param authentication Optional authenticated principal
     * @return {@link RelayAccessDecision} describing allowance or rejection details
     */
    public RelayAccessDecision evaluateRequest(HttpServletRequest request, Authentication authentication) {
        if (!isTunnelRequest(request)) {
            return RelayAccessDecision.allow();
        }
        String path = request.getRequestURI();
        if (isAlwaysAccessibleFallbackEndpoint(path)) {
            return RelayAccessDecision.allow();
        }

        AppSettings settings = appSettingsService.getSettings();
        if (!establishmentConfigService.isModuleEnabled(EstablishmentModule.CLOUD_RELAY)
                || !Boolean.TRUE.equals(settings.getCloudRelayEnabled())) {
            return RelayAccessDecision.deny(SC_SERVICE_UNAVAILABLE, "CLOUD_RELAY_OFFLINE",
                    "Cloud Relay remote access is currently disabled for this establishment.");
        }

        if (isHardwareTpePath(path) && !Boolean.TRUE.equals(settings.getCloudRelayRemoteTpeEnabled())) {
            return RelayAccessDecision.deny(SC_FORBIDDEN, "RELAY_REMOTE_TPE_DISABLED",
                    "Remote payment terminal (TPE) dispatch via Cloud Relay is disabled by establishment policy.");
        }

        if (isHardwarePrinterPath(path) && !Boolean.TRUE.equals(settings.getCloudRelayRemotePrintingEnabled())) {
            return RelayAccessDecision.deny(SC_FORBIDDEN, "RELAY_REMOTE_PRINTING_DISABLED",
                    "Remote thermal printer dispatch via Cloud Relay is disabled by establishment policy.");
        }

        if (isPatronPublicPath(path)) {
            if (!Boolean.TRUE.equals(settings.getCloudRelayClientsEnabled())) {
                return RelayAccessDecision.deny(SC_FORBIDDEN, "RELAY_CLIENT_ACCESS_DISABLED",
                        "Patron remote access via Cloud Relay is disabled by establishment policy.");
            }
            return RelayAccessDecision.allow();
        }

        if (isAuthPath(path)) {
            return RelayAccessDecision.allow();
        }

        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return RelayAccessDecision.allow();
        }

        return evaluateAuthenticatedAccess(path, authentication.getName(), settings);
    }

    /**
     * Evaluates authenticated user access during login or API request processing over the tunnel.
     *
     * @param path     Request URI path
     * @param username Authenticated username
     * @param settings Current establishment settings
     * @return {@link RelayAccessDecision}
     */
    public RelayAccessDecision evaluateAuthenticatedAccess(String path, String username, AppSettings settings) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return RelayAccessDecision.deny(SC_FORBIDDEN, "RELAY_USER_ACCESS_DISABLED",
                    "User account is not authorized for Cloud Relay access.");
        }
        return evaluateUserPolicy(path, user, settings);
    }

    /**
     * Verifies at login time whether the authenticating user is permitted to log in via Cloud Relay.
     *
     * @param request Current HTTP request
     * @param user    Authenticated user entity
     */
    public void assertLoginAllowedIfTunnel(HttpServletRequest request, User user) {
        if (!isTunnelRequest(request) || user == null) {
            return;
        }
        AppSettings settings = appSettingsService.getSettings();
        if (!establishmentConfigService.isModuleEnabled(EstablishmentModule.CLOUD_RELAY)
                || !Boolean.TRUE.equals(settings.getCloudRelayEnabled())) {
            throw new AccessDeniedException("Cloud Relay remote login is disabled for this establishment.");
        }
        RelayAccessDecision decision = evaluateUserPolicy("/api/auth/login", user, settings);
        if (!decision.allowed()) {
            throw new AccessDeniedException(decision.message());
        }
    }

    /**
     * Guards hardware TPE execution when the current HTTP request arrived through the Cloud Relay tunnel.
     */
    public void assertRemoteTpeAllowedInCurrentRequest() {
        HttpServletRequest currentRequest = getCurrentRequest();
        if (currentRequest != null && isTunnelRequest(currentRequest)) {
            AppSettings settings = appSettingsService.getSettings();
            if (!Boolean.TRUE.equals(settings.getCloudRelayRemoteTpeEnabled())) {
                throw new BusinessException("Remote TPE payment dispatch via Cloud Relay is disabled in establishment settings.");
            }
        }
    }

    /**
     * Guards ESC/POS LAN printing when the current HTTP request arrived through the Cloud Relay tunnel.
     */
    public void assertRemotePrintingAllowedInCurrentRequest() {
        HttpServletRequest currentRequest = getCurrentRequest();
        if (currentRequest != null && isTunnelRequest(currentRequest)) {
            AppSettings settings = appSettingsService.getSettings();
            if (!Boolean.TRUE.equals(settings.getCloudRelayRemotePrintingEnabled())) {
                throw new BusinessException("Remote LAN printing via Cloud Relay is disabled in establishment settings.");
            }
        }
    }

    /**
     * Parses the JSON array of roles allowed to access OpenBar through the Cloud Relay tunnel.
     *
     * @param allowedRolesJson JSON string from {@link AppSettings#getCloudRelayAllowedRolesJson()}
     * @return List of allowed role names
     */
    public List<String> parseAllowedRoles(String allowedRolesJson) {
        if (allowedRolesJson == null || allowedRolesJson.isBlank()) {
            return List.of("SERVEUR", "BARMAN", "MANAGER", "ADMIN");
        }
        try {
            List<String> parsed = objectMapper.readValue(allowedRolesJson, new TypeReference<>() {
            });
            return parsed != null ? parsed : Collections.emptyList();
        } catch (Exception _) {
            return List.of("SERVEUR", "BARMAN", "MANAGER", "ADMIN");
        }
    }

    private RelayAccessDecision evaluateUserPolicy(String path, User user, AppSettings settings) {
        if (!Boolean.TRUE.equals(user.getRemoteAccessEnabled())) {
            return RelayAccessDecision.deny(SC_FORBIDDEN, "RELAY_USER_ACCESS_DISABLED",
                    "Remote Cloud Relay access has been disabled for your user account.");
        }

        boolean isAdminPath = isAdminPath(path);
        if (isAdminPath && !Boolean.TRUE.equals(settings.getCloudRelayAdminEnabled())) {
            return RelayAccessDecision.deny(SC_FORBIDDEN, "RELAY_ADMIN_ACCESS_DISABLED",
                    "Administrative console access via Cloud Relay is disabled by establishment policy.");
        }

        boolean isOnlyAdminRole = user.getRoles() != null
                && user.getRoles().size() == 1
                && user.getRoles().contains(UserRole.ADMIN);

        if (!isAdminPath && !Boolean.TRUE.equals(settings.getCloudRelayStaffEnabled())
                && !(isOnlyAdminRole && Boolean.TRUE.equals(settings.getCloudRelayAdminEnabled()))) {
            return RelayAccessDecision.deny(SC_FORBIDDEN, "RELAY_STAFF_ACCESS_DISABLED",
                    "Staff access via Cloud Relay is currently disabled by establishment policy.");
        }

        List<String> allowedRoles = parseAllowedRoles(settings.getCloudRelayAllowedRolesJson());
        Set<UserRole> userRoles = user.getRoles() != null ? user.getRoles() : Collections.emptySet();
        boolean rolePermitted = userRoles.stream().anyMatch(r -> allowedRoles.contains(r.name()));
        if (!rolePermitted) {
            return RelayAccessDecision.deny(SC_FORBIDDEN, "RELAY_ROLE_ACCESS_DISABLED",
                    "Your user role is not authorized to access OpenBar via the Cloud Relay tunnel.");
        }

        return RelayAccessDecision.allow();
    }

    private static boolean isAlwaysAccessibleFallbackEndpoint(String path) {
        if (path == null) {
            return false;
        }
        return path.equals("/api/public/branding")
                || path.equals("/api/public/cloud-relay/health")
                || path.startsWith("/actuator/health")
                || path.startsWith("/api/actuator/health");
    }

    private static boolean isHardwareTpePath(String path) {
        return path != null && path.startsWith("/api/tpe");
    }

    private static boolean isHardwarePrinterPath(String path) {
        return path != null && path.startsWith("/api/printers");
    }

    private static boolean isAdminPath(String path) {
        return path != null && path.startsWith("/api/admin");
    }

    private static boolean isAuthPath(String path) {
        return path != null && path.startsWith("/api/auth");
    }

    private static boolean isPatronPublicPath(String path) {
        if (path == null) {
            return false;
        }
        return path.startsWith("/api/public/")
                || path.startsWith("/api/client/")
                || path.startsWith("/api/roulette/public/")
                || path.equals("/api/cocktails")
                || path.startsWith("/api/cocktails/")
                || path.equals("/api/happy-hour")
                || path.startsWith("/api/happy-hour/")
                || path.equals("/api/establishment/modules")
                || path.equals("/api/settings");
    }

    private static HttpServletRequest getCurrentRequest() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            return attrs.getRequest();
        }
        return null;
    }

    private static boolean constantTimeEquals(String expected, String actual) {
        if (expected == null || actual == null) {
            return false;
        }
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Access decision result produced by {@link CloudRelayAccessService}.
     *
     * @param allowed    Whether access is granted
     * @param statusCode HTTP status code if denied
     * @param errorCode  Machine-readable error code if denied
     * @param message    Human-readable error reason if denied
     */
    public record RelayAccessDecision(boolean allowed, int statusCode, String errorCode, String message) {
        public static RelayAccessDecision allow() {
            return new RelayAccessDecision(true, 200, null, null);
        }

        public static RelayAccessDecision deny(int statusCode, String errorCode, String message) {
            return new RelayAccessDecision(false, statusCode, errorCode, message);
        }
    }
}
