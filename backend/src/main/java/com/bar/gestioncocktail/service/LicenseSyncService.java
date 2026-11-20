package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.config.LicenseProperties;
import com.bar.gestioncocktail.dto.LicenseStatusDTO;
import com.bar.gestioncocktail.dto.LicenseSyncResultDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Service handling automatic background and on-demand online license synchronization.
 * <p>
 * Probes connectivity to the configured licensing authority endpoint and transparently
 * refreshes signed JWT license tokens when internet connectivity is available, while
 * remaining 100% non-blocking and fail-open for air-gapped on-premise bars.
 */
@Service
public class LicenseSyncService {

    private static final Logger log = LoggerFactory.getLogger(LicenseSyncService.class);
    private static final String STATUS_OFFLINE = "OFFLINE";
    private static final String STATUS_FAILED = "FAILED";
    private static final String STATUS_UP_TO_DATE = "UP_TO_DATE";
    private static final String STATUS_SUCCESS = "SUCCESS";

    private final LicenseService licenseService;
    private final LicenseProperties licenseProperties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String appVersion;

    /**
     * Constructs LicenseSyncService with default JDK {@link HttpClient}.
     *
     * @param licenseService    Core licensing service
     * @param licenseProperties Licensing properties
     * @param objectMapper      Jackson JSON mapper
     * @param appVersion        Running OpenBar backend version
     */
    @Autowired
    public LicenseSyncService(
            LicenseService licenseService,
            LicenseProperties licenseProperties,
            ObjectMapper objectMapper,
            @Value("${openbar.version:0.8.0}") String appVersion) {
        this(
                licenseService,
                licenseProperties,
                objectMapper,
                HttpClient.newBuilder()
                        .connectTimeout(Duration.ofMillis(Math.max(1000, licenseProperties.getSyncTimeoutMs())))
                        .build(),
                appVersion
        );
    }

    /**
     * Constructs LicenseSyncService with an explicit {@link HttpClient} for unit testing.
     *
     * @param licenseService    Core licensing service
     * @param licenseProperties Licensing properties
     * @param objectMapper      Jackson JSON mapper
     * @param httpClient        HTTP client used for sync requests
     * @param appVersion        Running OpenBar backend version
     */
    public LicenseSyncService(
            LicenseService licenseService,
            LicenseProperties licenseProperties,
            ObjectMapper objectMapper,
            HttpClient httpClient,
            String appVersion) {
        this.licenseService = licenseService;
        this.licenseProperties = licenseProperties;
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
        this.appVersion = appVersion;
    }

    /**
     * Scheduled background synchronization job triggered periodically when {@code openbar.licensing.sync-enabled=true}.
     * Advances the monotonic clock high-water mark and attempts an online license refresh silently.
     */
    @Scheduled(
            fixedDelayString = "${openbar.licensing.sync-interval-ms:21600000}",
            initialDelayString = "${openbar.licensing.sync-initial-delay-ms:30000}"
    )
    public void scheduledSync() {
        licenseService.touchClockHighWaterMark();
        if (!licenseProperties.isSyncEnabled()) {
            return;
        }
        try {
            syncNow("scheduler");
        } catch (Exception ex) {
            log.debug("Background license sync skipped cleanly: {}", ex.getMessage());
        }
    }

    /**
     * Attempts an immediate online license synchronization with the remote licensing server.
     * Never revokes or invalidates a valid offline license when the network is unreachable.
     *
     * @param actorUsername Username or subsystem initiating the sync
     * @return Detailed {@link LicenseSyncResultDTO}
     */
    public LicenseSyncResultDTO syncNow(String actorUsername) {
        String syncUrl = licenseProperties.getSyncUrl();
        if (syncUrl == null || syncUrl.isBlank()) {
            LicenseStatusDTO current = licenseService.getLicenseStatus();
            return new LicenseSyncResultDTO(false, false, STATUS_OFFLINE, "No license sync URL configured", current);
        }

        try {
            URI uri = URI.create(syncUrl.trim());
            if (!"https".equalsIgnoreCase(uri.getScheme()) && !"http".equalsIgnoreCase(uri.getScheme())) {
                throw new BusinessException("Invalid license sync URL scheme");
            }

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("establishmentId", licenseService.resolveVenueEstablishmentId());
            payload.put("appVersion", appVersion);
            String existingToken = licenseService.getStoredToken();
            if (existingToken != null && !existingToken.isBlank()) {
                payload.put("currentToken", existingToken);
            }

            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofMillis(Math.max(1000, licenseProperties.getSyncTimeoutMs())))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return handleSyncHttpResponse(response, existingToken, actorUsername);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            licenseService.recordSyncAttempt(STATUS_OFFLINE, "Sync interrupted");
            return new LicenseSyncResultDTO(
                    false, false, STATUS_OFFLINE,
                    "Online license sync was interrupted",
                    licenseService.getLicenseStatus()
            );
        } catch (IOException ex) {
            log.debug("License sync offline (server unreachable): {}", ex.getMessage());
            licenseService.recordSyncAttempt(STATUS_OFFLINE, "Network unreachable: " + ex.getMessage());
            return new LicenseSyncResultDTO(
                    false, false, STATUS_OFFLINE,
                    "Internet or licensing server unreachable — continuing in offline mode",
                    licenseService.getLicenseStatus()
            );
        } catch (IllegalArgumentException | BusinessException ex) {
            licenseService.recordSyncAttempt(STATUS_FAILED, ex.getMessage());
            return new LicenseSyncResultDTO(
                    false, false, STATUS_FAILED,
                    ex.getMessage(),
                    licenseService.getLicenseStatus()
            );
        }
    }

    private LicenseSyncResultDTO handleSyncHttpResponse(
            HttpResponse<String> response,
            String existingToken,
            String actorUsername) {

        int statusCode = response.statusCode();
        if (statusCode == 204) {
            licenseService.recordSyncAttempt(STATUS_UP_TO_DATE, null);
            return new LicenseSyncResultDTO(
                    false, true, STATUS_UP_TO_DATE,
                    "License is already up to date",
                    licenseService.getLicenseStatus()
            );
        }

        if (statusCode < 200 || statusCode >= 300) {
            String errMsg = "Licensing server returned HTTP " + statusCode;
            licenseService.recordSyncAttempt(STATUS_FAILED, errMsg);
            return new LicenseSyncResultDTO(
                    false, true, STATUS_FAILED,
                    errMsg,
                    licenseService.getLicenseStatus()
            );
        }

        try {
            JsonNode root = objectMapper.readTree(response.body() != null ? response.body() : "{}");
            String returnedToken = root.path("licenseToken").asText("").trim();
            if (returnedToken.isEmpty()) {
                returnedToken = root.path("token").asText("").trim();
            }

            if (returnedToken.isEmpty() || returnedToken.equals(existingToken)) {
                licenseService.recordSyncAttempt(STATUS_UP_TO_DATE, null);
                return new LicenseSyncResultDTO(
                        false, true, STATUS_UP_TO_DATE,
                        "License verified with licensing server — no update required",
                        licenseService.getLicenseStatus()
                );
            }

            LicenseStatusDTO updated = licenseService.activateLicense(returnedToken, "ONLINE", actorUsername);
            return new LicenseSyncResultDTO(
                    true, true, STATUS_SUCCESS,
                    "License token synchronized and verified successfully",
                    updated
            );
        } catch (Exception ex) {
            String errMsg = "Rejected invalid sync payload: " + ex.getMessage();
            log.warn(errMsg);
            licenseService.recordSyncAttempt(STATUS_FAILED, errMsg);
            return new LicenseSyncResultDTO(
                    false, true, STATUS_FAILED,
                    errMsg,
                    licenseService.getLicenseStatus()
            );
        }
    }
}
